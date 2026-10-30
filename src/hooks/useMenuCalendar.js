// src/hooks/useMenuCalendar.js — Lógica de calendario, edición y programación de menús.
//
// Capa de Control/Dominio: aísla la generación matricial del calendario mensual,
// la carga y guardado de minutas del día (almuerzo/cena/feriados), la publicación
// inmediata vía Telegram y la programación diferida en cola (`envios`), dejando al
// componente visual `MenuTab` limpio y libre de lógica pesada.

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getMenu,
  setMenu,
  watchMenus,
  watchEnvios,
  agendarEnvio,
  cancelarEnvio,
} from '../services/firestoreService'
import { publicarMenuPara } from '../services/workerClient'
import { todayISO, nowInBolivia, formatFechaCorta } from '../utils/dates'

export function useMenuCalendar() {
  const [menus, setMenus] = useState([])
  const [fecha, setFecha] = useState(todayISO())
  const [cursor, setCursor] = useState(() => {
    const d = nowInBolivia()
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() }
  })

  // Estado del formulario del menú seleccionado
  const [horas, setHoras] = useState('10:30')
  const [estado, setEstado] = useState('borrador')
  const [platillos, setPlatillos] = useState('')
  const [platillosCena, setPlatillosCena] = useState('')
  const [feriado, setFeriado] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)

  // Envíos diferidos y programación
  const [envios, setEnvios] = useState([])
  const [horaEnvio, setHoraEnvio] = useState('08:00')
  const [servicioEnvio, setServicioEnvio] = useState('ambos')
  const [agendando, setAgendando] = useState(false)

  // Suscripciones en tiempo real
  useEffect(() => watchMenus(setMenus, 60), [])
  useEffect(() => watchEnvios(setEnvios), [])

  const menuMap = useMemo(() => new Map(menus.map((m) => [m.fecha, m])), [menus])

  // Carga los datos del menú cuando cambia la fecha seleccionada
  const loadMenu = useCallback(async (f) => {
    if (!f) return
    const m = await getMenu(f)
    setHoras(m?.horaLimite ?? '10:30')
    setEstado(m?.estado ?? 'borrador')
    setPlatillos((m?.platillos || []).join('\n'))
    setPlatillosCena((m?.platillosCena || []).join('\n'))
    setFeriado(!!m?.feriado)
  }, [])

  useEffect(() => {
    if (!fecha) return
    loadMenu(fecha)
    const [y, m] = fecha.split('-').map(Number)
    setCursor({ year: y, month: m - 1 })
  }, [fecha, loadMenu])

  // Navegación mensual
  const prevMonth = useCallback(() => {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))
  }, [])

  const nextMonth = useCallback(() => {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))
  }, [])

  // Matriz de días del mes para la cuadrícula del calendario
  const calMonth = useMemo(() => {
    const offset = (new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate()
    return new Array(offset).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))
  }, [cursor.year, cursor.month])

  const calISO = useCallback((day) => {
    return new Date(Date.UTC(cursor.year, cursor.month, day)).toISOString().slice(0, 10)
  }, [cursor.year, cursor.month])

  const dayMenu = useCallback((day) => {
    return menuMap.get(calISO(day))
  }, [menuMap, calISO])

  // Guardar cambios del menú en Firestore
  const saveMenu = useCallback(async (e) => {
    if (e) e.preventDefault()
    setBusy(true)
    try {
      await setMenu(fecha, {
        platillos: platillos.split('\n').map((x) => x.trim()).filter(Boolean),
        platillosCena: platillosCena.split('\n').map((x) => x.trim()).filter(Boolean),
        feriado,
        horaLimite: horas,
        estado,
      })
      setFlash('Menú guardado exitosamente.')
      setTimeout(() => setFlash(null), 2500)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }, [fecha, platillos, platillosCena, feriado, horas, estado])

  // Publicación manual inmediata al grupo de Telegram
  const publishMenu = useCallback(async (servicio) => {
    try {
      const res = await publicarMenuPara(fecha, servicio)
      if (res.published) {
        setFlash(`Encuesta enviada al grupo (${res.mensajes || 1} mensaje).`)
      } else if (res.reason === 'sin_cena') {
        setFlash('Este día no tiene servicio de cena (domingo).')
      } else {
        setFlash(`No hay menú guardado para el ${formatFechaCorta(fecha)}.`)
      }
      setTimeout(() => setFlash(null), 3000)
    } catch (err) {
      setFlash(`No se pudo publicar: ${err.message}`)
    }
  }, [fecha])

  // Conversión de hora local Bolivia a instante UTC
  const boliviaTimestamp = useCallback((iso, hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    const [y, mo, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, mo - 1, d, h + 4, m, 0))
  }, [])

  // Programar envío diferido
  const scheduleSend = useCallback(async () => {
    const dt = boliviaTimestamp(fecha, horaEnvio)
    if (dt.getTime() <= Date.now()) {
      setFlash('La hora elegida ya pasó. Elige una hora futura.')
      return
    }
    try {
      await agendarEnvio(fecha, dt, servicioEnvio)
      setFlash(`Programado para el ${formatFechaCorta(fecha)} a las ${horaEnvio}.`)
      setAgendando(false)
      setTimeout(() => setFlash(null), 3000)
    } catch (err) {
      setFlash(`No se pudo programar: ${err.message}`)
    }
  }, [boliviaTimestamp, fecha, horaEnvio, servicioEnvio])

  // Cancelar envío diferido
  const cancelSchedule = useCallback(async (id) => {
    try {
      await cancelarEnvio(id)
    } catch (err) {
      setFlash(`No se pudo cancelar: ${err.message}`)
    }
  }, [])

  const pendientes = useMemo(
    () => envios.filter((e) => e.estado !== 'enviado').sort((a, b) => new Date(a.enviarEn) - new Date(b.enviarEn)),
    [envios],
  )

  return {
    fecha,
    setFecha,
    cursor,
    prevMonth,
    nextMonth,
    calMonth,
    calISO,
    dayMenu,
    menus,
    // Formulario
    horas,
    setHoras,
    estado,
    setEstado,
    platillos,
    setPlatillos,
    platillosCena,
    setPlatillosCena,
    feriado,
    setFeriado,
    busy,
    flash,
    saveMenu,
    publishMenu,
    // Programación
    envios,
    pendientes,
    horaEnvio,
    setHoraEnvio,
    servicioEnvio,
    setServicioEnvio,
    agendando,
    setAgendando,
    scheduleSend,
    cancelSchedule,
  }
}
