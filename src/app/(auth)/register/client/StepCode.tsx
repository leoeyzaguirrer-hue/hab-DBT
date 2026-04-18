'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { validateCode } from '@/app/(therapist)/therapist/dashboard/invitations/actions'
import { cleanInvitationCode } from '@/lib/utils/format'

interface Props {
  initialCode: string
  onNext: (code: string) => void
}

export function StepCode({ initialCode, onNext }: Props) {
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCodeChange(value: string) {
    // Auto-formatear mientras escribe: XXXX-XXXX
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)
    const formatted = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
    setCode(formatted)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rawCode = cleanInvitationCode(code)
    if (rawCode.length !== 8) {
      setError('El código debe tener 8 caracteres')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await validateCode(rawCode)
      if (!result.valid) {
        setError(result.error ?? 'Código inválido')
        return
      }
      onNext(rawCode)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresá tu código</CardTitle>
        <CardDescription>
          Tu terapeuta te dio un código de 8 caracteres para acceder a la app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Código de invitación</label>
            <Input
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="XXXX-XXXX"
              className="font-mono text-center text-lg tracking-widest"
              autoComplete="off"
              autoFocus
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending || code.replace('-','').length < 8}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Validando...' : 'Continuar'}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            ¿No tenés código?{' '}
            <span className="font-medium">Pedile a tu terapeuta que genere uno.</span>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
