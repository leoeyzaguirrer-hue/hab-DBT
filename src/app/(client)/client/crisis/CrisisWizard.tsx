'use client'

/**
 * Wizard del plan de crisis — sigue la estructura del PDF clínico
 * "MI PLAN DE CRISIS" (DBT - Linehan).
 *
 * Pasos:
 * 0. Intro / calma
 * 1. Reconocé las señales de advertencia
 * 2. Tu seguridad primero
 * 3. Cambiá la fisiología de tu cuerpo
 * 4. Distraete
 * 5. Venite a tus sentidos (Mindfulness)
 * 6. Llamá a alguien
 * 7. Ayuda de urgencia
 */

import { useState, useTransition } from 'react'
import { Phone, ChevronRight, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CrisisPlanContent } from '@/lib/crisis/types'
import { updateCrisisActivation } from './actions'

// ── Constantes ────────────────────────────────────────────────────────────────

const BOLIVIA_CRISIS_LINE = '800140090'
const EMERGENCY_NUMBER    = '911'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface WizardStep {
  id: string
  emoji: string
  title: string
  validation: string   // texto validante, sin juicios
  content: (plan: CrisisPlanContent) => React.ReactNode
}

// ── Paso: Tarjeta de ítem marcable ────────────────────────────────────────────

function CheckItem({
  text,
  checked,
  onToggle,
}: {
  text: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
        checked
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-card border-border hover:bg-muted'
      }`}
    >
      <CheckCircle2
        size={20}
        className={`shrink-0 mt-0.5 ${checked ? 'text-emerald-500' : 'text-muted-foreground/30'}`}
      />
      <span className="text-sm leading-relaxed">{text}</span>
    </button>
  )
}

function ContactCard({ name, role, phone }: { name: string; role: string; phone: string }) {
  const roleLabel = { familiar: 'Familiar', amigo: 'Amigo/a', otro: 'Contacto' }[role as 'familiar' | 'amigo' | 'otro'] ?? role
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-card">
      <div>
        <p className="font-semibold text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
      </div>
      <a
        href={`tel:${phone.replace(/\D/g, '')}`}
        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Phone size={15} />
        Llamar
      </a>
    </div>
  )
}

function EmergencyCallBar() {
  return (
    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-dashed border-red-200">
      <p className="text-xs text-muted-foreground text-center">Ayuda de urgencia siempre disponible</p>
      <div className="flex gap-2">
        <a
          href={`tel:${BOLIVIA_CRISIS_LINE}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white py-3 text-xs font-bold hover:bg-red-700 active:scale-95 transition-all"
        >
          <Phone size={14} />
          Línea de crisis<br/>800-14-0090
        </a>
        <a
          href={`tel:${EMERGENCY_NUMBER}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 text-white py-3 text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Phone size={14} />
          Emergencias<br/>911
        </a>
      </div>
    </div>
  )
}

// ── Definición de los pasos ───────────────────────────────────────────────────

function buildSteps(plan: CrisisPlanContent): WizardStep[] {
  return [
    {
      id: 'intro',
      emoji: '💙',
      title: 'Estás pasando un momento muy difícil',
      validation: 'Lo que sentís es real. No tenés que manejarlo perfectamente. Solo seguí este plan, un paso a la vez.',
      content: () => (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm font-semibold text-blue-900 text-center leading-relaxed">
              "Tolerar no es fácil, pero sí es posible.<br />
              Ya lo has hecho antes."
            </p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Este plan tiene {plan.contacts.length > 0 ? 'tus contactos y ' : ''}
            estrategias que funcionan para vos.
            Seguí los pasos con calma.
          </p>
          {plan.reasonsToLive.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Tus razones para vivir</p>
              <ul className="flex flex-col gap-1">
                {plan.reasonsToLive.map((r, i) => (
                  <li key={i} className="text-sm text-amber-900 flex items-start gap-2">
                    <span className="text-amber-400 shrink-0">♥</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'signals',
      emoji: '🔍',
      title: 'Reconocé lo que está pasando',
      validation: 'Notar las señales de advertencia es el primer paso. Tu mente está intentando protegerte.',
      content: (p) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">¿Cuál de esto reconocés ahora? (podés marcarlos)</p>
          <CheckableList items={p.warningSignals} />
        </div>
      ),
    },
    {
      id: 'safety',
      emoji: '🛡️',
      title: 'Tu seguridad primero',
      validation: 'Antes de hacer cualquier otra cosa, necesitás estar en un lugar seguro. Eso no es debilidad — es cuidarte.',
      content: (p) => (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800">
              Alejate de objetos que puedan hacerte daño:
            </p>
            <p className="text-sm text-red-700 mt-1">
              tijeras, cuchillos, vidrios, medicamentos, cualquier cosa con la que puedas lastimarte a vos misma/o o a otros.
            </p>
          </div>
          {p.commitments.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Leé tus compromisos con la vida:</p>
              {p.commitments.map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted text-sm">
                  <span className="text-blue-500 shrink-0">◆</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          {p.dontList.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-red-700">Lo que me comprometí a NO hacer:</p>
              {p.dontList.map((d, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 text-sm text-red-800">
                  <X size={14} className="shrink-0 mt-0.5" /> {d}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'body',
      emoji: '🧊',
      title: 'Cambiá la fisiología de tu cuerpo',
      validation: 'Las emociones muy intensas cambian cuando cambiamos el cuerpo. No tenés que sentirlo — solo hacerlo. Probá uno a la vez hasta que algo funcione.',
      content: (p) => (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-amber-600 font-medium">
            Usá estas estrategias en orden hasta que alguna funcione:
          </p>
          <CheckableList items={p.bodyStrategies} />
        </div>
      ),
    },
    {
      id: 'distract',
      emoji: '🎵',
      title: 'Distraete un momento',
      validation: 'Darte un descanso mental no es evitar el problema — es darte tiempo para que la emoción baje antes de tomar decisiones. Eso es muy inteligente.',
      content: (p) => (
        <div className="flex flex-col gap-2">
          <CheckableList items={p.distractionStrategies} />
        </div>
      ),
    },
    {
      id: 'senses',
      emoji: '🌿',
      title: 'Venite a este momento',
      validation: 'Las emociones intensas llevan la mente al pasado o al futuro. Tus sentidos te traen al ahora, que es el único momento que podés manejar.',
      content: (p) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Concentrate en tus sentidos, uno a la vez:</p>
          <CheckableList items={p.mindfulnessStrategies} />
        </div>
      ),
    },
    {
      id: 'contacts',
      emoji: '📞',
      title: 'No tenés que estar sola/solo',
      validation: 'Pedir ayuda es una habilidad, no una debilidad. La gente en tu lista QUIERE que la llames.',
      content: (p) => (
        <div className="flex flex-col gap-3">
          {p.contacts.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Llamá a la primera persona disponible. No termines la llamada. Si se corta, llamala de nuevo.
              </p>
              {p.contacts.map((c) => (
                <ContactCard key={c.id} name={c.name} role={c.role} phone={c.phone} />
              ))}
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <p className="text-sm text-amber-800 font-medium">Todavía no cargaste tus contactos.</p>
              <p className="text-xs text-amber-700 mt-1">
                Editá tu plan de crisis para agregar personas de confianza.
              </p>
            </div>
          )}
          {p.therapistName && (
            <div className="mt-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                Tu terapeuta
              </p>
              <ContactCard
                name={p.therapistName}
                role="terapeuta"
                phone={p.therapistPhone}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'emergency',
      emoji: '🚨',
      title: 'Si el peligro es inmediato',
      validation: 'Llegaste hasta acá. Eso muestra que parte de vos quiere seguir adelante. Ahora necesitás apoyo profesional de urgencia.',
      content: (p) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Llamá ahora y no cuelgues. Contá tu estado, lo que hiciste hasta ahora y los pasos que seguiste. Permanecé en la línea hasta que llegue la ayuda.
          </p>

          <a
            href={`tel:${BOLIVIA_CRISIS_LINE}`}
            className="flex items-center justify-between p-4 rounded-xl bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all"
          >
            <div>
              <p className="font-bold text-base">Línea de crisis — Bolivia</p>
              <p className="text-sm opacity-90">800-14-0090 · Gratuita · 24h</p>
            </div>
            <Phone size={28} />
          </a>

          <a
            href={`tel:${EMERGENCY_NUMBER}`}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-700 text-white hover:bg-slate-800 active:scale-95 transition-all"
          >
            <div>
              <p className="font-bold text-base">Emergencias generales</p>
              <p className="text-sm opacity-90">911 · Siempre disponible</p>
            </div>
            <Phone size={28} />
          </a>

          {p.therapistName && p.therapistPhone && (
            <ContactCard
              name={`${p.therapistName} (terapeuta)`}
              role="terapeuta"
              phone={p.therapistPhone}
            />
          )}

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mt-2">
            <p className="text-sm font-semibold text-blue-900 text-center">
              "Tolerar no es fácil, pero sí es posible.<br />
              Ya lo has hecho antes. Podés lograrlo de nuevo."
            </p>
          </div>
        </div>
      ),
    },
  ]
}

// ── Helper: lista de ítems marcables con estado local ─────────────────────────

function CheckableList({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set())
  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        (Esta sección está vacía — editá tu plan para personalizarla)
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <CheckItem key={i} text={item} checked={checked.has(i)} onToggle={() => toggle(i)} />
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CrisisWizard({
  plan,
  activationId,
  onFinish,
}: {
  plan: CrisisPlanContent
  activationId?: string
  onFinish: () => void
}) {
  const steps = buildSteps(plan)
  const [current, setCurrent] = useState(0)
  const [usedSteps, setUsedSteps] = useState<number[]>([])
  const [, startTransition] = useTransition()

  const isLast = current === steps.length - 1
  const step   = steps[current]

  function handleNext() {
    const newUsed = [...usedSteps, current]
    setUsedSteps(newUsed)

    if (isLast) {
      // Registrar resolución
      startTransition(async () => {
        if (activationId) {
          await updateCrisisActivation(activationId, newUsed, true)
        }
        onFinish()
      })
    } else {
      setCurrent(c => c + 1)
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-10rem)]">
      {/* Barra de progreso */}
      <div className="flex gap-1 mb-4">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < current  ? 'bg-emerald-500' :
              i === current ? 'bg-primary'    : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Paso actual */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">
        {/* Encabezado */}
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{step.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Paso {current + 1} de {steps.length}
            </p>
            <h2 className="text-xl font-bold leading-tight mt-0.5">{step.title}</h2>
          </div>
        </div>

        {/* Texto validante */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm text-blue-900 leading-relaxed italic">"{step.validation}"</p>
        </div>

        {/* Contenido del paso */}
        <div className="flex flex-col gap-2">
          {step.content(plan)}
        </div>

        {/* Línea de crisis siempre visible */}
        <EmergencyCallBar />
      </div>

      {/* Botón de avance */}
      <div className="pt-3 pb-1">
        <Button
          onClick={handleNext}
          size="lg"
          className="w-full gap-2"
        >
          {isLast ? '✓ Terminé, estoy mejor' : (
            <>
              {current === 0 ? 'Empezar' : 'Lo intenté, siguiente paso'}
              <ChevronRight size={18} />
            </>
          )}
        </Button>

        {current > 0 && (
          <button
            type="button"
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            className="w-full text-center text-xs text-muted-foreground mt-2 py-1 hover:text-foreground transition-colors"
          >
            ← Volver al paso anterior
          </button>
        )}
      </div>
    </div>
  )
}
