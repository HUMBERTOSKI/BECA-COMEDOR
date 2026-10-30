// src/hooks/useScanner.js — Hook modular para escaneo QR y validación Offline-First.
//
// Capa de Control/Dominio de hardware y conectividad:
// Unifica el ciclo de vida de la cámara (Html5Qrcode), la selección de cámara
// (frontal/trasera), la retroalimentación sonora (Web Audio), el control de concurrencia
// (anti-escaneo duplicado mientras muestra el resultado) y la validación en dos tiempos:
//   1. Tiempo online: Worker Cloudflare (/validate) con timeout de seguridad (6s).
//   2. Tiempo offline: Validación local (<50 ms contra localStorage) y cola de sincronización.

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { decodeQr } from '../utils/qr'
import { todayISO } from '../utils/dates'
import { validateScan } from '../services/workerClient'
import { playOk, playFail } from '../services/audio'
import { pickCameraDevice } from '../utils/camera'
import { getStudents, getAttendanceForDate } from '../services/firestoreService'
import {
  initOfflineCache,
  validateLocally,
  syncPendingQueue,
  subscribeSyncStatus,
  setSyncClient,
} from '../services/offlineSyncService'

const NET_TIMEOUT_MS = 6000

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TypeError('timeout')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

export function useScanner({
  elementId,
  holdMs = 2800,
  initialFacingMode = 'back', // 'back' | 'front'
  qrBoxSize = 240,
}) {
  const scannerRef = useRef(null)
  const busyRef = useRef(false)
  const startingRef = useRef(false)
  const timerRef = useRef(null)
  const camerasRef = useRef([])
  const facingModeRef = useRef(initialFacingMode)

  const [status, setStatus] = useState('starting') // 'starting' | 'scanning' | 'ok' | 'fail' | 'error'
  const [student, setStudent] = useState(null)
  const [failReason, setFailReason] = useState('')
  const [camError, setCamError] = useState(null)
  const [offline, setOffline] = useState(false)
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, isSyncing: false, pendingCount: 0 })
  const [facingMode, setFacingMode] = useState(initialFacingMode)

  // Detiene y libera la cámara de manera segura
  const disposeScanner = useCallback(() => {
    const s = scannerRef.current
    if (!s) return
    scannerRef.current = null
    try { s.stop() } catch { /* no estaba activo */ }
    try { s.clear() } catch { /* no disponible */ }
  }, [])

  // Procesa el resultado visual y auditivo
  const showResult = useCallback((state, sData, reason = '', isOff = false) => {
    clearTimeout(timerRef.current)
    setStatus(state)
    setStudent(sData)
    setFailReason(reason)
    setOffline(isOff)

    if (state === 'ok') playOk()
    else playFail()

    timerRef.current = setTimeout(() => {
      setStatus('scanning')
      setStudent(null)
      setFailReason('')
      setOffline(false)
      busyRef.current = false
    }, holdMs)
  }, [holdMs])

  // Aplica el resultado local de offlineSyncService
  const applyLocalResult = useCallback((localRes) => {
    if (localRes.status === 'ok') {
      showResult('ok', localRes.student, '', true)
    } else if (localRes.status === 'ya_comio') {
      showResult('fail', localRes.student || null, 'ya_comio', true)
    } else if (localRes.status === 'inactivo') {
      showResult('fail', null, 'inactivo', true)
    } else {
      showResult('fail', null, 'no_registrado', true)
    }
  }, [showResult])

  // Valida el código QR escaneado (Online con fallback transparente a Offline)
  const processCode = useCallback(async (code) => {
    if (busyRef.current) return
    const studentId = decodeQr(code)
    if (!studentId) {
      showResult('fail', null, 'qr_invalido')
      return
    }

    busyRef.current = true
    setStudent(null)
    setOffline(false)

    // Si el navegador ya detectó desconexión, saltar directo al motor local
    if (!navigator.onLine) {
      applyLocalResult(validateLocally(code, todayISO()))
      return
    }

    try {
      const res = await withTimeout(validateScan(code), NET_TIMEOUT_MS)
      if (res.ok) {
        showResult('ok', res.student, '', false)
      } else {
        showResult('fail', null, res.reason || 'invalido', false)
      }
    } catch {
      // Corte o caída de red durante la petición -> validación local inmediata
      applyLocalResult(validateLocally(code, todayISO()))
    }
  }, [applyLocalResult, showResult])

  // Inicializa la cámara física con el dispositivo configurado
  const startCamera = useCallback(async (mode) => {
    if (startingRef.current) return
    startingRef.current = true
    clearTimeout(timerRef.current)
    setCamError(null)
    setStudent(null)
    setStatus('starting')

    try {
      disposeScanner()
      const scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      const deviceOrConstraint = pickCameraDevice(camerasRef.current, mode)
      await scanner.start(
        deviceOrConstraint,
        { fps: 10, qrbox: { width: qrBoxSize, height: qrBoxSize } },
        (decodedText) => processCode(decodedText),
        () => {},
      )

      facingModeRef.current = mode
      setFacingMode(mode)
      setStatus('scanning')
    } catch (err) {
      setCamError('No se pudo acceder a la cámara. Verifica los permisos de video.')
      setStatus('error')
    } finally {
      startingRef.current = false
    }
  }, [disposeScanner, elementId, processCode, qrBoxSize])

  // Cambiar entre cámara frontal y trasera
  const toggleCamera = useCallback(async () => {
    const nextMode = facingModeRef.current === 'back' ? 'front' : 'back'
    await startCamera(nextMode)
  }, [startCamera])

  // Actualiza el caché local con la lista completa de estudiantes y asistencias
  const refreshCache = useCallback(async () => {
    if (!navigator.onLine) return
    const date = todayISO()
    try {
      const [students, attendances] = await Promise.all([
        getStudents(),
        getAttendanceForDate(date),
      ])
      initOfflineCache({ date, students, attendances })
    } catch {
      // Si falla, el caché previo en localStorage se mantiene
    }
  }, [])

  // Inicialización al montar
  useEffect(() => {
    let active = true

    // Enumera cámaras físicas si el navegador lo permite
    Html5Qrcode.getCameras()
      .then((cams) => {
        if (active) camerasRef.current = cams || []
      })
      .catch(() => {})
      .finally(() => {
        if (active) startCamera(facingModeRef.current)
      })

    // Conecta el cliente de sincronización offline con el endpoint del worker
    setSyncClient({ validate: validateScan })

    const unsubSync = subscribeSyncStatus((s) => {
      setSyncStatus(s)
      if (s.isOnline) refreshCache()
    })

    refreshCache()

    return () => {
      active = false
      clearTimeout(timerRef.current)
      disposeScanner()
      unsubSync()
    }
  }, [disposeScanner, refreshCache, startCamera])

  // Validación manual (escritura de código en input)
  const validateManual = useCallback(async (code) => {
    const clean = (code || '').trim()
    if (!clean || busyRef.current) return
    await processCode(clean)
  }, [processCode])

  // Forzar sincronización manual de la cola
  const forceSync = useCallback(() => {
    syncPendingQueue()
  }, [])

  return {
    status,
    student,
    failReason,
    camError,
    offline,
    syncStatus,
    facingMode,
    startCamera: () => startCamera(facingModeRef.current),
    toggleCamera,
    validateManual,
    forceSync,
    refreshCache,
  }
}
