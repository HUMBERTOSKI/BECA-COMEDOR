import { describe, it, expect } from 'vitest'
import { todayBolivia } from '../../worker/core'
import { menuText, normalizePhone, samePhone } from '../../worker/estudiantes'
import { encodeQr, decodeQr } from '../utils/qr'

describe('consistencia worker ↔ frontend (QR)', () => {
  it('worker decodifica lo que el frontend codifica (mismo módulo)', () => {
    const qr = encodeQr('unIdLargo123')
    expect(decodeQr(qr)).toBe('unIdLargo123')
  })
  it('rechaza QR inválidos en ambos lados', () => {
    for (const bad of ['sinprefijo', 'OTRO:x', 'BECA1:   ', null, 123]) {
      expect(decodeQr(bad)).toBe(null)
    }
  })
})

describe('todayBolivia (UTC-4)', () => {
  it('formato YYYY-MM-DD', () => {
    expect(todayBolivia()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('en la noche boliviana (22:00Z) no se adelanta al día siguiente', () => {
    const real = Date.now.bind(Date)
    Date.now = () => new Date('2026-09-14T22:00:00Z').getTime() // Bolivia: 18:00 del 14
    try {
      expect(todayBolivia()).toBe('2026-09-14')
    } finally {
      Date.now = real
    }
  })
  it('a las 02:00Z (22:00 del día anterior en Bolivia) usa el día previo', () => {
    const real = Date.now.bind(Date)
    Date.now = () => new Date('2026-09-14T02:00:00Z').getTime() // Bolivia: 22:00 del 13
    try {
      expect(todayBolivia()).toBe('2026-09-13')
    } finally {
      Date.now = real
    }
  })
})

describe('menuText', () => {
  it('arma el mensaje con platillos y límite, resaltando el día', () => {
    const t = menuText({ fecha: '2026-09-13', platillos: ['Arroz', 'Ensalada'], horaLimite: '10:30' })
    expect(t).toContain('Domingo 13 de septiembre')
    expect(t).toContain('1. Arroz')
    expect(t).toContain('2. Ensalada')
    expect(t).toContain('10:30')
  })
  it('sin platillos muestra aviso', () => {
    expect(menuText({})).toContain('Menú por definir')
  })
  it('entre semana (martes) muestra almuerzo y cena', () => {
    const t = menuText({
      fecha: '2026-09-15',
      platillos: ['Arroz'],
      platillosCena: ['Pasta'],
      horaLimite: '10:30',
    })
    expect(t).toContain('Almuerzo (12:00–14:00)')
    expect(t).toContain('Cena (18:00–19:00)')
    expect(t).toContain('Pasta')
  })
  it('el sábado avisa que la cena es para llevar', () => {
    const t = menuText({ fecha: '2026-09-19', platillosCena: ['Lomo'] })
    expect(t).toContain('para llevar')
  })
  it('el domingo no muestra cena', () => {
    const t = menuText({ fecha: '2026-09-20', platillosCena: ['Lomo'] })
    expect(t).not.toContain('18:00–19:00')
  })
  it('servicio almuerzo solo muestra la sección del almuerzo', () => {
    const t = menuText({ fecha: '2026-09-15', platillos: ['Arroz'], platillosCena: ['Pasta'] }, 'almuerzo')
    expect(t).toContain('Almuerzo (12:00–14:00)')
    expect(t).not.toContain('Cena (18:00–19:00)')
    expect(t).toContain('Arroz')
    expect(t).not.toContain('Pasta')
  })
  it('servicio cena solo muestra la sección de la cena', () => {
    const t = menuText({ fecha: '2026-09-15', platillos: ['Arroz'], platillosCena: ['Pasta'] }, 'cena')
    expect(t).toContain('Cena (18:00–19:00)')
    expect(t).not.toContain('Almuerzo (12:00–14:00)')
    expect(t).toContain('Pasta')
    expect(t).not.toContain('Arroz')
  })
  it('un feriado combina almuerzo y cena juntos', () => {
    const t = menuText({
      fecha: '2026-09-15',
      platillos: ['Arroz'],
      platillosCena: ['Pasta'],
      feriado: true,
    })
    expect(t).toContain('almuerzo y cena juntos')
    expect(t).toContain('Servicio combinado')
    expect(t).toContain('2. Pasta')
  })
  it('cerrada oculta la instrucción de votar', () => {
    const t = menuText({ fecha: '2026-09-15', platillos: ['Arroz'] }, 'ambos', { cerrada: true })
    expect(t).toContain('La votación ya cerró')
    expect(t).not.toContain('Vota hasta')
  })
})

describe('normalizePhone / samePhone (vínculo por teléfono)', () => {
  it('normaliza dejando solo dígitos', () => {
    expect(normalizePhone('+591 71234567')).toBe('59171234567')
    expect(normalizePhone('71234567')).toBe('71234567')
    expect(normalizePhone('')).toBe('')
  })
  it('tolera prefijo país y cero inicial', () => {
    expect(samePhone('+591 71234567', '71234567')).toBe(true)
    expect(samePhone('59171234567', '71234567')).toBe(true)
    expect(samePhone('07 123-4567', '71234567')).toBe(true)
    expect(samePhone('+591 71234567', '+591 71234567')).toBe(true)
  })
  it('no confunde números distintos', () => {
    expect(samePhone('71234567', '76543210')).toBe(false)
    expect(samePhone('', '71234567')).toBe(false)
  })
})