// Métricas ODS 12: precisión del pronóstico y kilos salvados del desperdicio.

/** Precisión (0–100) entre lo pronosticado (votos Sí) y lo servido.
 *  100 = coincidencia perfecta. votosSi=0 y raciones=0 → 100 (no hubo error).
 *  Si se pronosticó pero no se sirvió nada → 0.**
 */
export function precisionPct(votosSi, raciones) {
  const v = Number(votosSi) || 0
  const r = Number(raciones) || 0
  if (v === 0 && r === 0) return 100
  if (v === 0) return 0
  const err = Math.abs(v - r) / v
  return Math.max(0, Math.round((1 - Math.min(err, 1)) * 100))
}

/** Kilos de comida NO cocinada de más gracias al pronóstico.
 *  Solo suma cuando el pronóstico supera lo realmente servido. */
export function kilosSalvados(votosSi, raciones, kgPorRacion = 0.5) {
  const exceso = Math.max(0, (Number(votosSi) || 0) - (Number(raciones) || 0))
  return Math.round(exceso * kgPorRacion * 100) / 100
}

/** Exceso de raciones anticipadas vs. servidas (puede ser negativo). */
export function excesoRaciones(votosSi, raciones) {
  return (Number(votosSi) || 0) - (Number(raciones) || 0)
}

/** Resumen diario. */
export function dailySummary({ votosSi = 0, votosNo = 0, raciones = 0, kgPorRacion = 0.5 }) {
  const v = Number(votosSi) || 0
  const n = Number(votosNo) || 0
  const r = Number(raciones) || 0
  return {
    votosSi: v,
    votosNo: n,
    totalVotos: v + n,
    raciones: r,
    precision: precisionPct(v, r),
    kilos: kilosSalvados(v, r, kgPorRacion),
    exceso: excesoRaciones(v, r),
  }
}
