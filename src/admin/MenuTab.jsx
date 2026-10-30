// src/admin/MenuTab.jsx — Gestión y Publicación de Menús (Admin).
//
// Capa de Presentación: renderiza el calendario mensual, el formulario de platos
// (almuerzo, cena, feriado, hora límite) y la lista de envíos programados,
// delegando toda la lógica de estado y fechas al hook modular `useMenuCalendar`.

import {
  CalendarDays,
  Send,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { todayISO, formatFechaCorta } from '../utils/dates'
import { nombreDia, serviciosDelDia, esDomingo, esSabado } from '../utils/menuRules'
import { useMenuCalendar } from '../hooks/useMenuCalendar'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function MenuTab() {
  const {
    fecha,
    setFecha,
    cursor,
    prevMonth,
    nextMonth,
    calMonth,
    calISO,
    dayMenu,
    menus,
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
    pendientes,
    horaEnvio,
    setHoraEnvio,
    servicioEnvio,
    setServicioEnvio,
    agendando,
    setAgendando,
    scheduleSend,
    cancelSchedule,
  } = useMenuCalendar()

  const today = todayISO()
  const domingo = fecha && esDomingo(fecha)
  const sabado = fecha && esSabado(fecha)

  const horaLocal = (date) =>
    date instanceof Date
      ? new Date(date.getTime() - 4 * 3600 * 1000).toISOString().slice(11, 16)
      : String(date).slice(0, 5)

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* ── Columna Izquierda: Calendario mensual ── */}
      <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition text-stone-600"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-sm font-bold text-stone-800">
              {MESES[cursor.month]} {cursor.year}
            </h3>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition text-stone-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-[10px] font-semibold text-stone-400 pb-1">
                {d}
              </span>
            ))}
            {calMonth.map((day, i) => {
              if (day === null) return <span key={`empty-${i}`} />
              const iso = calISO(day)
              const mData = dayMenu(day)
              const isSelected = iso === fecha
              const isTodayDate = iso === today
              const di = esDomingo(iso)
              const sa = esSabado(iso)

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setFecha(iso)}
                  className={`relative flex flex-col items-center justify-center h-10 text-xs rounded-xl transition font-medium ${
                    di ? 'text-red-500' : sa ? 'text-amber-700' : 'text-stone-700'
                  } ${
                    isSelected
                      ? 'bg-amber-500 text-white font-bold shadow ring-2 ring-amber-300'
                      : isTodayDate
                      ? 'bg-amber-50 font-semibold border border-amber-200'
                      : mData
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  {day}
                  {mData && !isSelected && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-[11px] text-stone-400 mt-4 text-center">
          Puntos verdes indican días con minuta ya guardada.
        </p>
      </div>

      {/* ── Columna Derecha: Editor del día seleccionado ── */}
      <div>
        <div className="mb-3">
          <h2 className="text-lg font-bold text-stone-800">Menú del día</h2>
          <p className="text-sm text-stone-500">
            {nombreDia(fecha)} {formatFechaCorta(fecha)} — {serviciosDelDia(fecha)}
          </p>
        </div>

        <form onSubmit={saveMenu} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
          {/* Horario y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Cierre de votación</label>
              <input
                type="time"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="borrador">Borrador (interno)</option>
                <option value="publicado">Publicado</option>
              </select>
            </div>
          </div>

          {/* Platos Almuerzo */}
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1">
              Platos de Almuerzo (un plato por línea)
            </label>
            <textarea
              rows={3}
              value={platillos}
              onChange={(e) => setPlatillos(e.target.value)}
              placeholder="Sopa de maní&#10;Majadito tostado&#10;Refresco de tamarindo"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Platos Cena & Feriado */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-stone-600">
                Platos de Cena {domingo && '(Domingo sin cena)'} {sabado && '(Cena para llevar)'}
              </label>
            </div>
            <textarea
              rows={2}
              value={platillosCena}
              disabled={domingo}
              onChange={(e) => setPlatillosCena(e.target.value)}
              placeholder={domingo ? 'Los domingos no se sirve cena' : 'Arroz chaufa con presa de pollo'}
              className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                domingo ? 'bg-stone-50 text-stone-400 border-stone-200' : 'border-stone-300'
              }`}
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={feriado}
                onChange={(e) => setFeriado(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              Feriado institucional (almuerzo y cena juntos)
            </label>
          </div>

          {/* Botonera de Acciones */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition shadow"
            >
              <Save size={15} /> {busy ? 'Guardando…' : 'Guardar'}
            </button>

            <button
              type="button"
              onClick={() => publishMenu('almuerzo')}
              className="flex items-center gap-1.5 px-3 py-2 text-sky-700 hover:bg-sky-50 border border-sky-200 text-sm font-semibold rounded-lg transition"
            >
              <Send size={14} /> Enviar Almuerzo
            </button>

            <button
              type="button"
              onClick={() => publishMenu('cena')}
              disabled={domingo}
              className="flex items-center gap-1.5 px-3 py-2 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold rounded-lg transition"
            >
              <Send size={14} /> Enviar Cena
            </button>

            <button
              type="button"
              onClick={() => publishMenu('ambos')}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-700 hover:bg-stone-50 border border-stone-300 text-sm font-semibold rounded-lg transition"
            >
              <Send size={14} /> Enviar Ambos
            </button>

            <button
              type="button"
              onClick={() => setAgendando((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 border text-sm font-semibold rounded-lg transition ${
                agendando
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'text-stone-600 hover:bg-stone-50 border-stone-300'
              }`}
            >
              <Clock size={14} /> Programar
            </button>
          </div>

          {/* Panel de programación diferida */}
          {agendando && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2 mt-2">
              <p className="text-xs font-semibold text-stone-700">
                Programar publicación automática para el {formatFechaCorta(fecha)}:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={servicioEnvio}
                  onChange={(e) => setServicioEnvio(e.target.value)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
                >
                  <option value="ambos">Almuerzo y cena</option>
                  <option value="almuerzo">Solo almuerzo</option>
                  <option value="cena" disabled={domingo}>Solo cena</option>
                </select>
                <input
                  type="time"
                  value={horaEnvio}
                  onChange={(e) => setHoraEnvio(e.target.value)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={scheduleSend}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow transition"
                >
                  <Clock size={13} /> Agendar
                </button>
              </div>
              <p className="text-[11px] text-stone-500">
                El Cloudflare Worker revisará cada minuto los envíos agendados y los publicará en Telegram automáticamente.
              </p>
            </div>
          )}

          {/* Envíos programados pendientes */}
          {pendientes.length > 0 && (
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-bold text-stone-600 mb-2">Envíos pendientes de envío</p>
              <div className="space-y-1.5">
                {pendientes.slice(0, 5).map((envio) => (
                  <div
                    key={envio.id}
                    className="flex items-center justify-between bg-stone-50 border rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="text-stone-700 font-medium">
                      <b>{envio.fecha}</b> · {horaLocal(envio.enviarEn)} h
                      <span className="text-stone-400 ml-1">({envio.servicio})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelSchedule(envio.id)}
                      title="Cancelar envío programado"
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flash && (
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 size={14} /> {flash}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}