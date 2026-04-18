'use server'

// Nota: los type assertions (as any) son necesarios porque el Database type
// fue creado manualmente. Al conectar Supabase CLI ejecutar:
// npx supabase gen types typescript --linked > src/types/database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { InvitationCode } from '@/types/database'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRawCode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function generateInvitationCode(note?: string): Promise<
  { data: InvitationCode } | { error: string }
> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar unicidad antes de insertar (colisión improbable pero posible)
  let code = generateRawCode()
  for (let i = 0; i < 5; i++) {
    const { data: existing } = await supabase
      .from('invitation_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle()
    if (!existing) break
    code = generateRawCode()
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invitation_codes')
    .insert({
      code,
      therapist_id: user.id,
      expires_at: expiresAt,
      notes: note?.trim() || null,
    })
    .select()
    .single()

  if (error) return { error: 'No se pudo generar el código. Intentá de nuevo.' }

  revalidatePath('/therapist/dashboard/invitations')
  return { data: data as InvitationCode }
}

export async function getInvitationCodes(): Promise<InvitationCode[]> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('therapist_id', user.id)
    .order('created_at', { ascending: false })

  return (data as InvitationCode[]) ?? []
}

/** Valida un código antes de mostrar el formulario de registro */
export async function validateCode(code: string): Promise<{
  valid: boolean
  therapistId?: string | null
  error?: string | null
}> {
  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.rpc('validate_invitation_code', { p_code: code })
  if (error || !data?.[0]) return { valid: false, error: 'Error de validación' }
  const result = data[0] as { valid: boolean; therapist_id: string | null; error_msg: string | null }
  return { valid: result.valid, therapistId: result.therapist_id, error: result.error_msg }
}

/** Vincula el cliente recién creado con su terapeuta y marca el código como usado */
export async function linkClientToTherapist(code: string, clientId: string): Promise<boolean> {
  const admin = createAdminClient() as AnyClient
  const { data, error } = await admin.rpc('use_invitation_code', {
    p_code: code,
    p_client_id: clientId,
  })
  if (error) return false
  return data === true
}
