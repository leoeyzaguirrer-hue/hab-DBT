import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Database } from '@/types/database'

/**
 * Refresca el token de sesión de Supabase en cada request.
 * Debe llamarse al inicio del middleware de Next.js.
 *
 * Retorna el response con cookies actualizadas y el usuario actual (o null).
 */
export async function updateSession(request: NextRequest) {
  // Crear un response base que pasaremos al cliente de Supabase
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Escribir cookies tanto en el request como en el response
          // para que ambos lados tengan la sesión actualizada
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: No agregar lógica entre createServerClient y auth.getUser().
  // Un error aquí puede causar bugs de sesión difíciles de detectar.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
