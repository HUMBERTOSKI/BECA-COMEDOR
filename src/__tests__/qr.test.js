import { describe, it, expect } from 'vitest'
import { decodeQr, encodeQr, QR_PREFIX } from '../utils/qr'

describe('encodeQr/decodeQr', () => {
  it('codifica y decodifica correctamente', () => {
    const qr = encodeQr('abc123XYZ')
    expect(qr).toBe('BECA1:abc123XYZ')
    expect(decodeQr(qr)).toBe('abc123XYZ')
  })
  it('acepta espacios alrededor del id', () => {
    expect(decodeQr('BECA1:  hola  ')).toBe('hola')
  })
  it('rechaza payloads sin prefijo', () => {
    expect(decodeQr('abc')).toBe(null)
    expect(decodeQr('ABCD:x')).toBe(null)
  })
  it('rechaza valores no string', () => {
    expect(decodeQr(null)).toBe(null)
    expect(decodeQr(undefined)).toBe(null)
    expect(decodeQr(123)).toBe(null)
  })
  it('rechaza id vacío', () => {
    expect(decodeQr('BECA1:   ')).toBe(null)
  })
  it('el prefijo es exportado y consistente', () => {
    expect(QR_PREFIX).toBe('BECA1')
  })
})