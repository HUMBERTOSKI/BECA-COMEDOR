import { describe, it, expect } from 'vitest'
import { precisionPct, kilosSalvados, excesoRaciones, dailySummary } from '../utils/metrics'

describe('precisionPct', () => {
  it('coincidencia perfecta = 100', () => {
    expect(precisionPct(50, 50)).toBe(100)
  })
  it('sin votos y sin raciones = 100 (sin error)', () => {
    expect(precisionPct(0, 0)).toBe(100)
  })
  it('pronosticó pero no sirvió nada = 0', () => {
    expect(precisionPct(30, 0)).toBe(0)
  })
  it('error del 20% (-10 en 50) = 80', () => {
    expect(precisionPct(50, 40)).toBe(80)
  })
  it('por encima también penaliza: 30 votos, 21 servidas = 70', () => {
    expect(precisionPct(30, 21)).toBe(70)
  })
  it('nunca baja de 0 aunque el exceso sea enorme', () => {
    expect(precisionPct(5, 100)).toBe(0)
  })
})

describe('kilosSalvados', () => {
  it('exceso de raciones × kg/ración por defecto 0.5', () => {
    expect(kilosSalvados(20, 12)).toBe(4)
  })
  it('con kg/ración personalizado', () => {
    expect(kilosSalvados(20, 10, 0.4)).toBe(4)
  })
  it('sin exceso = 0 (no negativos)', () => {
    expect(kilosSalvados(8, 12)).toBe(0)
  })
})

describe('excesoRaciones', () => {
  it('puede ser positivo (sobrepronóstico)', () => {
    expect(excesoRaciones(10, 7)).toBe(3)
  })
  it('puede ser negativo', () => {
    expect(excesoRaciones(5, 9)).toBe(-4)
  })
})

describe('dailySummary', () => {
  it('integra conteos y métricas con el peso configurado', () => {
    const s = dailySummary({ votosSi: 40, votosNo: 10, raciones: 32, kgPorRacion: 0.5 })
    expect(s).toEqual({ votosSi: 40, votosNo: 10, totalVotos: 50, raciones: 32, precision: 80, kilos: 4, exceso: 8 })
  })
})