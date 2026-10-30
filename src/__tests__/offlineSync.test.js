// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initOfflineCache,
  validateLocally,
  syncPendingQueue,
  subscribeSyncStatus,
  getSyncStatus,
  setSyncClient,
  resetOfflineCache,
} from '../services/offlineSyncService'
import { todayISO } from '../utils/dates'

const DATE = todayISO()

const STUDENTS = [
  { id: 's1', nombre: 'Ana Güiza', ci: '1234567', ru: '202200123', carrera: 'Derecho', activo: true },
  { id: 's2', nombre: 'Betty Paz', ci: '7654321', ru: '202200456', carrera: 'Medicina', activo: false },
  { id: 's3', nombre: 'Carlos Roca', ci: '1112223', ru: '202200789', carrera: 'Ing. Sistemas', activo: true },
]

function seedCache() {
  resetOfflineCache()
  initOfflineCache({ date: DATE, students: STUDENTS, attendances: [] })
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllTimers()
})

describe('validateLocally', () => {
  beforeEach(() => {
    seedCache()
    window.dispatchEvent(new Event('online'))
  })

  it('rechaza estudiantes inexistentes', () => {
    const r = validateLocally('BECA1:desconocido', DATE)
    expect(r).toEqual({ status: 'no_registrado' })
  })

  it('rechaza QR no válido', () => {
    const r = validateLocally('OTRO:abc', DATE)
    expect(r).toEqual({ status: 'no_registrado' })
  })

  it('rechaza estudiantes inactivos', () => {
    const r = validateLocally('BECA1:s2', DATE)
    expect(r.status).toBe('inactivo')
    expect(r.student.nombre).toBe('Betty Paz')
  })

  it('aprueba un estudiante válido y lo encola', () => {
    const r = validateLocally('BECA1:s1', DATE)
    expect(r.status).toBe('ok')
    expect(r.offline).toBe(true)
    expect(r.student).toMatchObject({ nombre: 'Ana Güiza', ci: '1234567', ru: '202200123', carrera: 'Derecho' })
    expect(getSyncStatus().pendingCount).toBe(1)
  })

  it('bloquea de inmediato el escaneo duplicado del mismo día (ya_comio)', () => {
    validateLocally('BECA1:s1', DATE)
    const r = validateLocally('BECA1:s1', DATE)
    expect(r.status).toBe('ya_comio')
    expect(r.student.nombre).toBe('Ana Güiza')
    expect(getSyncStatus().pendingCount).toBe(1) // un solo registro en cola
  })
})

describe('syncPendingQueue', () => {
  beforeEach(() => {
    resetOfflineCache()
    seedCache()
  })

  it('no sincroniza sin conexión (conserva la cola)', async () => {
    vi.useFakeTimers()
    window.dispatchEvent(new Event('offline'))
    const client = { validate: vi.fn() }
    setSyncClient(client)

    validateLocally('BECA1:s1', DATE)
    await syncPendingQueue(client)

    expect(client.validate).not.toHaveBeenCalled()
    expect(getSyncStatus().pendingCount).toBe(1)
  })

  it('vacía la cola al volver la red', async () => {
    vi.useFakeTimers()
    window.dispatchEvent(new Event('offline'))
    const client = { validate: vi.fn().mockResolvedValue({ ok: true }) }
    setSyncClient(client)

    validateLocally('BECA1:s1', DATE)
    validateLocally('BECA1:s3', DATE)
    expect(getSyncStatus().pendingCount).toBe(2)

    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(2000)

    expect(client.validate).toHaveBeenCalledTimes(2)
    expect(client.validate).toHaveBeenNthCalledWith(1, 'BECA1:s1')
    expect(client.validate).toHaveBeenNthCalledWith(2, 'BECA1:s3')
    expect(getSyncStatus().pendingCount).toBe(0)
  })

  it('preserva la cola ante un fallo de red y reintenta a los 5 s', async () => {
    vi.useFakeTimers()
    window.dispatchEvent(new Event('offline'))
    const client = { validate: vi.fn() }
    setSyncClient(client)
    validateLocally('BECA1:s1', DATE)

    client.validate.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(2000)

    expect(client.validate).toHaveBeenCalledTimes(1)
    expect(getSyncStatus().pendingCount).toBe(1)
    expect(getSyncStatus().isSyncing).toBe(false)

    client.validate.mockResolvedValue({ ok: true })
    await vi.advanceTimersByTimeAsync(6000)

    expect(client.validate).toHaveBeenCalledTimes(2)
    expect(getSyncStatus().pendingCount).toBe(0)
  })

  it('trata el "ya_comio" del servidor como pendiente resuelto (sin duplicar)', async () => {
    vi.useFakeTimers()
    window.dispatchEvent(new Event('offline'))
    const client = { validate: vi.fn().mockResolvedValue({ ok: false, reason: 'ya_comio' }) }
    setSyncClient(client)
    validateLocally('BECA1:s1', DATE)

    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(2000)

    expect(client.validate).toHaveBeenCalledTimes(1)
    expect(getSyncStatus().pendingCount).toBe(0)
  })
})

describe('subscribeSyncStatus (transiciones online/offline)', () => {
  beforeEach(() => {
    resetOfflineCache()
    seedCache()
  })

  it('notifica los cambios de conectividad', async () => {
    vi.useFakeTimers()
    const states = []
    const un = subscribeSyncStatus((s) => states.push(s))

    window.dispatchEvent(new Event('offline'))
    window.dispatchEvent(new Event('online'))
    await vi.advanceTimersByTimeAsync(2000)

    expect(states.some((s) => s.isOnline === false)).toBe(true)
    expect(states.at(-1).isOnline).toBe(true)
    expect(states.at(-1)).toHaveProperty('isSyncing', false)
    expect(states.at(-1)).toHaveProperty('pendingCount', 0)
    un()
  })
})