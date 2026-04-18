import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password']

// Rutas según rol
const THERAPIST_ROUTES = ['/therapist']
const CLIENT_ROUTES    = ['/consultant']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Refrescar sesión en cada request (obligatorio para @supabase/ssr)
  const { supabaseResponse, user } = await updateSession(request)

  const isPublicRoute   = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))
  const isTherapistRoute = THERAPIST_ROUTES.some((r) => pathname.startsWith(r))
  const isClientRoute   = CLIENT_ROUTES.some((r) => pathname.startsWith(r))

  // 2. Sin sesión → solo puede acceder a rutas públicas
  if (!user) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 3. Con sesión → no puede volver a rutas de auth
  if (isPublicRoute) {
    const role = user.user_metadata?.role as string | undefined
    const url  = request.nextUrl.clone()
    url.pathname = role === 'therapist' ? '/therapist/dashboard' : '/consultant/dashboard'
    return NextResponse.redirect(url)
  }

  // 4. Control de acceso por rol
  const role = user.user_metadata?.role as string | undefined

  if (isTherapistRoute && role !== 'therapist') {
    // Un consultante intentando acceder a rutas del terapeuta
    const url = request.nextUrl.clone()
    url.pathname = '/consultant/dashboard'
    return NextResponse.redirect(url)
  }

  if (isClientRoute && role === 'therapist') {
    // Un terapeuta intentando acceder a rutas del consultante
    const url = request.nextUrl.clone()
    url.pathname = '/therapist/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Ejecutar en todos los paths EXCEPTO:
     * - archivos estáticos de Next.js (_next/static, _next/image)
     * - favicon.ico
     * - archivos de imagen (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
