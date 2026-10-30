// src/cocina/ForecastView.jsx — Vista de Pronóstico del día (Cocina).
//
// Capa de Presentación: renderiza las tarjetas de estimación, cuenta regresiva,
// conexión pronóstico-real y liberación de remanentes ODS 12 delegando toda la
// lógica de negocio en el hook modular `useForecast`.

import { useState } from 'react'
import { CalendarDays, Clock, Minus, CheckCircle2, TrendingUp, AlertCircle, Loader } from 'lucide-react'
import { formatFechaLarga } from '../utils/dates'
import { BLOQUEO_REENVIO_MS } from '../utils/remanentes'
import { useForecast } from '../hooks/useForecast'

export default function ForecastView() {
  const {
    fecha,
    menu,
    config,
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
    liberable,
    msReintento,
    ultimo,
    liberando,
    errorLiberacion,
    liberar,
  } = useForecast()

  const [confirmado, setConfirmado] = useState(null)

  async function onLiberarClick() {
    const resp = window.confirm(
      `¿Notificar al grupo de Telegram que quedaron ${remanentes} raciones remanentes (≈ ${kgRescatados} kg rescatados)?`
    )
    if (!resp) return

    try {
      await liberar('a')
      setConfirmado(`¡Remanentes notificados con éxito al grupo de estudiantes!`)
      setTimeout(() => setConfirmado(null), 4000)
    } catch (err) {
      alert(`No se pudo notificar al grupo: ${err.message}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Cabecera */}
      <div>
        <h1 className="text-lg font-bold text-stone-800">Pronóstico del día</h1>
        <p className="text-sm text-stone-500 flex items-center gap-1.5">
          <CalendarDays size={14} /> {formatFechaLarga(fecha)}
        </p>
      </div>

      {/* Menú de hoy y cuenta regresiva */}
      {menu && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-stone-800 flex items-center gap-2">
              <CalendarDays size={16} className="text-amber-500" /> Menú de hoy
            </h2>
            <span className="flex items-center gap-1 text-xs text-stone-500 font-medium">
              <Clock size={13} />
              {restantes > 0 ? `Cierra votación en ${restantes} min` : 'Votación cerrada'}
            </span>
          </div>
          <ul className="text-sm text-stone-600 list-disc list-inside mt-2 space-y-0.5">
            {(menu.platillos || []).length > 0
              ? menu.platillos.map((p, i) => <li key={i}>{p}</li>)
              : <li className="text-stone-400 italic list-none">Menú no registrado aún.</li>
            }
          </ul>
        </div>
      )}

      {/* Indicadores clave: Votos Sí, No y Raciones Servidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
          <div className="text-4xl font-black text-sky-700">{votosSi}</div>
          <div className="text-xs font-semibold text-sky-600 mt-1">Sí · Almorzarán</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <div className="text-4xl font-black text-red-600">{votosNo}</div>
          <div className="text-xs font-semibold text-red-500 mt-1">No asistirán</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="text-4xl font-black text-emerald-600">{raciones}</div>
          <div className="text-xs font-semibold text-emerald-600 mt-1">Servidas hoy</div>
        </div>
      </div>

      {/* Conexión Pronóstico -> Real */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-500" /> Conexión pronóstico → producción
        </h3>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${porcVotados}%` }}
          />
        </div>
        <p className="text-sm text-stone-600 mt-3">
          🍳 <b className="text-stone-800">Preparar ≈ {estimado} raciones</b>
          {margen > 0 && ` (${votosSi} votos Sí + ${Math.round(margen * 100)}% de margen de seguridad)`}.
        </p>
        <p className="text-xs text-stone-400 mt-1">🌙 Cena: {cenaSi} sí · {cenaNo} no</p>
      </div>

      {/* Módulo ODS 12: Raciones Remanentes */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Raciones remanentes (ODS 12 · Meta 12.3)
          </h3>
          {remanentes > 0 ? (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              {remanentes} raciones ≈ {kgRescatados} kg rescatados
            </span>
          ) : (
            <span className="text-xs text-stone-400">Sin excedente hoy</span>
          )}
        </div>

        <p className="text-sm text-stone-500">
          {remanentes > 0
            ? `Hay ${remanentes} raciones preparadas que no se retiraron. Puedes liberarlas para estudiantes que lleguen con su carné por orden de llegada.`
            : `No hay raciones sin servir: todo lo preparado fue consumido.`}
        </p>

        {confirmado && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-lg">
            ✓ {confirmado}
          </div>
        )}

        {errorLiberacion && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
            <AlertCircle size={14} /> {errorLiberacion}
          </div>
        )}

        {remanentes > 0 && (
          <button
            onClick={onLiberarClick}
            disabled={!liberable || liberando}
            className={`mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              liberable && !liberando
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            {liberando ? (
              <>
                <Loader size={16} className="animate-spin" /> Enviando a Telegram…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {liberable
                  ? 'Avisar al grupo de Telegram · Liberar remanentes'
                  : `Espera ${Math.ceil(msReintento / 60000)} min para reenviar`}
              </>
            )}
          </button>
        )}

        {ultimo > 0 && (
          <p className="text-xs text-stone-400 mt-2">
            🕐 Remanentes liberados a las {new Date(ultimo).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} — Bloqueo anti-spam activo por {BLOQUEO_REENVIO_MS / 60000} min.
          </p>
        )}
      </div>

      {/* Raciones servidas visuales */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Asistencia registrada en el mesón
          </h3>
          <span className="text-xs text-stone-500 font-semibold">{raciones} servidas</span>
        </div>
        {raciones === 0 ? (
          <p className="text-sm text-stone-400">Aún no se registró ningún almuerzo en el mesón hoy.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: Math.min(raciones, 60) }).map((_, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 grid place-items-center text-[10px] font-bold"
              >
                ✓
              </span>
            ))}
            {raciones > 60 && (
              <span className="text-xs text-stone-400 self-center font-medium">+{raciones - 60} más</span>
            )}
          </div>
        )}
        <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
          <Minus size={12} /> Desperdicio evitado (ODS 12):{' '}
          {((config.kgPorRacion || 0.5) * Math.max(0, votosSi - raciones)).toFixed(1)} kg salvados.
        </p>
      </div>
    </div>
  )
}
