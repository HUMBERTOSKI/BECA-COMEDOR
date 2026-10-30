import { useState } from 'react'
import { UtensilsCrossed, Lock, LogIn } from 'lucide-react'
import { login } from '../services/authService'

export default function AuthModal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(mapError(err.code))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-stone-100 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-amber-500 grid place-items-center text-white mb-3">
              <UtensilsCrossed size={28} />
            </div>
            <h1 className="text-xl font-bold text-stone-800">Beca Comedor</h1>
            <p className="text-sm text-stone-500">U.A.B.J.B</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo institucional"
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
              />
              <Lock size={16} className="absolute right-3 top-3.5 text-stone-400" />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {busy ? 'Ingresando…' : <><LogIn size={18} /> Ingresar</>}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-stone-400 mt-4">
          Acceso restringido al personal autorizado.
        </p>
      </div>
    </div>
  )
}

function mapError(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos.'
    default:
      return 'No se pudo iniciar sesión.'
  }
}