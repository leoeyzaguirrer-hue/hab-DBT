'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CONSENT_ITEMS = [
  {
    id: 'support_tool',
    label:
      'Entiendo que esta aplicación es un apoyo complementario al tratamiento y no reemplaza la atención terapéutica presencial.',
  },
  {
    id: 'therapist_access',
    label:
      'Autorizo a mi terapeuta a visualizar mis registros de seguimiento semanal dentro de la plataforma.',
  },
  {
    id: 'emergency',
    label:
      'Comprendo que en situaciones de emergencia o riesgo de vida debo contactar servicios de crisis o emergencias locales (ej: 911, guardia hospitalaria).',
  },
  {
    id: 'encryption_risk',
    label:
      'Entiendo que si pierdo mi contraseña y mi frase de recuperación, no podré recuperar mis datos cifrados.',
  },
  {
    id: 'terms',
    label: 'He leído y acepto los Términos de Uso y la Política de Privacidad.',
  },
]

interface Props {
  onBack: () => void
  onNext: () => void
}

export function StepConsent({ onBack, onNext }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allChecked = CONSENT_ITEMS.every((item) => checked[item.id])

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consentimiento informado</CardTitle>
        <CardDescription>
          Leé cada punto y marcá tu acuerdo para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {CONSENT_ITEMS.map((item) => (
            <div key={item.id} className="flex gap-3">
              <Checkbox
                id={item.id}
                checked={!!checked[item.id]}
                onCheckedChange={() => toggle(item.id)}
                className="mt-0.5 shrink-0"
              />
              <label
                htmlFor={item.id}
                className="cursor-pointer text-sm leading-relaxed"
              >
                {item.label}
              </label>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
          >
            Atrás
          </button>
          <Button
            onClick={onNext}
            disabled={!allChecked}
            className="flex-1"
          >
            Aceptar y continuar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
