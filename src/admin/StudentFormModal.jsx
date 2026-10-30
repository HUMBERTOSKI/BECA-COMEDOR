import { useState, useRef } from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { addStudent, updateStudent, removeStudentPhoto } from '../services/firestoreService'
import { compressImageToDataUrl } from '../utils/image'

const FIELDS = [
  { key: 'nombre', label: 'Nombre completo', placeholder: 'Apellidos y nombres', required: true },
  { key: 'ci', label: 'CI', placeholder: '1234567', required: true },
  { key: 'ru', label: 'RU', placeholder: '202312345', required: true },
  { key: 'carrera', label: 'Carrera', placeholder: 'Sistemas Informáticos', required: true },
  { key: 'telefono', label: 'Teléfono (para vincular Telegram)', placeholder: '+591 71234567', required: false },
]

export default function StudentFormModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: student?.nombre || '',
    ci: student?.ci || '',
    ru: student?.ru || '',
    carrera: student?.carrera || '',
    telefono: student?.telefono || '',
  })
  const [photo, setPhoto] = useState(student?.foto || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function set(k) { return (e) => setForm({ ...form, [k]: e.target.value }) }

  async function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      setBusy(true)
      const dataUrl = await compressImageToDataUrl(f)
      setPhoto(dataUrl)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = { ...form, foto: photo }
      if (student) {
        await updateStudent(student.id, payload)
      } else {
        const created = await addStudent(payload)
        void created
      }
      onSaved()
    } catch (err) {
      setError(err.message || 'No se pudo guardar.')
      setBusy(false)
    }
  }

  async function onRemovePhoto() {
    setPhoto(null)
    if (student?.foto) await removeStudentPhoto(student.id)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-30 grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-stone-800">
            {student ? 'Editar estudiante' : 'Nuevo estudiante'}
          </h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              {photo ? (
                <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-amber-400" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-stone-100 border grid place-items-center text-stone-300">
                  <Camera size={26} />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white grid place-items-center shadow"
                title="Subir fotografía"
              >
                <Upload size={13} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </div>
            <div className="text-xs text-stone-400 mt-1 space-y-1">
              <p>Fotografía para el carnet y la pantalla verde del mesón.</p>
              <p>Se comprime y guarda en la base de datos (sin Storage de pago).</p>
              {photo && (
                <button type="button" onClick={onRemovePhoto} className="text-red-500 underline">
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-stone-500 mb-1">{f.label}</label>
              <input
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                required={f.required}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          ))}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}