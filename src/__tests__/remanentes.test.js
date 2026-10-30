/**
 * Pruebas de la Liberación de Remanentes (ODS 12 · Meta 12.3).
 *
 * Cubre `src/utils/remanentes.js` (cálculo del excedente al cierre de votación,
 * kilos rescatados del desperdicio, mensaje listo para Telegram, activación del
 * acceso al mesón por orden de llegada y bloqueo anti-reenvío de 10 min = el
 * anti-duplicidad del aviso al grupo) y la función de acceso por remanentes.
 * Firma reales —`estadoLiberacionRemanentes(votosSi, raciones, opts)`— tomadas
 * del propio archivo fuente.
 */

import { describe, it, expect } from 'vitest'
import {
  remanentesEstimados,
  kgRescatadosRemanentes,
  mensajeTelegramRemanentes,
  estadoLiberacionRemanentes,
  esAccesoPorRemanentes,
  ultimaLiberacionRemanentes,
  puedeLiberarRemanentes,
  msParaReintentoRemanentes,
  registrarLiberacionRemanentes,
} from '../utils/remanentes.js'

const FECHA = '2026-09-20'
const T0 = 1_000_000_000

describe('remanentesEstimados — excedente del pronóstico sobre lo servido', () => {
  it('no hay remanente si se sirvió todo (pronóstico ≤ servido)', () => {
    expect(remanentesEstimados(20, 42)).toBe(0)
  })

  it('cuenta las raciones pronosticadas que no se sirvieron (el sobrante)', () => {
    expect(remanentesEstimados(42, 30)).toBe(12)
  })

  it('redondea e ignora valores no numéricos', () => {
    expect(remanentesEstimados('x', 10)).toBe(0)
  })
})

describe('kgRescatadosRemanentes — kilos rescatados del desperdicio', () => {
  it('0.5 kg por ración por defecto', () => {
    expect(kgRescatadosRemanentes(8)).toBe(4)
  })

  it('respeta el peso configurado por ración', () => {
    expect(kgRescatadosRemanentes(6, 0.25)).toBe(1.5)
  })
})

describe('mensajeTelegramRemanentes — aviso para el grupo', () => {
  it('incluye cantidad y hora de fin', () => {
    const m = mensajeTelegramRemanentes({ cantidad: 12, horaFin: '15:30' })
    expect(m).toContain('12')
    expect(m).toContain('15:30')
  })
})

describe('estadoLiberacionRemanentes — resumen al liberar', () => {
  it('devuelve null cuando no sobra nada', () => {
    expect(estadoLiberacionRemanentes(20, 42)).toBeNull()
  })

  it('incluye remanentes, kgRescatados y mensaje si hay excedente', () => {
    const r = estadoLiberacionRemanentes(42, 30)
    expect(r).not.toBeNull()
    expect(r.remanentes).toBe(12)
    expect(r.kgRescatados).toBe(6)
    expect(typeof r.mensaje).toBe('string')
  })
})

describe('esAccesoPorRemanentes — mesón abierto por remanentes activos', () => {
  const activos = { [FECHA]: { a: { activo: true, cantidad: 12 } } }

  it('abre el acceso al servicio con remanentes activos', () => {
    expect(esAccesoPorRemanentes('a', activos, FECHA)).toBe(true)
  })

  it('no abre el acceso de otro servicio', () => {
    expect(esAccesoPorRemanentes('c', activos, FECHA)).toBe(false)
  })

  it('sin remanentes activos el acceso sigue cerrado', () => {
    expect(esAccesoPorRemanentes('a', { [FECHA]: { a: { activo: false, cantidad: 3 } } }, FECHA)).toBe(false)
  })
})

describe('bloqueo anti-reenvío de 10 minutos (anti-duplicidad del aviso)', () => {
  it('primera vez del día: permite liberar', () => {
    expect(ultimaLiberacionRemanentes(FECHA)).toBe(0)
    expect(puedeLiberarRemanentes(FECHA, T0)).toBe(true)
    expect(msParaReintentoRemanentes(FECHA, T0)).toBe(0)
  })

  it('tras liberar, bloquea el reenvío durante 10 minutos', () => {
    registrarLiberacionRemanentes(FECHA, T0)
    expect(ultimaLiberacionRemanentes(FECHA)).toBe(T0)
    expect(puedeLiberarRemanentes(FECHA, T0 + 60_000)).toBe(false)
    expect(msParaReintentoRemanentes(FECHA, T0 + 60_000)).toBe(9 * 60 * 1000)
  })

  it('desbloquea al cumplirse los 10 minutos', () => {
    expect(puedeLiberarRemanentes(FECHA, T0 + 10 * 60 * 1000 + 1)).toBe(true)
    expect(msParaReintentoRemanentes(FECHA, T0 + 10 * 60 * 1000 + 1)).toBe(0)
  })
})
