'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { therapistRegisterSchema, type TherapistRegisterInput } from '@/lib/validations/auth'

type ActionResult = { error: string } | never

export async function registerTherapist(input: TherapistRegisterInput): Promise<ActionResult> {
  // Validar en el servidor (el cliente ya validó, pero nunca confiar solo en él)
  const result = therapistRegisterSchema.safeParse(input)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { fullName, email, password } = result.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'therapist',
      },
      // URL a la que redirige Supabase después de confirmar el email
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    // En desarrollo mostramos el error real para debuggear
    if (process.env.NODE_ENV === 'development') {
      return { error: `[DEV] ${error.message}` }
    }
    if (error.message.includes('already registered')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    if (error.message.includes('rate limit')) {
      return { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' }
    }
    return { error: 'Ocurrió un error al crear la cuenta. Intentá de nuevo.' }
  }

  // Redirigir a la pantalla de "revisá tu email"
  redirect('/register/check-email?type=therapist')
}
