import { describe, it, expect, vi, beforeEach } from 'vitest'
import { publicarMenu } from '../../worker/estudiantes'
import { sendTelegram, fsGet, fsPatch, localHHMM } from '../../worker/core'

vi.mock('../../worker/core', () => ({
  fsQuery: vi.fn(),
  fsGet: vi.fn(),
  fsCreate: vi.fn(),
  fsPatch: vi.fn(),
  sendTelegram: vi.fn(),
  todayBolivia: () => '2026-09-15',
  localHHMM: vi.fn(() => '08:00'),
}))

const menuCompleto = {
  horaLimite: { stringValue: '10:30' },
  platillos: { arrayValue: { values: [{ stringValue: 'Arroz' }, { stringValue: 'Pollo' }] } },
  platillosCena: { arrayValue: { values: [{ stringValue: 'Pasta' }] } },
}
const kb = (call) => call[3].reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data

describe('publicarMenu (envío inmediato por fecha y servicio)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fsGet.mockResolvedValue(menuCompleto)
    localHHMM.mockReturnValue('08:00')
    sendTelegram.mockResolvedValue({ ok: true, body: { result: { message_id: 111 } } })
  })

  it('por defecto envía almuerzo y cena en dos mensajes', async () => {
    const res = await publicarMenu({}, -100, 'tok', '2026-09-30')
    expect(res).toEqual({ published: true, mensajes: 2, cerrada: false })
    expect(fsGet).toHaveBeenCalledWith({}, 'menus/2026-09-30')
    expect(sendTelegram).toHaveBeenCalledTimes(2)
    expect(kb(sendTelegram.mock.calls[0])).toBe('a_si')
    expect(kb(sendTelegram.mock.calls[1])).toBe('c_si')
    expect(fsPatch).toHaveBeenCalledWith(
      {},
      'menus/2026-09-30',
      expect.objectContaining({ estado: { stringValue: 'publicado' }, cerrado: { booleanValue: false } })
    )
  })

  it('servicio almuerzo envía solo un mensaje con su sección y botones', async () => {
    const res = await publicarMenu({}, -100, 'tok', '2026-09-30', 'almuerzo')
    expect(res).toEqual({ published: true, mensajes: 1, cerrada: false })
    expect(sendTelegram).toHaveBeenCalledTimes(1)
    const payload = sendTelegram.mock.calls[0][3]
    expect(payload.text).toContain('Almuerzo')
    expect(payload.text).not.toContain('Cena (18:00–19:00)')
    expect(kb(sendTelegram.mock.calls[0])).toBe('a_si')
  })

  it('servicio cena envía solo la cena con sus botones', async () => {
    const res = await publicarMenu({}, -100, 'tok', '2026-09-30', 'cena')
    expect(res).toEqual({ published: true, mensajes: 1, cerrada: false })
    expect(sendTelegram).toHaveBeenCalledTimes(1)
    const payload = sendTelegram.mock.calls[0][3]
    expect(payload.text).toContain('Cena (18:00–19:00)')
    expect(payload.text).not.toContain('Almuerzo (12:00–14:00)')
    expect(kb(sendTelegram.mock.calls[0])).toBe('c_si')
  })

  it('el domingo no hay cena: no envía nada', async () => {
    const res = await publicarMenu({}, -100, 'tok', '2026-09-20', 'cena')
    expect(res).toEqual({ published: false, reason: 'sin_cena' })
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(fsPatch).not.toHaveBeenCalled()
  })

  it('sin fecha usa el día de hoy', async () => {
    await publicarMenu({}, -100, 'tok')
    expect(fsGet).toHaveBeenCalledWith({}, 'menus/2026-09-15')
  })

  it('sin menú guardado no envía nada', async () => {
    fsGet.mockResolvedValue(null)
    const res = await publicarMenu({}, -100, 'tok', '2026-09-30')
    expect(res).toEqual({ published: false })
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(fsPatch).not.toHaveBeenCalled()
  })

  it('pasado el plazo envía solo el menú, sin botones', async () => {
    localHHMM.mockReturnValue('11:00')
    const res = await publicarMenu({}, -100, 'tok', '2026-09-30')
    expect(res.cerrada).toBe(true)
    expect(sendTelegram).toHaveBeenCalledTimes(2)
    expect(sendTelegram.mock.calls[0][3].reply_markup).toBeUndefined()
    expect(sendTelegram.mock.calls[1][3].reply_markup).toBeUndefined()
    expect(fsPatch).toHaveBeenCalledWith(
      {},
      'menus/2026-09-30',
      expect.objectContaining({ cerrado: { booleanValue: true } })
    )
  })

  it('un feriado combina almuerzo y cena en un solo mensaje', async () => {
    fsGet.mockResolvedValue({
      feriado: { booleanValue: true },
      platillos: { arrayValue: { values: [{ stringValue: 'Arroz' }] } },
      platillosCena: { arrayValue: { values: [{ stringValue: 'Pasta' }] } },
    })
    await publicarMenu({}, -100, 'tok', '2026-09-30')
    expect(sendTelegram).toHaveBeenCalledTimes(1)
    const payload = sendTelegram.mock.calls[0][3]
    expect(payload.text).toContain('almuerzo y cena juntos')
    expect(payload.text).toContain('1. Arroz')
    expect(payload.text).toContain('2. Pasta')
  })
})
