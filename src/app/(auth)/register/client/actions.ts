'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { linkClientToTherapist } from '@/app/(therapist)/therapist/dashboard/invitations/actions'

const personalDataSchema = z
  .object({
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    email: z.string().email('El email no es válido').toLowerCase(),
    password: z
      .string()
      .min(12, 'La contraseña debe tener al menos 12 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type PersonalDataInput = z.infer<typeof personalDataSchema>

export async function registerClient(input: PersonalDataInput & { code: string }) {
  const result = personalDataSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { fullName, email, password } = result.data
  const supabase = await createClient()

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: 'client' },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (signUpError) {
    if (process.env.NODE_ENV === 'development') {
      return { error: `[DEV] ${signUpError.message}` }
    }
    if (signUpError.message.includes('already registered')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    return { error: 'No se pudo crear la cuenta. Intentá de nuevo.' }
  }

  if (!authData.user) {
    return { error: 'No se pudo crear la cuenta. Intentá de nuevo.' }
  }

  // Vincular el cliente con su terapeuta usando el código de invitación
  const linked = await linkClientToTherapist(input.code, authData.user.id)
  if (!linked) {
    // El registro se completó pero el vínculo falló — no es crítico, se puede reactivar
    console.error('Warning: failed to link client to therapist for code', input.code)
  }

  redirect('/register/check-email?type=client')
}
