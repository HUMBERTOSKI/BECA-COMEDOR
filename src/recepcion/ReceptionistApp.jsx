// src/recepcion/ReceptionistApp.jsx — Módulo de Entrada y Recepción.
//
// Capa de Presentación: interfaz optimizada de alto contraste para el punto de
// acceso inicial (fondo oscuro, cambio rápido de cámara frontal/trasera, validación
// continua y confirmación visual inmediata) delegando la lógica al hook `useScanner`.

import { useState } from 'react'
import { ScanLine, LogOut, RefreshCw, AlertCircle, CheckCircle2, Loader, Keyboard } from 'lucide-react'
import { logout } from '../services/authService'
import SyncStatusBadge from '../components/SyncStatusBadge'
import { useScanner } from '../hooks/useScanner'

const SCANNER_ID = 'qr-reader-recepcion'

const FAIL_MESSAGES = {
  ya_comio: 'Estudiante ya retiró su almuerzo hoy',
  inactivo: 'Credencial desactivada',
  no_registrado: 'Estudiante no registrado',
  qr_invalido: 'QR no válido',
  error: 'Error de conexión. Reintenta',
  invalido: 'Credencial inválida',
}

export default function ReceptionistApp() {
  const [manualCode, setManualCode] = useState('')

  const {
    status,
    student,
    failReason,
    camError,
    offline,
    syncStatus,
    facingMode,
    startCamera,
    toggleCamera,
    validateManual,
    forceSync,
  } = useScanner({
    elementId: SCANNER_ID,
    holdMs: 2500,
    initialFacingMode: 'back',
    qrBoxSize: 230,
  })

  async function handleManualSubmit() {
    if (!manualCode.trim()) return
    await validateManual(manualCode)
    setManualCode('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100">
      {/* Barra superior de control */}
      <header className="px-4 py-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2 font-bold text-sm text-stone-100">
          <ScanLine size={18} className="text-amber-400" />
          <span>Recepción · Beca Comedor UABJB</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusBadge status={syncStatus} onForceSync={forceSync} />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-red-400 transition"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      {/* Visor central del escáner */}
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        {/* Error de cámara */}
        {status === 'error' && (
          <div className="text-center max-w-sm bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl">
            <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
            <p className="text-stone-300 font-semibold">{camError || 'No se pudo acceder a la cámara'}</p>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={startCamera}
                className="w-full px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg font-bold text-sm transition"
              >
                Reintentar
              </button>
              <button
                onClick={toggleCamera}
                className="w-full px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-semibold text-sm transition"
              >
                <RefreshCw size={14} className="inline mr-1" /> Probar otra cámara
              </button>
            </div>
          </div>
        )}

        {/* Iniciando cámara */}
        {status === 'starting' && (
          <div className="text-center max-w-sm">
            <Loader size={36} className="animate-spin text-amber-400 mx-auto mb-3" />
            <p className="text-stone-400 text-sm font-medium">Iniciando cámara de recepción…</p>
          </div>
        )}

        {/* Visor con overlay de cámara */}
        <div className="relative w-full max-w-sm">
          <div id={SCANNER_ID} className="w-full overflow-hidden rounded-2xl shadow-2xl bg-black border border-stone-800" />

          {/* Indicador de lectura activa */}
          {status === 'scanning' && (
            <>
              <div
                className="scan-line absolute inset-x-2 h-0.5 bg-amber-400 animate-pulse pointer-events-none"
                style={{ top: '45%', boxShadow: '0 0 12px 2px rgba(251,191,36,.7)' }}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm border border-amber-500/30">
                <ScanLine size={12} className="animate-spin" /> Leyendo carnet…
              </div>
            </>
          )}

          {/* Overlay de AUTORIZADO sobre la tarjeta */}
          {status === 'ok' && student && (
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/95 flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in duration-150 backdrop-blur-sm z-30">
              <CheckCircle2 size={44} className="mb-2 text-white" />
              {student.foto ? (
                <img
                  src={student.foto}
                  alt={student.nombre}
                  className="w-20 h-24 object-cover rounded-xl border-2 border-white/80 shadow-md my-1"
                />
              ) : (
                <div className="w-20 h-24 rounded-xl bg-white/20 grid place-items-center text-4xl my-1 shadow-md">
                  👤
                </div>
              )}
              <div className="text-2xl font-black leading-tight mt-1">{student.nombre}</div>
              <div className="text-base font-semibold text-emerald-50 mt-0.5">CI: {student.ci || '—'} · RU: {student.ru || '—'}</div>
              <div className="text-xs text-emerald-100">{student.carrera || ''}</div>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-black/25 text-xs font-semibold px-3 py-1 rounded-full">
                ✦ {offline ? 'Registrado · Sin conexión' : 'Registrado'} · {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          )}

          {/* Overlay de BLOQUEADO sobre la tarjeta */}
          {status === 'fail' && (
            <div className="absolute inset-0 rounded-2xl bg-red-600/95 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-150 backdrop-blur-sm z-30">
              <AlertCircle size={48} className="mb-2 text-red-200 animate-bounce" />
              <div className="text-2xl font-black tracking-wide">ACCESO BLOQUEADO</div>
              <p className="text-base font-semibold text-red-100 mt-2">
                {FAIL_MESSAGES[failReason] || 'Credencial inválida'}
              </p>
            </div>
          )}
        </div>

        {/* Selector de cámara */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCamera}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 px-4 py-2 rounded-full text-xs font-semibold shadow transition"
          >
            <RefreshCw size={13} /> Cámara {facingMode === 'front' ? 'Frontal' : 'Trasera'} (Cambiar)
          </button>
        </div>

        {/* Input manual */}
        <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-xl p-3 shadow-lg">
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1.5">
            <Keyboard size={13} /> Fallback manual (código de carnet)
          </label>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="BECA1:xxxxxxxx"
              className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 text-stone-100 rounded-lg text-sm outline-none focus:border-amber-400"
            />
            <button
              onClick={handleManualSubmit}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-sm font-bold transition"
            >
              Validar
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}