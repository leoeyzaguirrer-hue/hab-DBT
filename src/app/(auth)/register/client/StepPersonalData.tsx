'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { registerClient } from './actions'

const schema = z
  .object({
    fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    email: z.string().email('El email no es válido'),
    password: z
      .string()
      .min(12, 'Mínimo 12 caracteres')
      .regex(/[A-Z]/, 'Al menos una mayúscula')
      .regex(/[0-9]/, 'Al menos un número')
      .regex(/[^A-Za-z0-9]/, 'Al menos un carácter especial (!, @, #…)'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

interface Props {
  code: string
  onBack: () => void
}

export function StepPersonalData({ code, onBack }: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  function onSubmit(values: FormData) {
    setServerError(null)
    startTransition(async () => {
      const result = await registerClient({ ...values, code })
      if (result?.error) setServerError(result.error)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus datos</CardTitle>
        <CardDescription>
          Creá tu cuenta. Usá una contraseña fuerte — protege tu información clínica.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre completo" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Mínimo 12 caracteres"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={showPass ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Mínimo 12 caracteres, una mayúscula, un número y un símbolo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repetir contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repetí tu contraseña"
                        autoComplete="new-password"
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                      >
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onBack}
                className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
              >
                Atrás
              </button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
