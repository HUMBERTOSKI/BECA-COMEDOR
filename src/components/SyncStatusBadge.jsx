import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

/**
 * Indicador compacto de conectividad / cola de sincronización.
 * - Verde: conectado y sin pendientes.
 * - Naranja: sin conexión (con conteo de pendientes).
 * - Azul (girando): sincronizando.
 * - Amarillo clicable: hay pendientes y se puede forzar la sincronización.
 */
export default function SyncStatusBadge({ status, onForceSync }) {
  const { isOnline, isSyncing, pendingCount } = status || {}

  if (isSyncing) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-100 bg-sky-600/90 px-2.5 py-1 rounded-full whitespace-nowrap">
        <RefreshCw size={12} className="animate-spin" /> Sincronizando {pendingCount}…
      </span>
    )
  }

  if (!isOnline) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-100 bg-amber-600/90 px-2.5 py-1 rounded-full whitespace-nowrap">
        <WifiOff size={12} />
        {pendingCount ? `Sin conexión · ${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Sin conexión'}
      </span>
    )
  }

  if (!pendingCount) {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-100 bg-emerald-600/90 px-2.5 py-1 rounded-full whitespace-nowrap">
        <Wifi size={12} /> Conectado
      </span>
    )
  }

  return (
    <button
      onClick={onForceSync}
      title="Sincronizar pendientes ahora"
      className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-950 bg-amber-400 px-2.5 py-1 rounded-full whitespace-nowrap hover:bg-amber-300"
    >
      <RefreshCw size={12} /> Sincronizar {pendingCount}
    </button>
  )
}