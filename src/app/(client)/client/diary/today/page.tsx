import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DiaryCard from './DiaryCard'

export default async function TodayDiaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fecha local en formato YYYY-MM-DD
  // El servidor usa UTC, así que la dejamos como referencia — el cliente
  // puede actualizar si el TZ difiere, pero para diario es suficiente.
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tarjeta del día</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(today + 'T12:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <DiaryCard date={today} userId={user.id} />
    </div>
  )
}
