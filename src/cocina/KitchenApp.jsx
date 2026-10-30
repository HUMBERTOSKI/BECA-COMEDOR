import { useState } from 'react'
import { ScanLine, BarChart3 } from 'lucide-react'
import ForecastView from './ForecastView'
import ScannerScreen from './ScannerScreen'

export default function KitchenApp() {
  const [view, setView] = useState('meson')

  if (view === 'meson') {
    return (
      <div>
        <button
          onClick={() => setView('forecast')}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-stone-800 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold"
        >
          <BarChart3 size={16} /> Ver pronóstico
        </button>
        <ScannerScreen />
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setView('meson')}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold"
      >
        <ScanLine size={16} /> Escanear en el mesón
      </button>
      <ForecastView />
    </div>
  )
}