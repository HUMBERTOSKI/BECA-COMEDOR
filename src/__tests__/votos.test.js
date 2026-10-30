import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registrarVoto } from '../../worker/estudiantes'
import { fsQuery, fsGet, fsCreate } from '../../worker/core'

vi.mock('../../worker/core', () => ({
  fsQuery: vi.fn(),
  fsGet: vi.fn(),
  fsCreate: vi.fn(),
  fsPatch: vi.fn(),
  sendTelegram: vi.fn(),
  todayBolivia: () => '2026-09-15',
  localHHMM: () => '08:00',
}))

const env = {}
const student = { id: 'stu1', activo: { booleanValue: true } }

describe('registrarVoto por servicio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fsQuery.mockResolvedValue([student])
    fsGet.mockImplementation((_e, path) => {
      if (path.startsWith('menus/')) return Promise.resolve({ estado: { stringValue: 'publicado' }, horaLimite: { stringValue: '10:30' } })
      return Promise.resolve(null) // votes/<legacy> no existe
    })
    fsCreate.mockResolvedValue(true)
  })

  it('guarda el voto de cena con la clave por servicio', async () => {
    const res = await registrarVoto(env, 5, 'si', 'c')
    expect(res).toEqual({ ok: true, code: 'ok' })
    expect(fsCreate).toHaveBeenCalledTimes(1)
    const [, collection, docId, fields] = fsCreate.mock.calls[0]
    expect(collection).toBe('votes')
    expect(docId).toBe('2026-09-15_stu1_c')
    expect(fields.servicio.stringValue).toBe('c')
  })

  it('guarda el voto de almuerzo con la clave por servicio', async () => {
    await registrarVoto(env, 5, 'no', 'a')
    expect(fsCreate.mock.calls[0][2]).toBe('2026-09-15_stu1_a')
  })

  it('no duplica el almuerzo si ya votó con la clave antigua', async () => {
    fsGet.mockImplementation((_e, path) => {
      if (path.startsWith('menus/')) return Promise.resolve({ estado: { stringValue: 'publicado' }, horaLimite: { stringValue: '10:30' } })
      return Promise.resolve({ respuesta: { stringValue: 'si' } }) // vote legacy existe
    })
    const res = await registrarVoto(env, 5, 'si', 'a')
    expect(res).toEqual({ ok: false, code: 'ya_voto' })
    expect(fsCreate).not.toHaveBeenCalled()
  })

  it('un segundo voto de cena devuelve ya_voto', async () => {
    fsCreate.mockResolvedValue(false)
    const res = await registrarVoto(env, 5, 'si', 'c')
    expect(res).toEqual({ ok: false, code: 'ya_voto' })
  })
})
