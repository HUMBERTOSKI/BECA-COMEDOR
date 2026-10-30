import { useState } from 'react'
import {
  Users, CreditCard, UtensilsCrossed, BarChart3, LogOut, LayoutDashboard,
} from 'lucide-react'
import AdminLayout from './AdminLayout'
import StudentsTab from './StudentsTab'
import CarnetTab from './CarnetTab'
import MenuTab from './MenuTab'
import MetricsTab from './MetricsTab'
import { logout } from '../services/authService'

const TABS = [
  { id: 'estudiantes', label: 'Estudiantes', icon: Users },
  { id: 'carnets', label: 'Carnets', icon: CreditCard },
  { id: 'menus', label: 'Menú del día', icon: UtensilsCrossed },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
]

export default function AdminDashboard() {
  const [tab, setTab] = useState('estudiantes')

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-stone-800">
            <div className="w-8 h-8 rounded-lg bg-amber-500 grid place-items-center">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <span>Beca Comedor <span className="text-amber-600">U.A.B.J.B</span></span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <AdminLayout tabs={TABS} active={tab} onChange={setTab}>
        {tab === 'estudiantes' && <StudentsTab />}
        {tab === 'carnets' && <CarnetTab />}
        {tab === 'menus' && <MenuTab />}
        {tab === 'metricas' && <MetricsTab />}
      </AdminLayout>
    </div>
  )
}