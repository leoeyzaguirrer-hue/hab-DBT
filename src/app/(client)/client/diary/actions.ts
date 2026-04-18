'use server'

import { createClient } from '@/lib/supabase/server'

type AnyClient = any // eslint-disable-line @typescript-eslint/no-explicit-any

/** Guarda o actualiza la tarjeta diaria (datos ya cifrados en el cliente) */
export async function saveDiaryCard(
  date: string,
  encryptedData: string,
  encryptionIv: string
): Promise<{ error?: string }> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('diary_cards').upsert(
    {
      client_id: user.id,
      date,
      encrypted_data: encryptedData,
      encryption_iv: encryptionIv,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,date' }
  )

  if (error) return { error: 'No se pudo guardar la tarjeta.' }
  return {}
}

/** Carga la tarjeta cifrada de una fecha específica */
export async function loadDiaryCard(date: string): Promise<{
  encryptedData?: string
  encryptionIv?: string
  error?: string
}> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data } = await supabase
    .from('diary_cards')
    .select('encrypted_data, encryption_iv')
    .eq('client_id', user.id)
    .eq('date', date)
    .maybeSingle()

  if (!data) return {}
  return { encryptedData: data.encrypted_data, encryptionIv: data.encryption_iv }
}

/** Retorna las fechas del mes que tienen tarjeta guardada */
export async function getDiaryDates(year: number, month: number): Promise<string[]> {
  const supabase = (await createClient()) as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data } = await supabase
    .from('diary_cards')
    .select('date')
    .eq('client_id', user.id)
    .gte('date', from)
    .lte('date', to)

  return (data ?? []).map((r: { date: string }) => r.date)
}
