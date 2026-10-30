import { useState, useEffect } from 'react'
import { Printer, CheckSquare, Search } from 'lucide-react'
import { watchStudents } from '../services/firestoreService'
import CarnetCard from './CarnetCard'

export default function CarnetTab() {
  const [students, setStudents] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState({})

  useEffect(() => watchStudents(setStudents), [])

  useEffect(() => {
    setSelected((prev) => {
      const next = {}
      for (const s of students) if (prev[s.id]) next[s.id] = true
      return next
    })
  }, [students])

  const filtered = students.filter((s) =>
    `${s.nombre} ${s.ci} ${s.ru} ${s.carrera}`.toLowerCase().includes(q.toLowerCase()),
  )

  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectedStudents = students.filter((s) => selected[s.id])
  const allVisible = filtered.length > 0 && filtered.every((s) => selected[s.id])
  const anySelected = selectedCount > 0

  function toggleAll() {
    const next = { ...selected }
    for (const s of filtered) next[s.id] = !allVisible
    setSelected(next)
  }

  function toggle(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Impresión de carnets</h2>
          <p className="text-sm text-stone-500">
            Tarjeta 85,6 × 54 mm con QR de acceso. Usa papel fotográfico (impresora a color).
          </p>
        </div>
        <button
          onClick={() => window.print()}
          disabled={!anySelected}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition ${
            anySelected
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          <Printer size={16} /> Imprimir {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar estudiantes…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-sm text-stone-600 hover:bg-stone-100 px-3 py-2 rounded-lg transition"
        >
          <CheckSquare size={16} /> {allVisible ? 'Quitar todos' : 'Todos'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((s) => {
          const isSel = !!selected[s.id]
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`text-left rounded-xl border-2 p-3 transition flex gap-3 ${
                isSel ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {s.foto ? (
                <img src={s.foto} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-stone-100 grid place-items-center text-stone-300 text-xs">—</div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm text-stone-800 truncate">{s.nombre}</div>
                <div className="text-xs text-stone-400">RU {s.ru}</div>
                <div className="text-xs text-stone-400">{s.carrera}</div>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-stone-400 text-sm col-span-4 py-8 text-center">Sin resultados.</p>
        )}
      </div>

      {/* Área imprimible (oculta en pantalla por CSS @media print) */}
      <div id="print-area" className="print-sheet">
        {selectedStudents.map((s) => (
          <CarnetCard key={s.id} student={s} />
        ))}
      </div>
    </div>
  )
}