'use client'

/**
 * Vista del plan de crisis en modo lectura (no emergencia).
 * Carga primero desde IndexedDB (offline), luego sincroniza desde servidor.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Phone, Pencil, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { decryptData } from '@/lib/crypto/decrypt'
import { saveCrisisPlanOffline, loadCrisisPlanOffline } from '@/lib/crisis/offlineStorage'
import { loadCrisisPlan } from './actions'
import { DEFAULT_CRISIS_PLAN } from '@/lib/crisis/defaults'
import type { CrisisPlanContent } from '@/lib/crisis/types'

const BOLIVIA_CRISIS_LINE = '800140090'
const EMERGENCY_NUMBER = '911'

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col gap-3">
      <h3 className="font-bold text-sm flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h3>
      {children}
    </div>
  )
}

function ItemList({ items, emptyMsg }: { items: string[]; emptyMsg: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground italic">{emptyMsg}</p>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ContactCard({ name, role, phone }: { name: string; role: string; phone: string }) {
  const roleLabel: Record<string, string> = {
    familiar: 'Familiar', amigo: 'Amigo/a', otro: 'Contacto', terapeuta: 'Terapeuta',
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{roleLabel[role] ?? role}</p>
      </div>
      <a
        href={`tel:${phone.replace(/\D/g, '')}`}
        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Phone size={12} /> Llamar
      </a>
    </div>
  )
}

export default function CrisisViewer({ userId }: { userId: string }) {
  const [plan, setPlan] = useState<CrisisPlanContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPlan() {
      // 1. Cargar desde IndexedDB primero (funciona offline)
      const offline = await loadCrisisPlanOffline(userId)
      if (!cancelled && offline) {
        setPlan(offline)
        setLoading(false)
      }

      // 2. Intentar sincronizar desde servidor (puede fallar sin internet)
      try {
        const { encryptedData, encryptionIv } = await loadCrisisPlan()
        if (cancelled) return

        if (encryptedData && encryptionIv) {
          const key = await getOrCreateDeviceKey(userId)
          const decrypted = await decryptData<CrisisPlanContent>(encryptedData, encryptionIv, key)
          if (!cancelled && decrypted) {
            setPlan(decrypted)
            // Actualizar IndexedDB con la versión más reciente del servidor
            await saveCrisisPlanOffline(userId, decrypted)
          }
        } else if (!offline) {
          // No hay plan en servidor ni en IndexedDB → mostrar el por defecto
          if (!cancelled) setPlan(DEFAULT_CRISIS_PLAN)
        }
      } catch {
        // Sin internet — si ya cargamos desde IndexedDB está bien
        if (!cancelled && !offline) setPlan(DEFAULT_CRISIS_PLAN)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPlan()
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando tu plan...</span>
      </div>
    )
  }

  const p = plan ?? DEFAULT_CRISIS_PLAN
  const isDefault = !plan || (plan === DEFAULT_CRISIS_PLAN)

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Banner si es el plan por defecto */}
      {isDefault && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <strong>Este es un plan de ejemplo.</strong> Personalizalo con tus propias estrategias y contactos tocando "Editar mi plan".
        </div>
      )}

      {/* Llamadas de emergencia siempre arriba */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 flex flex-col gap-3">
        <p className="text-sm font-bold text-red-800 text-center">Ayuda inmediata</p>
        <div className="flex gap-2">
          <a href={`tel:${BOLIVIA_CRISIS_LINE}`}
            className="flex-1 flex flex-col items-center gap-1 rounded-xl bg-red-600 text-white py-3 hover:bg-red-700 active:scale-95 transition-all text-center">
            <Phone size={18} />
            <span className="text-xs font-bold leading-tight">Línea de crisis<br />800-14-0090</span>
          </a>
          <a href={`tel:${EMERGENCY_NUMBER}`}
            className="flex-1 flex flex-col items-center gap-1 rounded-xl bg-slate-700 text-white py-3 hover:bg-slate-800 active:scale-95 transition-all text-center">
            <Phone size={18} />
            <span className="text-xs font-bold leading-tight">Emergencias<br />911</span>
          </a>
        </div>
      </div>

      {/* Razones para vivir */}
      {p.reasonsToLive.length > 0 && (
        <Section title="Mis razones para vivir" emoji="♥">
          <ul className="flex flex-col gap-1.5">
            {p.reasonsToLive.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-red-400 shrink-0">♥</span> {r}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Señales de advertencia */}
      <Section title="Señales de que estoy entrando en crisis" emoji="🔍">
        <ItemList items={p.warningSignals} emptyMsg="Agregá tus señales personales al editar el plan." />
      </Section>

      {/* Lo que NO debo hacer */}
      {p.dontList.length > 0 && (
        <Section title="Lo que me comprometí a NO hacer" emoji="🚫">
          <ItemList items={p.dontList} emptyMsg="" />
        </Section>
      )}

      {/* Estrategias: cuerpo */}
      <Section title="Cambiá la fisiología de tu cuerpo" emoji="🧊">
        <p className="text-xs text-muted-foreground">Usá estas estrategias en orden, hasta que funcione alguna:</p>
        <ItemList items={p.bodyStrategies} emptyMsg="Agregá estrategias al editar el plan." />
      </Section>

      {/* Estrategias: distracción */}
      <Section title="Distraete" emoji="🎵">
        <ItemList items={p.distractionStrategies} emptyMsg="Agregá estrategias al editar el plan." />
      </Section>

      {/* Estrategias: sentidos */}
      <Section title="Concentrate en tus sentidos" emoji="🌿">
        <ItemList items={p.mindfulnessStrategies} emptyMsg="Agregá estrategias al editar el plan." />
      </Section>

      {/* Contactos */}
      <Section title="Personas a las que puedo llamar" emoji="📞">
        {p.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Agregá tus contactos al editar el plan.</p>
        ) : (
          <div className="flex flex-col divide-y">
            {p.contacts.map(c => (
              <div key={c.id} className="py-2 first:pt-0 last:pb-0">
                <ContactCard name={c.name} role={c.role} phone={c.phone} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Terapeuta */}
      {(p.therapistName || p.therapistPhone) && (
        <Section title="Mi terapeuta" emoji="🧑‍⚕️">
          <ContactCard
            name={p.therapistName || 'Terapeuta'}
            role="terapeuta"
            phone={p.therapistPhone}
          />
        </Section>
      )}

      {/* Frase del PDF */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
        <p className="text-sm font-semibold text-blue-900 leading-relaxed">
          "Tolerar no es fácil, pero sí es posible.<br />
          Ya lo has hecho antes."
        </p>
      </div>

      {/* Botón editar */}
      <Link
        href="/client/crisis/edit"
        className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
      >
        <Pencil size={16} /> Editar mi plan
      </Link>
    </div>
  )
}
