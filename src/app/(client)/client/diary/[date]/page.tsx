import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import DiaryCard from '../today/DiaryCard'

interface Props {
  params: Promise<{ date: string }>
}

export default async function DiaryDatePage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date } = await params

  // Validar formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  // No permitir fechas futuras
  const today = new Date().toISOString().split('T')[0]
  if (date > today) notFound()

  const isToday = date === today

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        <Link
          href="/client/diary/history"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label="Volver al historial"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isToday ? 'Tarjeta de hoy' : 'Tarjeta del día'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <DiaryCard date={date} userId={user.id} />
    </div>
  )
}
