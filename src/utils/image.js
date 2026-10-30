// Compresión de fotos del estudiante SIN Firebase Storage: se guarda el
// dataURL (JPEG ~250px) en el propio documento de Firestore (gratis, sin
// plan de pago). Un doc de 500 registros ≈ 10–15KB cada foto.

/**
 * Lee un File de imagen, lo redimensiona y devuelve un dataURL JPEG comprimido.
 * @param {File} file
 * @param {number} maxW ancho máximo del lado mayor (por defecto 280)
 * @param {number} quality 0..1
 * @returns {Promise<string>}
 */
export function compressImageToDataUrl(file, maxW = 280, quality = 0.62) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecciona una imagen válida.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen corrupta.'))
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}