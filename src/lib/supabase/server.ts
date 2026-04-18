import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type Database } from '@/types/database'

/**
 * Cliente de Supabase para Server Components y Server Actions.
 * Lee y escribe cookies para mantener la sesión del usuario.
 * Siempre llamar con `await`.
 *
 * Ejemplo:
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('profiles').select()
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll llamado desde un Server Component (sin capacidad de mutar cookies).
            // Se ignora porque el middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  )
}
