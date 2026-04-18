import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Calendar, ShieldAlert, MessageCircle, Home } from 'lucide-react'
import ClientLogoutButton from './ClientLogoutButton'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      {/* Contenido principal */}
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-lg">
        {children}
      </main>

      {/* Barra de navegación inferior (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <NavItem href="/client/dashboard" icon={<Home size={20} />} label="Inicio" />
          <NavItem href="/client/diary/today" icon={<Calendar size={20} />} label="Diaria" />
          <NavItem
            href="/client/crisis"
            icon={<ShieldAlert size={20} />}
            label="Crisis"
            highlight
          />
          <NavItem href="/client/skills" icon={<BookOpen size={20} />} label="Habilidades" />
          <NavItem href="/client/messages" icon={<MessageCircle size={20} />} label="Mensajes" />
          <ClientLogoutButton />
        </div>
      </nav>
    </div>
  )
}

function NavItem({
  href,
  icon,
  label,
  highlight = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
        highlight
          ? 'text-destructive font-semibold'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
