import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Iniciar sesión — hab-DBT' }

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">hab-DBT</h1>
          <p className="text-muted-foreground mt-1 text-sm">Plataforma de apoyo DBT</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
            <p className="text-muted-foreground text-center text-sm">
              <Link
                href="/forgot-password"
                className="hover:text-foreground underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="text-muted-foreground space-y-1 text-center text-sm">
          <p>
            ¿Sos terapeuta y no tenés cuenta?{' '}
            <Link href="/register/therapist" className="text-foreground font-medium underline underline-offset-4 hover:no-underline">
              Registrate
            </Link>
          </p>
          <p>
            ¿Sos consultante?{' '}
            <Link href="/register/client" className="text-foreground font-medium underline underline-offset-4 hover:no-underline">
              Usá tu código de invitación
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
