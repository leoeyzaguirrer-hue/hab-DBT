import { createBrowserClient } from '@supabase/ssr'
import { type Database } from '@/types/database'

/**
 * Cliente de Supabase para usar en componentes del navegador (Client Components).
 * Usa el anon key — RLS protege los datos.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
