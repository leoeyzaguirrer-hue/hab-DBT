import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Revisá tu email — hab-DBT',
}

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">hab-DBT</h1>
          <p className="text-muted-foreground mt-1 text-sm">Plataforma de apoyo DBT</p>
        </div>

        <Card>
          <CardHeader className="items-center space-y-3 text-center">
            <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
              <MailCheck className="text-primary h-7 w-7" />
            </div>
            <CardTitle className="text-xl">Revisá tu email</CardTitle>
            <CardDescription className="text-base">
              Te enviamos un link de confirmación. Hacé click en él para activar tu cuenta.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-center">
            <div className="bg-muted rounded-lg p-4 text-sm">
              <p className="font-medium">¿No encontrás el email?</p>
              <p className="text-muted-foreground mt-1">
                Revisá la carpeta de spam o correo no deseado. El link expira en 24 horas.
              </p>
            </div>

            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            >
              Volver al inicio de sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
