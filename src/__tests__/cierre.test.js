import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cerrarVotaciones } from '../../worker/estudiantes'
import { sendTelegram, fsGet, fsPatch, localHHMM } from '../../worker/core'

vi.mock('../../worker/core', () => ({
  fsQuery: vi.fn(),
  fsGet: vi.fn(),
  fsCreate: vi.fn(),
  fsPatch: vi.fn(),
  sendTelegram: vi.fn(),
  todayBolivia: () => '2026-09-16',
  localHHMM: vi.fn(() => '11:00'),
}))

const menuPublicado = {
  estado: { stringValue: 'publicado' },
  horaLimite: { stringValue: '10:30' },
  platillos: { arrayValue: { values: [{ stringValue: 'Arroz' }] } },
  platillosCena: { arrayValue: { values: [{ stringValue: 'Pasta' }] } },
  msgAlmuerzo: { integerValue: '101' },
  msgCena: { integerValue: '102' },
}

const env = { BOT_TOKEN: 'tok', TELEGRAM_CHAT_ID: '-100' }

describe('cerrarVotaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localHHMM.mockReturnValue('11:00')
    fsGet.mockResolvedValue(menuPublicado)
    sendTelegram.mockResolvedValue({ ok: true, body: {} })
  })

  it('tras el plazo quita los botones de ambos mensajes y marca cerrado', async () => {
    const res = await cerrarVotaciones(env)
    expect(res).toEqual({ closed: true })
    expect(sendTelegram).toHaveBeenCalledTimes(2)
    const [, token1, method1, payload1] = sendTelegram.mock.calls[0]
    expect(method1).toBe('editMessageText')
    expect(token1).toBe('tok')
    expect(payload1.chat_id).toBe('-100')
    expect(payload1.message_id).toBe(101)
    expect(payload1.reply_markup).toEqual({ inline_keyboard: [] })
    expect(payload1.text).toContain('Miércoles 16 de septiembre')
    expect(payload1.text).toContain('La votación ya cerró')
    expect(sendTelegram.mock.calls[1][3].message_id).toBe(102)
    expect(fsPatch).toHaveBeenCalledWith(env, 'menus/2026-09-16', { cerrado: { booleanValue: true } })
  })

  it('no cierra antes del plazo', async () => {
    localHHMM.mockReturnValue('09:00')
    const res = await cerrarVotaciones(env)
    expect(res).toEqual({ closed: false })
    expect(sendTelegram).not.toHaveBeenCalled()
    expect(fsPatch).not.toHaveBeenCalled()
  })

  it('no repite si ya estaba cerrado', async () => {
    fsGet.mockResolvedValue({ ...menuPublicado, cerrado: { booleanValue: true } })
    const res = await cerrarVotaciones(env)
    expect(res).toEqual({ closed: false })
    expect(sendTelegram).not.toHaveBeenCalled()
  })

  it('no hace nada si no hay menú publicado', async () => {
    fsGet.mockResolvedValue({ estado: { stringValue: 'borrador' } })
    const res = await cerrarVotaciones(env)
    expect(res).toEqual({ closed: false })
    expect(sendTelegram).not.toHaveBeenCalled()
  })
})
