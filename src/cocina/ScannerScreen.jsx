// src/cocina/ScannerScreen.jsx — Pantalla de Escaneo del Mesón de Cocina.
//
// Capa de Presentación: renderiza la interfaz visual del escáner en cocina,
// tarjetas de confirmación con foto y panel de bloqueo de acceso, delegando
// todo el hardware de cámara y la resiliencia offline al hook modular `useScanner`.

import { useState } from 'react'
import { ScanLine, AlertCircle, CheckCircle2, LogOut, Loader, Keyboard } from 'lucide-react'
import { logout } from '../services/authService'
import SyncStatusBadge from '../components/SyncStatusBadge'
import { useScanner } from '../hooks/useScanner'

const SCANNER_ID = 'qr-reader'

const FAIL_MESSAGES = {
  ya_comio: 'Estudiante ya retiró su almuerzo hoy',
  inactivo: 'Credencial desactivada',
  no_registrado: 'Estudiante no registrado',
  qr_invalido: 'QR no válido',
  error: 'Error de conexión. Reintenta',
  invalido: 'Credencial inválida',
}

export default function ScannerScreen() {
  const [manualCode, setManualCode] = useState('')

  const {
    status,
    student,
    failReason,
    camError,
    offline,
    syncStatus,
    startCamera,
    validateManual,
    forceSync,
  } = useScanner({
    elementId: SCANNER_ID,
    holdMs: 3200,
    initialFacingMode: 'back',
    qrBoxSize: 250,
  })

  async function handleManualSubmit() {
    if (!manualCode.trim()) return
    await validateManual(manualCode)
    setManualCode('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Barra superior de estado */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-stone-800">
          <ScanLine size={18} className="text-amber-500" />
          <span>Mesón de Cocina</span>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatusBadge status={syncStatus} onForceSync={forceSync} />
          <button
            onClick={logout}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-red-600 transition"
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>

      {/* Contenido principal del escáner */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Estado de error de cámara */}
        {status === 'error' && (
          <div className="text-center max-w-sm bg-white p-6 rounded-2xl shadow border">
            <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
            <p className="text-stone-700 font-semibold">{camError || 'Error al acceder a la cámara'}</p>
            <button
              onClick={startCamera}
              className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition shadow"
            >
              Reintentar cámara
            </button>
          </div>
        )}

        {/* Estado iniciando cámara */}
        {status === 'starting' && (
          <div className="text-center max-w-sm">
            <Loader className="animate-spin text-amber-500 mx-auto mb-3" size={40} />
            <p className="text-stone-600 font-semibold">Iniciando cámara del mesón…</p>
          </div>
        )}

        {/* Estado escaneando activamente */}
        {status === 'scanning' && (
          <>
            <div className="relative w-full max-w-sm">
              <div id={SCANNER_ID} className="w-full overflow-hidden rounded-2xl shadow-lg bg-black" />
              <div
                className="scan-line absolute inset-x-2 h-0.5 bg-amber-500 animate-pulse pointer-events-none"
                style={{ top: '45%', boxShadow: '0 0 12px 2px rgba(245,158,11,.7)' }}
              />
            </div>
            <p className="text-sm text-stone-500 text-center">
              Acerca el carnet con el código QR a la cámara.
              <br />
              <span className="text-xs text-stone-400">Verifica la foto del beneficiario en pantalla.</span>
            </p>
          </>
        )}

        {/* Estado: Acceso AUTORIZADO (Overlay verde con datos completos) */}
        {status === 'ok' && student && (
          <AuthorizedOverlay student={student} offline={offline} />
        )}

        {/* Estado: Acceso DENEGADO / BLOQUEADO (Overlay rojo) */}
        {status === 'fail' && (
          <div className="fixed inset-0 bg-red-600 z-50 grid place-items-center p-8 text-center animate-in fade-in duration-150">
            <div>
              <AlertCircle size={72} className="mx-auto text-red-200 mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2 tracking-wide">ACCESO BLOQUEADO</h2>
              <p className="text-xl font-semibold text-red-100 max-w-md mx-auto">
                {FAIL_MESSAGES[failReason] || 'Credencial no autorizada'}
              </p>
            </div>
          </div>
        )}

        {/* Fallback manual de código */}
        <div className="w-full max-w-sm bg-white border rounded-xl p-3 shadow-sm">
          <label className="text-xs font-bold text-stone-500 mb-1.5 flex items-center gap-1.5">
            <Keyboard size={13} /> Ingreso manual de código (si falla la cámara)
          </label>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              placeholder="Ej.: BECA1:xxxxxxxx"
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={handleManualSubmit}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-sm font-semibold transition"
            >
              Validar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthorizedOverlay({ student, offline }) {
  const badgeText = offline ? 'Registrado · Sin conexión' : 'Registrado online'
  const horaActual = new Date().toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return (
    <div className="fixed inset-0 bg-emerald-500 z-50 grid place-items-center p-8 text-center animate-in fade-in duration-150">
      <div className="text-center max-w-md w-full">
        <CheckCircle2 size={64} className="mx-auto text-white/90 mb-3" />
        <h1 className="text-2xl font-black text-white mb-1 tracking-wide">ALMUERZO AUTORIZADO</h1>

        {student.foto ? (
          <img
            src={student.foto}
            alt={student.nombre}
            className="w-32 h-40 object-cover rounded-2xl border-4 border-white/80 mx-auto my-4 shadow-xl"
          />
        ) : (
          <div className="w-32 h-40 rounded-2xl bg-white/20 grid place-items-center text-5xl my-4 mx-auto text-white/80 shadow-xl">
            👤
          </div>
        )}

        <div className="text-3xl font-black text-white leading-tight">{student.nombre}</div>
        <div className="text-xl text-white/95 mt-1 font-semibold">RU: {student.ru || '—'}</div>
        <div className="text-sm text-white/80 mt-0.5">{student.carrera || ''}</div>

        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
          <CheckCircle2 size={14} /> {badgeText} · {horaActual}
        </div>
      </div>
    </div>
  )
}