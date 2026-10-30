import { describe, it, expect } from 'vitest'
import { classifyCamera, pickCameraDevice, canSwitchCamera } from '../utils/camera'

describe('classifyCamera', () => {
  it('reconoce cámaras traseras', () => {
    expect(classifyCamera('Back Camera')).toBe('back')
    expect(classifyCamera('cámara trasera')).toBe('back')
    expect(classifyCamera('Rear Camera')).toBe('back')
    expect(classifyCamera('environment')).toBe('back')
  })

  it('reconoce cámaras frontales', () => {
    expect(classifyCamera('Front Camera')).toBe('front')
    expect(classifyCamera('cámara delantera')).toBe('front')
    expect(classifyCamera('User Facing')).toBe('front')
    expect(classifyCamera('SelfieCam')).toBe('front')
  })

  it('devuelve null para etiquetas desconocidas', () => {
    expect(classifyCamera('Integrated Camera')).toBeNull()
    expect(classifyCamera('')).toBeNull()
  })
})

describe('pickCameraDevice', () => {
  const cams = [
    { id: 'cam-front', label: 'Front Camera' },
    { id: 'cam-back', label: 'Back Camera' },
  ]

  it('usa facingMode como respaldo cuando no hay lista', () => {
    expect(pickCameraDevice(null, 'back')).toEqual({ facingMode: 'environment' })
    expect(pickCameraDevice([], 'front')).toEqual({ facingMode: 'user' })
  })

  it('elige por etiqueta cuando hay coincidencia', () => {
    expect(pickCameraDevice(cams, 'back')).toBe('cam-back')
    expect(pickCameraDevice(cams, 'front')).toBe('cam-front')
  })

  it('con una sola cámara devuelve su id en cualquier modo', () => {
    const solo = [{ id: 'unica', label: 'Webcam' }]
    expect(pickCameraDevice(solo, 'back')).toBe('unica')
    expect(pickCameraDevice(solo, 'front')).toBe('unica')
  })

  it('sin etiquetas reconocibles usa el índice (1=trasera, 0=frontal)', () => {
    const anon = [{ id: 'a' }, { id: 'b' }]
    expect(pickCameraDevice(anon, 'back')).toBe('b')
    expect(pickCameraDevice(anon, 'front')).toBe('a')
  })
})

describe('canSwitchCamera', () => {
  it('solo con más de una cámara', () => {
    expect(canSwitchCamera([{ id: 'a' }])).toBe(false)
    expect(canSwitchCamera([{ id: 'a' }, { id: 'b' }])).toBe(true)
    expect(canSwitchCamera(null)).toBe(false)
  })
})