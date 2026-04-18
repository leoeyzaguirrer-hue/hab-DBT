import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TherapistRegisterForm } from './TherapistRegisterForm'

export const metadata = {
  title: 'Registro de terapeuta — hab-DBT',
}

export default function TherapistRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Encabezado */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">hab-DBT</h1>
          <p className="text-muted-foreground mt-1 text-sm">Plataforma de apoyo DBT</p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Crear cuenta como terapeuta</CardTitle>
            <CardDescription>
              Completá el formulario para acceder a la plataforma y gestionar a tus consultantes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TherapistRegisterForm />
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
          >
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
