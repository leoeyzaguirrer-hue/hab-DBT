'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { StepCode } from './StepCode'
import { StepConsent } from './StepConsent'
import { StepPersonalData } from './StepPersonalData'

type Step = 'code' | 'consent' | 'personal'

interface WizardData {
  code: string
}

const STEP_LABELS = ['Código', 'Consentimiento', 'Tus datos']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i + 1 === current
                  ? 'bg-primary text-primary-foreground'
                  : i + 1 < current
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`hidden text-xs sm:block ${
                i + 1 === current ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-px w-8 ${i + 1 < current ? 'bg-primary/40' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function ClientRegisterWizard() {
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code') ?? ''

  const [step, setStep] = useState<Step>(initialCode ? 'consent' : 'code')
  const [data, setData] = useState<WizardData>({ code: initialCode })

  const stepNumber = step === 'code' ? 1 : step === 'consent' ? 2 : 3

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">hab-DBT</h1>
          <p className="text-muted-foreground mt-1 text-sm">Registro de consultante</p>
        </div>

        <StepIndicator current={stepNumber} />

        {step === 'code' && (
          <StepCode
            initialCode={data.code}
            onNext={(code) => {
              setData({ code })
              setStep('consent')
            }}
          />
        )}

        {step === 'consent' && (
          <StepConsent
            onBack={() => setStep('code')}
            onNext={() => setStep('personal')}
          />
        )}

        {step === 'personal' && (
          <StepPersonalData
            code={data.code}
            onBack={() => setStep('consent')}
          />
        )}
      </div>
    </div>
  )
}

export default function ClientRegisterPage() {
  return (
    <Suspense>
      <ClientRegisterWizard />
    </Suspense>
  )
}
