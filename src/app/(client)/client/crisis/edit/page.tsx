import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CrisisPlanEditor from './CrisisPlanEditor'

export default async function CrisisEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href="/client/crisis"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label="Volver al plan"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Editar mi plan</h1>
          <p className="text-xs text-muted-foreground">
            Solo vos podés leer esto — está cifrado en tu dispositivo
          </p>
        </div>
      </div>

      <CrisisPlanEditor userId={user.id} />
    </div>
  )
}
