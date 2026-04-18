'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
})

export async function login(input: { email: string; password: string }) {
  const result = loginSchema.safeParse(input)
  if (!result.success) return { error: result.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  })

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Confirmá tu email antes de iniciar sesión. Revisá tu bandeja de entrada.' }
    }
    return { error: 'Email o contraseña incorrectos.' }
  }

  const role = data.user?.user_metadata?.role
  redirect(role === 'therapist' ? '/therapist/dashboard' : '/client/dashboard')
}
