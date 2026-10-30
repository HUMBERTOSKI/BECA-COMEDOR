import { useState, useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { watchAuth, watchRole, logout } from './services/authService'
import AuthModal from './auth/AuthModal'
import AdminDashboard from './admin/AdminDashboard'
import KitchenApp from './cocina/KitchenApp'
import ReceptionistApp from './recepcion/ReceptionistApp'

function getView() {
  if (window.location.hash.startsWith('#/meson')) return 'meson'
  if (window.location.hash.startsWith('#/recepcion')) return 'recepcion'
  return 'panel'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [role, setRole] = useState(null)
  const [view, setView] = useState(getView)

  useEffect(() => watchAuth((u) => { setUser(u); setRole(null); setAuthLoaded(true) }), [])

  useEffect(() => {
    if (!user) return
    return watchRole(user.uid, setRole)
  }, [user])

  useEffect(() => {
    const onHash = () => setView(getView())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!authLoaded) {
    return <div className="min-h-screen grid place-items-center text-stone-400">Cargando…</div>
  }

  if (!user) return <AuthModal />

  if (!role) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="text-center max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <ShieldAlert size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="font-bold text-stone-800">Cuenta sin acceso</h2>
          <p className="text-sm text-stone-500 mt-1">
            Tu usuario no tiene un rol habilitado en este sistema. Contacta al administrador.
          </p>
          <button onClick={logout} className="mt-4 text-sm text-stone-500 hover:text-red-600 underline">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  const canStaff = role.rol === 'cocina' || role.rol === 'admin' || role.rol === 'recepcionista'
  const canKitchen = role.rol === 'cocina' || role.rol === 'admin'

  if (view === 'recepcion' && canStaff) return <ReceptionistApp />
  if (view === 'meson' && canKitchen) return <KitchenApp />
  if (role.rol === 'recepcionista') return <ReceptionistApp />
  if (role.rol === 'cocina') return <KitchenApp />
  if (role.rol === 'admin') return <AdminDashboard />

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <p className="text-stone-500">Rol desconocido. Contacta al administrador.</p>
    </div>
  )
}