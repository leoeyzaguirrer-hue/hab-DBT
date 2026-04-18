import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Supabase redirige aquí después de que el usuario confirma su email.
 * Intercambia el code por una sesión activa y redirige al dashboard correcto.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  // Obtener el usuario recién autenticado para saber a qué dashboard enviarlo
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role

  const dashboard = role === 'therapist' ? '/therapist/dashboard' : '/consultant/dashboard'

  return NextResponse.redirect(`${origin}${next !== '/' ? next : dashboard}`)
}
