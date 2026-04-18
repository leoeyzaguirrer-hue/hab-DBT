'use client'

/**
 * Shell del cliente para la página de crisis.
 * Modo normal → muestra el plan (CrisisViewer).
 * Modo activado → carga el plan y arranca el wizard (CrisisWizard).
 */

import { useState, useEffect, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { decryptData } from '@/lib/crypto/decrypt'
import { loadCrisisPlanOffline, saveCrisisPlanOffline } from '@/lib/crisis/offlineStorage'
import { loadCrisisPlan, registerCrisisActivation } from './actions'
import { DEFAULT_CRISIS_PLAN } from '@/lib/crisis/defaults'
import type { CrisisPlanContent } from '@/lib/crisis/types'
import CrisisViewer from './CrisisViewer'
import CrisisWizard from './CrisisWizard'

export default function CrisisPageClient({
  userId,
  isActivated,
}: {
  userId: string
  isActivated: boolean
}) {
  const [plan, setPlan]               = useState<CrisisPlanContent | null>(null)
  const [activationId, setActivationId] = useState<string | undefined>()
  const [loading, setLoading]         = useState(true)
  const [wizardDone, setWizardDone]   = useState(false)
  const [, startTransition]           = useTransition()

  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Cargar plan desde IndexedDB (offline-first)
      const offline = await loadCrisisPlanOffline(userId)
      if (!cancelled && offline) setPlan(offline)

      // 2. Sincronizar desde servidor si hay red
      try {
        const { encryptedData, encryptionIv } = await loadCrisisPlan()
        if (cancelled) return

        if (encryptedData && encryptionIv) {
          const key = await getOrCreateDeviceKey(userId)
          const decrypted = await decryptData<CrisisPlanContent>(encryptedData, encryptionIv, key)
          if (!cancelled && decrypted) {
            setPlan(decrypted)
            await saveCrisisPlanOffline(userId, decrypted)
          }
        } else if (!offline) {
          if (!cancelled) setPlan(DEFAULT_CRISIS_PLAN)
        }
      } catch {
        if (!cancelled && !offline) setPlan(DEFAULT_CRISIS_PLAN)
      }

      // 3. Si es modo emergencia, registrar la activación
      if (isActivated && !cancelled) {
        startTransition(async () => {
          const { activationId: id } = await registerCrisisActivation()
          if (!cancelled) setActivationId(id)
        })
      }

      if (!cancelled) setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [userId, isActivated])

  // ── Modo emergencia / wizard ──────────────────────────────────────────────

  if (isActivated && !wizardDone) {
    if (loading || !plan) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-48">
          <Loader2 size={24} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tu plan de crisis...</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🆘</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Plan de crisis</h1>
            <p className="text-xs text-muted-foreground">Seguí los pasos, de a uno</p>
          </div>
        </div>
        <CrisisWizard
          plan={plan}
          activationId={activationId}
          onFinish={() => setWizardDone(true)}
        />
      </div>
    )
  }

  // ── Modo lectura normal (o después de terminar el wizard) ─────────────────

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Mi plan de crisis</h1>
          <p className="text-xs text-muted-foreground">
            {isActivated && wizardDone
              ? '✓ Completaste los pasos — muy bien hecho.'
              : 'Conocé tu plan antes de necesitarlo'}
          </p>
        </div>
      </div>

      {isActivated && wizardDone && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">
            Lo lograste. Eso requirió mucha valentía.
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Contale a tu terapeuta lo que pasó en la próxima sesión.
          </p>
        </div>
      )}

      <CrisisViewer userId={userId} />
    </div>
  )
}
