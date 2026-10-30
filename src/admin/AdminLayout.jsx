export default function AdminLayout({ tabs, active, onChange, children }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex gap-2 flex-wrap mb-6 bg-white rounded-xl shadow-sm p-2 border">
        {tabs.map((t) => {
          const Icon = t.icon
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-amber-500 text-white shadow'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}