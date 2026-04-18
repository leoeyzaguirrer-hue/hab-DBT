import { MessageCircle } from 'lucide-react'

export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
      <MessageCircle size={48} className="text-muted-foreground" />
      <h1 className="text-xl font-bold">Mensajes</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        La mensajería segura con tu terapeuta estará disponible aquí pronto.
      </p>
    </div>
  )
}
