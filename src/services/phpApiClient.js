/**
 * Cliente HTTP para interactuar con el Backend REST POO en PHP.
 * Permite alternar o consumir directamente las operaciones orientadas a objetos.
 */

const PHP_API_BASE = import.meta.env?.VITE_PHP_API_URL || 'http://localhost:8000';

export async function validarAccesoPhp(qrPayload, fecha = null, metodo = 'qr') {
  const res = await fetch(`${PHP_API_BASE}/api/validar-acceso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrPayload, fecha, metodo }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.mensaje || data.error || 'Acceso denegado');
  }
  return data;
}

export async function obtenerEstimacionPhp(fecha = null, servicio = 'a', kgPorRacion = 0.5, margenSeguridad = 0.05) {
  const params = new URLSearchParams();
  if (fecha) params.set('fecha', fecha);
  params.set('servicio', servicio);
  params.set('kgPorRacion', String(kgPorRacion));
  params.set('margenSeguridad', String(margenSeguridad));

  const res = await fetch(`${PHP_API_BASE}/api/estimacion-cocina?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al obtener estimación');
  }
  return data.datos;
}

export async function liberarRemanentesPhp(fecha = null, servicio = 'a', kgPorRacion = 0.5, horaFin = '14:00', cooldownMinutos = 10) {
  const res = await fetch(`${PHP_API_BASE}/api/liberar-remanentes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha, servicio, kgPorRacion, horaFin, cooldownMinutos }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al liberar remanentes');
  }
  return data.datos;
}

export async function obtenerMenuPhp(fecha = null) {
  const params = new URLSearchParams();
  if (fecha) params.set('fecha', fecha);

  const res = await fetch(`${PHP_API_BASE}/api/menu?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al obtener menú');
  }
  return data;
}
