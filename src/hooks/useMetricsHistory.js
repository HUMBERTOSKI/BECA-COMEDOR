// src/hooks/useMetricsHistory.js — Lógica de cálculo y consolidación de Métricas ODS 12.
//
// Capa de Control/Dominio: aísla la agregación histórica de 10 días (consultas
// combinadas de votos y asistencias), el cálculo de precisión del pronóstico y
// los kilos de alimento salvados, desacoplándola de la vista de presentación `MetricsTab`.

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getVotesForDate,
  getAttendanceForDate,
  watchConfig,
  watchVotesForDate,
} from '../services/firestoreService'
import { dailySummary } from '../utils/metrics'
import { todayISO, lastDays } from '../utils/dates'

export function useMetricsHistory(initialFecha = todayISO()) {
  const [fecha, setFecha] = useState(initialFecha)
  const [config, setConfig] = useState({ kgPorRacion: 0.5, margenSeguridad: 0 })
  const [votes, setVotes] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyRaw, setHistoryRaw] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Suscripción a la configuración global (kg/ración, margen)
  useEffect(() => watchConfig(setConfig), [])

  // Suscripción en tiempo real a los votos de la fecha seleccionada
  useEffect(() => watchVotesForDate(fecha, setVotes), [fecha])

  // Carga de asistencias de la fecha seleccionada
  useEffect(() => {
    let active = true
    setLoading(true)
    getAttendanceForDate(fecha)
      .then((a) => {
        if (active) {
          setAttendance(a || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [fecha])

  // Métricas del día seleccionado
  const votosAlmuerzo = useMemo(() => votes.filter((v) => (v.servicio || 'a') === 'a'), [votes])
  const votosCena = useMemo(() => votes.filter((v) => v.servicio === 'c'), [votes])

  const stats = useMemo(() => {
    const votosSi = votosAlmuerzo.filter((v) => v.respuesta === 'si').length
    const votosNo = votosAlmuerzo.filter((v) => v.respuesta === 'no').length
    return dailySummary({
      votosSi,
      votosNo,
      raciones: attendance.length,
      kgPorRacion: config.kgPorRacion || 0.5,
    })
  }, [votosAlmuerzo, attendance, config.kgPorRacion])

  const cena = useMemo(() => ({
    si: votosCena.filter((v) => v.respuesta === 'si').length,
    no: votosCena.filter((v) => v.respuesta === 'no').length,
  }), [votosCena])

  const totalEstimado = useMemo(() => {
    return Math.round(stats.votosSi * (1 + (config.margenSeguridad || 0)))
  }, [stats.votosSi, config.margenSeguridad])

  // Carga histórica de los últimos 10 días
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    const days = lastDays(10)
    try {
      const results = await Promise.all(
        days.map(async (d) => {
          const [v, a] = await Promise.all([
            getVotesForDate(d).catch(() => []),
            getAttendanceForDate(d).catch(() => []),
          ])
          const si = v.filter((x) => (x.servicio || 'a') === 'a' && x.respuesta === 'si').length
          const no = v.filter((x) => (x.servicio || 'a') === 'a' && x.respuesta === 'no').length
          const cenaSi = v.filter((x) => x.servicio === 'c' && x.respuesta === 'si').length
          return {
            fecha: d,
            votosSi: si,
            votosNo: no,
            cenaSi,
            raciones: a.length,
          }
        })
      )
      setHistoryRaw(results)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Recalcula el acumulado con el factor de kg/ración actual sin re-consultar la base de datos
  const history = useMemo(() => {
    if (!historyRaw) return null
    return historyRaw.map((item) => {
      const metrics = dailySummary({ ...item, kgPorRacion: config.kgPorRacion || 0.5 })
      return {
        ...item,
        precision: metrics.precision,
        kilos: metrics.kilos,
      }
    })
  }, [historyRaw, config.kgPorRacion])

  const totalKilos = useMemo(() => {
    if (!history) return 0
    return history.reduce((acc, h) => acc + h.kilos, 0)
  }, [history])

  return {
    fecha,
    setFecha,
    config,
    setConfig,
    loading,
    loadingHistory,
    stats,
    cena,
    totalEstimado,
    history,
    totalKilos,
    refetchHistory: fetchHistory,
  }
}
