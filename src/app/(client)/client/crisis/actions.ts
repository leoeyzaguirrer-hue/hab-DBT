'use server'

import { createClient } from '@/lib/supabase/server'

type AnyClient = any // eslint-disable-line @typescript-eslint/no-explicit-any

/** Guarda o actualiza el plan de crisis cifrado */
export async function saveCrisisPlan(
  encryptedData: string,
  encryptionIv: string
): Promise<{ error?: string }> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('crisis_plans').upsert(
    {
      client_id:       user.id,
      encrypted_data:  encryptedData,
      encryption_iv:   encryptionIv,
      last_modified_by: user.id,
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )

  if (error) {
    if (process.env.NODE_ENV === 'development') return { error: `[DEV] ${error.message}` }
    return { error: 'No se pudo guardar el plan de crisis.' }
  }
  return {}
}

/** Carga el plan de crisis cifrado desde el servidor */
export async function loadCrisisPlan(): Promise<{
  encryptedData?: string
  encryptionIv?: string
  planId?: string
  error?: string
}> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data } = await supabase
    .from('crisis_plans')
    .select('id, encrypted_data, encryption_iv')
    .eq('client_id', user.id)
    .maybeSingle()

  if (!data) return {}
  return {
    planId:        data.id,
    encryptedData: data.encrypted_data,
    encryptionIv:  data.encryption_iv,
  }
}

/** Registra una activación del plan de crisis (cuando se presiona el botón SOS) */
export async function registerCrisisActivation(): Promise<{
  activationId?: string
  error?: string
}> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Obtener el plan activo para vincularlo
  const { data: plan } = await supabase
    .from('crisis_plans')
    .select('id')
    .eq('client_id', user.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('crisis_activations')
    .insert({
      client_id:      user.id,
      crisis_plan_id: plan?.id ?? null,
      steps_used:     [],
      resolved:       false,
    })
    .select('id')
    .single()

  if (error) return {}  // Si falla (ej: sin internet), continuar igual
  return { activationId: data?.id }
}

/** Actualiza el estado de una activación (pasos usados, si se resolvió) */
export async function updateCrisisActivation(
  activationId: string,
  stepsUsed: number[],
  resolved: boolean
): Promise<void> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('crisis_activations')
    .update({
      steps_used: stepsUsed,
      resolved,
      ended_at: new Date().toISOString(),
    })
    .eq('id', activationId)
    .eq('client_id', user.id)
}
