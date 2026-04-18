import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DiaryCard from './DiaryCard'

export default async function TodayDiaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h1 className="text-lg font-bold tracking-tight capitalize">{dateLabel}</h1>
        <p className="text-xs text-muted-foreground">Tarjeta diaria · Completa cada sección</p>
      </div>
      <DiaryCard date={today} userId={user.id} />
    </div>
  )
}
