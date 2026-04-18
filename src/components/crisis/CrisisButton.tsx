/**
 * Botón flotante SOS — siempre visible en la app del cliente.
 * Navega a /client/crisis?activar=1 para iniciar el wizard.
 *
 * Se agrega en el layout del cliente. No aparece en login/registro
 * porque esos usan el layout (auth), no el layout (client).
 */
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

export default function CrisisButton() {
  return (
    <Link
      href="/client/crisis?activar=1"
      aria-label="Activar plan de crisis"
      className={[
        'fixed z-50',
        // Por encima del nav bar (4rem = 64px) con 1rem de separación
        'bottom-[5rem] right-4',
        // Tamaño y forma
        'flex h-14 w-14 flex-col items-center justify-center rounded-full',
        // Color rojo de emergencia
        'bg-red-600 text-white',
        // Sombra para destacar sobre el contenido
        'shadow-lg shadow-red-900/40',
        // Interacciones
        'hover:bg-red-700 active:scale-95 transition-all duration-150',
        // Animación de pulso sutil para visibilidad
        'ring-2 ring-red-400 ring-offset-2 ring-offset-background',
      ].join(' ')}
    >
      <ShieldAlert size={22} strokeWidth={2.5} />
      <span className="text-[9px] font-bold leading-none mt-0.5 tracking-wide">
        SOS
      </span>
    </Link>
  )
}
