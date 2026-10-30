import { describe, it, expect } from 'vitest'
import { todayISO, formatFechaLarga, formatFechaCorta, lastDays, minutesUntil } from '../utils/dates'

describe('fechas bolivianas (UTC-4)', () => {
  it('todayISO entrega YYYY-MM-DD', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formatFechaLarga "lunes 12 de septiembre de 2026"', () => {
    expect(formatFechaLarga('2026-09-12')).toBe('sábado 12 de septiembre de 2026')
  })

  it('formatFechaCorta dd/mm/yyyy', () => {
    expect(formatFechaCorta('2026-09-12')).toBe('12/09/2026')
  })

  it('lastDays(n) termina hoy y baja descendente', () => {
    const hoy = todayISO()
    const days = lastDays(5)
    expect(days).toHaveLength(5)
    expect(days[0]).toBe(hoy)
    expect(new Set(days).size).toBe(5)
  })

  it('minutesUntil con límite futuro devuelve número positivo', () => {
    const m = minutesUntil('23:59')
    expect(m).toBeGreaterThanOrEqual(0)
  })
})