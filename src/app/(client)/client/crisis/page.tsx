import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CrisisPageClient from './CrisisPageClient'

interface Props {
  searchParams: Promise<{ activar?: string }>
}

export default async function CrisisPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { activar } = await searchParams
  const isActivated = activar === '1'

  return <CrisisPageClient userId={user.id} isActivated={isActivated} />
}
