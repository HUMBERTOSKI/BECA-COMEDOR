import { QRCodeSVG } from 'qrcode.react'
import { encodeQr } from '../utils/qr'

export default function CarnetCard({ student }) {
  return (
    <div className="card-carnet bg-white text-stone-900 grid grid-cols-[1fr_auto] items-center gap-2 px-3 border border-stone-300">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <LogoMark className="w-7 h-7" />
          <div className="leading-none">
            <div className="font-black text-[10px] tracking-wide">U.A.B.J.B</div>
            <div className="text-[7px] text-amber-700 font-bold uppercase tracking-wider">Beca Comedor</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {student.foto ? (
            <img src={student.foto} alt="" className="w-16 h-20 object-cover rounded-md border border-stone-200" />
          ) : (
            <div className="w-16 h-20 rounded-md bg-stone-100 grid place-items-center text-stone-300 text-2xl">👤</div>
          )}
          <div className="leading-tight">
            <div className="text-[9px] font-bold uppercase text-stone-500">Beneficiario</div>
            <div className="text-[11px] font-bold leading-snug">{student.nombre}</div>
            <div className="text-[9px] mt-1">CI: <span className="font-semibold">{student.ci}</span></div>
            <div className="text-[9px]">RU: <span className="font-semibold">{student.ru}</span></div>
            <div className="text-[8px] text-stone-500 truncate w-36">{student.carrera}</div>
          </div>
        </div>
        <div className="mt-1 text-[7px] text-stone-400 tracking-wider">
          Documento institucional · Gestión 2026
        </div>
      </div>

      <div className="flex flex-col items-end self-stretch justify-center gap-1 pr-1">
        <div className="bg-white p-1 rounded border border-stone-200">
          <QRCodeSVG value={encodeQr(student.id)} size={74} fgColor="#1c1917" />
        </div>
        <div className="text-[6px] uppercase tracking-widest text-stone-400">Escanea en el mesón</div>
      </div>
    </div>
  )
}

function LogoMark({ className }) {
  return (
    <div className={`${className} rounded-full bg-amber-500 grid place-items-center text-white`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3/4 h-3/4">
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm1 15h-2v-2h2v2Zm0-4h-2V8h2v5Z" />
      </svg>
    </div>
  )
}