// src/admin/MetricsTab.jsx — Panel de Métricas ODS 12 (Admin).
//
// Capa de Presentación: visualiza tarjetas de indicadores (votos, raciones,
// precisión, kilos salvados) y la tabla de balance histórico de 10 días,
// delegando toda la agregación y cálculos en el hook modular `useMetricsHistory`.

import { BarChart3, Leaf, Target, Utensils, RotateCw } from 'lucide-react'
import { formatFechaLarga } from '../utils/dates'
import { useMetricsHistory } from '../hooks/useMetricsHistory'

export default function MetricsTab() {
  const {
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
    refetchHistory,
  } = useMetricsHistory()

  return (
    <div className="space-y-6">
      {/* Cabecera y selectores */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-amber-500" /> Métricas de bienestar (ODS 12)
          </h2>
          <p className="text-sm text-stone-500">
            Pronóstico en Telegram vs. raciones servidas en el comedor · Meta 12.3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500 font-semibold">KG/ración</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={config.kgPorRacion}
            onChange={(e) => setConfig({ ...config, kgPorRacion: Number(e.target.value) || 0 })}
            className="w-20 px-2 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
          />
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-stone-400 text-sm">Cargando métricas del día…</p>
      ) : (
        <>
          <p className="text-sm text-stone-500 font-medium">{formatFechaLarga(fecha)}</p>

          {/* Tarjetas de indicadores clave */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Utensils}
              label="Votos Sí"
              value={stats.votosSi}
              sub="comensales anticipados"
              tone="bg-sky-50 text-sky-700"
            />
            <StatCard
              icon={Utensils}
              label="Raciones servidas"
              value={stats.raciones}
              sub="almuerzos retirados"
              tone="bg-amber-50 text-amber-700"
            />
            <StatCard
              icon={Target}
              label="Precisión"
              value={`${stats.precision}%`}
              sub={`exceso: ${stats.exceso > 0 ? `+${stats.exceso}` : stats.exceso}`}
              tone="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              icon={Leaf}
              label="Comida salvada"
              value={`${stats.kilos} kg`}
              sub="con el pronóstico"
              tone="bg-green-50 text-green-700"
            />
          </div>

          {/* Resumen del servicio y recomendación para cocina */}
          <div className="bg-white rounded-xl border shadow-sm p-4 text-sm text-stone-600 space-y-1">
            <p>
              🍽️ Almuerzo: 🟢 <b>{stats.votosSi}</b> · 🔴 <b>{stats.votosNo}</b> — 🌙 Cena: 🟢 <b>{cena.si}</b> · 🔴 <b>{cena.no}</b>
            </p>
            <p>
              🍳 Recomendación de cocina: <b className="text-stone-800">{totalEstimado} raciones</b>
              {config.margenSeguridad > 0 && ` (incluye ${Math.round(config.margenSeguridad * 100)}% de margen)`}
              {' '}— porción de referencia {config.kgPorRacion} kg.
            </p>
          </div>

          {/* Tabla histórica de 10 días */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b font-bold text-sm text-stone-700 flex items-center justify-between">
              <span>Últimos 10 días · Acumulado {totalKilos.toFixed(1)} kg salvados del desperdicio</span>
              <button
                onClick={refetchHistory}
                disabled={loadingHistory}
                className="text-stone-400 hover:text-stone-600 transition p-1"
                title="Actualizar tabla histórica"
              >
                <RotateCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
                  <tr>
                    <th className="text-left px-4 py-2.5">Fecha</th>
                    <th className="text-center px-4 py-2.5">Sí Almuerzo</th>
                    <th className="text-center px-4 py-2.5">Sí Cena</th>
                    <th className="text-center px-4 py-2.5">Servidas</th>
                    <th className="text-center px-4 py-2.5">Precisión</th>
                    <th className="text-center px-4 py-2.5">Kg Salvados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loadingHistory && !history ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-stone-400">
                        Calculando histórico de los últimos 10 días…
                      </td>
                    </tr>
                  ) : (
                    history?.map((item) => (
                      <tr key={item.fecha} className="hover:bg-stone-50/80 transition">
                        <td className="px-4 py-2 font-medium text-stone-700">{item.fecha}</td>
                        <td className="text-center px-4 py-2 text-stone-600">{item.votosSi}</td>
                        <td className="text-center px-4 py-2 text-stone-600">{item.cenaSi}</td>
                        <td className="text-center px-4 py-2 text-stone-600">{item.raciones}</td>
                        <td className="text-center px-4 py-2 font-semibold text-emerald-600">
                          {item.precision}%
                        </td>
                        <td className="text-center px-4 py-2 text-stone-700 font-medium">
                          {item.kilos} kg
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${tone} mb-2`}>
        <Icon size={13} /> {label}
      </div>
      <div className="text-3xl font-black text-stone-800">{value}</div>
      <div className="text-xs text-stone-400 mt-1">{sub}</div>
    </div>
  )
}