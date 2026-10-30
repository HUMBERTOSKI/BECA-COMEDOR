// src/hooks/useForecast.js — Lógica de negocio y estado para el Pronóstico de Cocina.
//
// Capa de Control/Dominio: aísla los cálculos de comensales, márgenes de seguridad,
// cuenta regresiva a hora límite y la coordinación de liberación de remanentes (ODS 12),
// dejando a la vista (ForecastView) únicamente la responsabilidad de presentación visual.

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getMenu,
  watchVotesForDate,
  watchAttendanceForDate,
  watchConfig,
} from '../services/firestoreService'
import { todayISO, minutesUntil } from '../utils/dates'
import {
  remanentesEstimados,
  kgRescatadosRemanentes,
  puedeLiberarRemanentes,
  msParaReintentoRemanentes,
  registrarLiberacionRemanentes,
  ultimaLiberacionRemanentes,
} from '../utils/remanentes'
import { liberarRemanentes as apiLiberarRemanentes } from '../services/workerClient'

export function useForecast(fecha = todayISO()) {
  const [menu, setMenu] = useState(null)
  const [votes, setVotes] = useState([])
  const [attendance, setAttendance] = useState([])
  const [config, setConfig] = useState({ kgPorRacion: 0.5, horaFin: '15:30', margen: 0 })
  const [tick, setTick] = useState(0)
  const [liberando, setLiberando] = useState(false)
  const [errorLiberacion, setErrorLiberacion] = useState(null)

  // Suscripciones a datos en tiempo real (Polling REST sobre Firestore)
  useEffect(() => {
    let active = true
    getMenu(fecha).then((m) => {
      if (active) setMenu(m)
    })
    return () => { active = false }
  }, [fecha])

  useEffect(() => watchVotesForDate(fecha, setVotes), [fecha])
  useEffect(() => watchAttendanceForDate(fecha, setAttendance), [fecha])
  useEffect(() => watchConfig(setConfig), [])

  // Cálculos puros de votación y demanda
  const stats = useMemo(() => {
    const votosAlmuerzo = votes.filter((v) => (v.servicio || 'a') === 'a')
    const votosCena = votes.filter((v) => v.servicio === 'c')

    const votosSi = votosAlmuerzo.filter((v) => v.respuesta === 'si').length
    const votosNo = votosAlmuerzo.filter((v) => v.respuesta === 'no').length
    const cenaSi = votosCena.filter((v) => v.respuesta === 'si').length
    const cenaNo = votosCena.filter((v) => v.respuesta === 'no').length
    const raciones = attendance.length

    const margen = config.margen || 0
    const estimado = Math.round(votosSi * (1 + margen))
    const totalVotados = votosSi + votosNo
    const porcVotados = totalVotados > 0 ? Math.round((votosSi / totalVotados) * 100) : 0
    const restantes = menu ? minutesUntil(menu.horaLimite || '10:30') : 0

    // Remanentes ODS 12 (si el pronóstico superó lo realmente servido)
    const remanentes = remanentesEstimados(votosSi, raciones)
    const kgRescatados = kgRescatadosRemanentes(remanentes, config.kgPorRacion)

    return {
      votosSi,
      votosNo,
      cenaSi,
      cenaNo,
      raciones,
      margen,
      estimado,
      porcVotados,
      restantes,
      remanentes,
      kgRescatados,
    }
  }, [votes, attendance, config, menu])

  // Estado del bloqueo anti-reenvío de 10 minutos (persistencia local)
  const liberable = puedeLiberarRemanentes(fecha)
  const msReintento = msParaReintentoRemanentes(fecha)
  const ultimo = ultimaLiberacionRemanentes(fecha)

  // Temporizador para rehabilitar el botón cuando venza el bloqueo anti-spam
  useEffect(() => {
    if (liberable || msReintento <= 0) return
    const t = setTimeout(() => {
      setTick((prev) => prev + 1)
    }, msReintento + 100)
    return () => clearTimeout(t)
  }, [liberable, msReintento])

  // Acción coordinada de liberación: Worker (Telegram) + Firestore + Local Lock
  const liberar = useCallback(async (servicio = 'a') => {
    if (!liberable || stats.remanentes <= 0) return { ok: false, error: 'no_liberable' }

    setLiberando(true)
    setErrorLiberacion(null)
    try {
      const res = await apiLiberarRemanentes({
        fecha,
        servicio,
        votosSi: stats.votosSi,
        raciones: stats.raciones,
        horaFin: config.horaFin || '15:30',
        kgPorRacion: config.kgPorRacion || 0.5,
      })

      // Marca el timestamp de liberación local para prevenir reenvíos accidentales
      registrarLiberacionRemanentes(fecha)
      setTick((prev) => prev + 1)
      return res
    } catch (err) {
      setErrorLiberacion(err.message || 'Error al liberar remanentes')
      throw err
    } finally {
      setLiberando(false)
    }
  }, [fecha, liberable, stats.remanentes, stats.votosSi, stats.raciones, config])

  return {
    fecha,
    menu,
    config,
    ...stats,
    liberable,
    msReintento,
    ultimo,
    liberando,
    errorLiberacion,
    liberar,
    // Permite refrescar manualmente
    tick,
  }
}
