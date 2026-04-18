import { createClient } from '@supabase/supabase-js'
import { type Database } from '@/types/database'

/**
 * Cliente de Supabase con Service Role Key — bypasea RLS completamente.
 * Usar SOLO en Server Actions y API Routes, nunca exponer al cliente.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
