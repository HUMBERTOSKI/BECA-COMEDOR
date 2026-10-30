import { describe, it, expect, vi, beforeEach } from 'vitest'
import { procesarEnvios } from '../../worker/envios'
import { publicarMenu } from '../../worker/estudiantes'
import { estimadoCocina } from '../../worker/cocina'
import { fsQuery, fsPatch, sendTelegram } from '../../worker/core'

vi.mock('../../worker/core', () => ({
  fsQuery: vi.fn(),
  fsGet: vi.fn(),
  fsCreate: vi.fn(),
  fsPatch: vi.fn(),
  sendTelegram: vi.fn(),
  todayBolivia: () => '2026-09-15',
}))
vi.mock('../../worker/estudiantes', () => ({ publicarMenu: vi.fn() }))

const env = { TELEGRAM_CHAT_ID: '-100', BOT_TOKEN: 'tok' }
const doc = (id, fecha, envTime, estado, servicio) => ({
  id,
  fecha: { stringValue: fecha },
  enviarEn: { timestampValue: envTime },
  estado: estado ? { stringValue: estado } : undefined,
  servicio: servicio ? { stringValue: servicio } : undefined,
})

describe('procesarEnvios', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cuando llega la hora envía el menú (ambos por defecto) y marca enviado', async () => {
    fsQuery.mockResolvedValue([
      doc('a', '2026-09-15', '2026-09-15T12:00:00Z', 'pendiente'),
      doc('b', '2026-09-16', '2099-01-01T00:00:00Z', 'pendiente'),
    ])
    publicarMenu.mockResolvedValue({ published: true })
    const n = await procesarEnvios(env, new Date('2026-09-15T13:00:00Z').getTime())
    expect(n).toBe(1)
    expect(publicarMenu).toHaveBeenCalledTimes(1)
    expect(publicarMenu).toHaveBeenCalledWith(env, '-100', 'tok', '2026-09-15', 'ambos')
    expect(fsPatch).toHaveBeenCalledWith(env, 'envios/a', { estado: { stringValue: 'enviado' } })
    expect(fsPatch).not.toHaveBeenCalledWith(env, 'envios/b', expect.anything())
  })

  it('respeta el servicio programado (cena)', async () => {
    fsQuery.mockResolvedValue([doc('c', '2026-09-15', '2026-09-15T12:00:00Z', 'pendiente', 'cena')])
    publicarMenu.mockResolvedValue({ published: true })
    await procesarEnvios(env, new Date('2026-09-15T13:00:00Z').getTime())
    expect(publicarMenu).toHaveBeenCalledWith(env, '-100', 'tok', '2026-09-15', 'cena')
  })

  it('no reenvía los ya enviados', async () => {
    fsQuery.mockResolvedValue([doc('x', '2026-09-15', '2026-09-15T12:00:00Z', 'enviado')])
    publicarMenu.mockResolvedValue({ published: true })
    const n = await procesarEnvios(env, new Date('2026-09-15T13:00:00Z').getTime())
    expect(n).toBe(0)
    expect(publicarMenu).not.toHaveBeenCalled()
  })

  it('marca enviado aunque no exista el menú (sin reenvíos)', async () => {
    fsQuery.mockResolvedValue([doc('y', '2026-09-15', '2026-09-15T12:00:00Z', 'pendiente')])
    publicarMenu.mockResolvedValue({ published: false })
    const n = await procesarEnvios(env, new Date('2026-09-15T13:00:00Z').getTime())
    expect(n).toBe(1)
    expect(fsPatch).toHaveBeenCalledWith(env, 'envios/y', { estado: { stringValue: 'enviado' } })
  })
})

describe('estimadoCocina (solo almuerzo)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cuenta los votos de almuerzo e ignora los de la cena', async () => {
    fsQuery.mockResolvedValue([
      { respuesta: { stringValue: 'si' }, servicio: { stringValue: 'a' } },
      { respuesta: { stringValue: 'si' }, servicio: { stringValue: 'a' } },
      { respuesta: { stringValue: 'no' }, servicio: { stringValue: 'a' } },
      { respuesta: { stringValue: 'si' }, servicio: { stringValue: 'c' } },
      { respuesta: { stringValue: 'si' } }, // voto antiguo = almuerzo
    ])
    await estimadoCocina(env, '-200', 'tok')
    const text = sendTelegram.mock.calls[0][3].text
    expect(text).toContain('Asistirán a almorzar: *3*')
    expect(text).toContain('No almorzarán: 1')
  })
})
