import { describe, it, expect } from 'vitest'
import { useForecast } from '../hooks/useForecast'
import { useScanner } from '../hooks/useScanner'
import { useMenuCalendar } from '../hooks/useMenuCalendar'
import { useMetricsHistory } from '../hooks/useMetricsHistory'

describe('Arquitectura Modular: Hooks de Dominio', () => {
  it('useForecast está definido y es una función hook', () => {
    expect(typeof useForecast).toBe('function')
  })

  it('useScanner está definido y es una función hook', () => {
    expect(typeof useScanner).toBe('function')
  })

  it('useMenuCalendar está definido y es una función hook', () => {
    expect(typeof useMenuCalendar).toBe('function')
  })

  it('useMetricsHistory está definido y es una función hook', () => {
    expect(typeof useMetricsHistory).toBe('function')
  })
})
