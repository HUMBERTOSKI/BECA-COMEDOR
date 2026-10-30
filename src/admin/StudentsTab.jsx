import { useState, useEffect } from 'react'
import { Search, UserPlus, UserX, Send } from 'lucide-react'
import {
  watchStudents, setStudentActive, setStudentTelegram, getStudent,
} from '../services/firestoreService'
import StudentFormModal from './StudentFormModal'

export default function StudentsTab() {
  const [students, setStudents] = useState([])
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null) // { student } | {student:null, creando:true}
  const [telegramTarget, setTelegramTarget] = useState(null) // studentId en edición de vínculo

  useEffect(() => watchStudents(setStudents), [])

  const filtered = students.filter((s) => {
    const t = `${s.nombre} ${s.ci ?? ''} ${s.ru ?? ''} ${s.carrera ?? ''} ${s.telefono ?? ''}`.toLowerCase()
    return t.includes(q.toLowerCase())
  })

  async function onToggle(id, activo) {
    await setStudentActive(id, activo)
  }

  async function onSetTelegram(id, tgId) {
    await setStudentTelegram(id, tgId?.trim() || '')
    setTelegramTarget(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-800">Registro de estudiantes</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-2.5 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, CI, RU…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <button
            onClick={() => setModal({ student: null, creando: true })}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            <UserPlus size={16} /> Nuevo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Foto</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">CI</th>
                <th className="text-left px-4 py-3">RU</th>
                <th className="text-left px-4 py-3">Carrera</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Telegram</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className={`border-t ${!s.activo ? 'opacity-45' : ''}`}>
                  <td className="px-4 py-2">
                    {s.foto ? (
                      <img src={s.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-200 grid place-items-center text-stone-400 text-xs">—</div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium text-stone-800">{s.nombre}</td>
                  <td className="px-4 py-2">{s.ci}</td>
                  <td className="px-4 py-2">{s.ru}</td>
                  <td className="px-4 py-2">{s.carrera}</td>
                  <td className="px-4 py-2 text-stone-600">{s.telefono || <span className="text-stone-400">—</span>}</td>
                  <td className="px-4 py-2">
                    {s.telegramUserId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                        <Send size={11} /> {s.telegramUserId}
                      </span>
                    ) : (
                      <span className="text-stone-400 text-xs">sin vínculo</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onToggle(s.id, !s.activo)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition ${
                        s.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}
                      title="Desactivar/reactivar"
                    >
                      <UserX size={11} /> {s.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModal({ student: s, creando: false })}
                      className="text-amber-600 hover:underline text-xs font-semibold mr-3"
                    >
                      Editar
                    </button>
                    {telegramTarget === s.id ? (
                      <TelegramInline student={s} onSubmit={onSetTelegram} onCancel={() => setTelegramTarget(null)} />
                    ) : (
                      <button
                        onClick={() => setTelegramTarget(s.id)}
                        className="text-sky-600 hover:underline text-xs font-semibold"
                      >
                        Vínculo TG
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-stone-400">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-stone-400 mt-3 flex items-center gap-1.5">
        <Send size={12} /> Vinculación de Telegram: el estudiante abre el chat privado con
        <code>@becacomedorEstBOT</code>, usa <code>/vincular</code> y comparte su número (debe estar
        registrado aquí). Respaldo manual: escribe <code>/miid</code> y registra aquí su ID.
      </p>

      {modal && (
        <StudentFormModal
          student={modal.student}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      )}
    </div>
  )
}

function TelegramInline({ student, onSubmit, onCancel }) {
  const [val, setVal] = useState(student.telegramUserId || '')
  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="ID de Telegram"
        className="w-28 px-2 py-1 border border-stone-300 rounded text-xs"
        autoFocus
      />
      <button onClick={() => onSubmit(student.id, val)} className="text-emerald-600 text-xs font-semibold">
        Guardar
      </button>
      <button onClick={onCancel} className="text-stone-400 text-xs">
        ✕
      </button>
    </span>
  )
}