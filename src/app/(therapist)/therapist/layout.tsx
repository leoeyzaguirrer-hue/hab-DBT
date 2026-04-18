import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from './dashboard/LogoutButton'

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/therapist/dashboard" className="font-semibold">
            hab-DBT
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/therapist/dashboard/invitations"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Invitaciones
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
