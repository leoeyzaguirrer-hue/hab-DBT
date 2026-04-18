import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CalendarClient from './CalendarClient'

export default async function DiaryHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Historial</h1>
          <p className="text-sm text-muted-foreground">
            Tus tarjetas de los días anteriores
          </p>
        </div>
        <Link
          href="/client/diary/today"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Hoy
        </Link>
      </div>

      <CalendarClient />
    </div>
  )
}
