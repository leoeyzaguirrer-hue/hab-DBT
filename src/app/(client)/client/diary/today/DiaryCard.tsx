'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { DBT_SKILLS } from '@/lib/dbt/skills'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { encryptData } from '@/lib/crypto/encrypt'
import { decryptData } from '@/lib/crypto/decrypt'
import { saveDiaryCard, loadDiaryCard } from '../actions'
import { ChevronLeft, ChevronRight, Check, Circle, Save } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DiaryCardData {
  emotions: {
    tristeza: number; ira: number; miedo: number
    vergüenza: number; ansiedad: number; alegría: number; soledad: number
  }
  urges: {
    autolesion: number; suicidio: number; sustancias: number; impulsivas: number
  }
  actions: {
    autolesion: boolean; suicidio: boolean; sustancias: boolean; impulsivas: boolean
  }
  skills: string[]
  skillEffectiveness: number
  notes: string
}

const INITIAL: DiaryCardData = {
  emotions: { tristeza: 0, ira: 0, miedo: 0, vergüenza: 0, ansiedad: 0, alegría: 0, soledad: 0 },
  urges:    { autolesion: 0, suicidio: 0, sustancias: 0, impulsivas: 0 },
  actions:  { autolesion: false, suicidio: false, sustancias: false, impulsivas: false },
  skills: [], skillEffectiveness: 0, notes: '',
}

// ── Slides metadata ───────────────────────────────────────────────────────────

const SLIDES = [
  { id: 'emociones',   label: 'Emociones'  },
  { id: 'impulsos',    label: 'Impulsos'   },
  { id: 'acciones',    label: 'Acciones'   },
  { id: 'habilidades', label: 'Habilidades'},
  { id: 'notas',       label: 'Notas'      },
  { id: 'guardar',     label: 'Guardar'    },
] as const

const N = SLIDES.length

// ── Helpers visuales ──────────────────────────────────────────────────────────

const EMOTION_LABELS: [keyof DiaryCardData['emotions'], string][] = [
  ['tristeza','Tristeza'], ['ira','Ira'], ['miedo','Miedo'],
  ['vergüenza','Vergüenza'], ['ansiedad','Ansiedad'], ['alegría','Alegría'], ['soledad','Soledad'],
]
const URGE_LABELS: [keyof DiaryCardData['urges'], string][] = [
  ['autolesion','Autolesión'], ['suicidio','Conducta suicida'],
  ['sustancias','Uso de sustancias'], ['impulsivas','Conductas impulsivas'],
]
const ACTION_LABELS: [keyof DiaryCardData['actions'], string][] = [
  ['autolesion','Autolesión'], ['suicidio','Conducta suicida'],
  ['sustancias','Uso de sustancias'], ['impulsivas','Conductas impulsivas'],
]
const MODULE_COLORS: Record<string, string> = {
  Mindfulness:   'bg-blue-100   text-blue-800   border-blue-200',
  Tolerancia:    'bg-orange-100 text-orange-800 border-orange-200',
  Regulación:    'bg-green-100  text-green-800  border-green-200',
  Interpersonal: 'bg-purple-100 text-purple-800 border-purple-200',
}
const MODULE_SELECTED: Record<string, string> = {
  Mindfulness:   'bg-blue-600   text-white border-blue-600',
  Tolerancia:    'bg-orange-500 text-white border-orange-500',
  Regulación:    'bg-green-600  text-white border-green-600',
  Interpersonal: 'bg-purple-600 text-white border-purple-600',
}
const MODULES = ['Mindfulness','Tolerancia','Regulación','Interpersonal'] as const

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({ label, value, max = 10, onChange }: {
  label: string; value: number; max?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="min-w-[2rem] text-center tabular-nums text-lg font-bold text-primary">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-3">0</span>
        <Slider
          className="flex-1"
          value={[value]}
          min={0} max={max} step={1}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        />
        <span className="text-xs text-muted-foreground w-3 text-right">{max}</span>
      </div>
    </div>
  )
}

function ActionToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium pr-4">{label}</span>
      <div className="flex rounded-xl border overflow-hidden shrink-0">
        <button type="button" onClick={() => onChange(true)}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            value ? 'bg-destructive text-white' : 'bg-card text-muted-foreground hover:bg-muted'
          }`}>Sí</button>
        <button type="button" onClick={() => onChange(false)}
          className={`px-4 py-2 text-sm font-semibold border-l transition-colors ${
            !value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
          }`}>No</button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DiaryCard({ date, userId }: { date: string; userId: string }) {
  const [current, setCurrent]   = useState(0)
  const [visited, setVisited]   = useState<Set<number>>(new Set([0]))
  const [data, setData]         = useState<DiaryCardData>(INITIAL)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [loaded, setLoaded]     = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Touch swipe tracking
  const touch = useRef({ x: 0, y: 0, t: 0 })

  // ── Carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancel = false
    async function load() {
      const { encryptedData, encryptionIv } = await loadDiaryCard(date)
      if (cancel) return
      if (encryptedData && encryptionIv) {
        const key = await getOrCreateDeviceKey(userId)
        const dec = await decryptData<DiaryCardData>(encryptedData, encryptionIv, key)
        if (!cancel && dec) {
          setData(dec)
          // Marcar todas las secciones como visitadas si hay datos previos
          setVisited(new Set([0,1,2,3,4,5]))
        }
      }
      if (!cancel) setLoaded(true)
    }
    load()
    return () => { cancel = true }
  }, [date, userId])

  // ── Navegación ────────────────────────────────────────────────────────────────
  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= N) return
    setCurrent(idx)
    setVisited(prev => new Set([...prev, idx]))
    setShowHint(false)
  }, [])

  const goNext = useCallback(() => goTo(current + 1), [current, goTo])
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo])

  // ── Swipe touch ───────────────────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    const dt = Date.now() - touch.current.t
    const velocity = Math.abs(dx) / Math.max(dt, 1)
    if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 50 || velocity > 0.4)) {
      dx < 0 ? goNext() : goPrev()
    }
  }

  // ── Data helpers ──────────────────────────────────────────────────────────────
  const setEmo  = (k: keyof DiaryCardData['emotions'], v: number)  =>
    setData(p => ({ ...p, emotions: { ...p.emotions, [k]: v } }))
  const setUrge = (k: keyof DiaryCardData['urges'],    v: number)  =>
    setData(p => ({ ...p, urges:    { ...p.urges,    [k]: v } }))
  const setAct  = (k: keyof DiaryCardData['actions'],  v: boolean) =>
    setData(p => ({ ...p, actions:  { ...p.actions,  [k]: v } }))
  const toggleSkill = (code: string) =>
    setData(p => ({
      ...p, skills: p.skills.includes(code)
        ? p.skills.filter(s => s !== code)
        : [...p.skills, code],
    }))

  // ── Guardar ───────────────────────────────────────────────────────────────────
  function handleSave() {
    startTransition(async () => {
      setSaveStatus('saving')
      setErrorMsg('')
      try {
        const key = await getOrCreateDeviceKey(userId)
        const { ciphertext, iv } = await encryptData(data, key)
        const result = await saveDiaryCard(date, ciphertext, iv)
        if (result.error) { setErrorMsg(result.error); setSaveStatus('error') }
        else { setSaveStatus('saved') }
      } catch {
        setErrorMsg('Error al cifrar o guardar.')
        setSaveStatus('error')
      }
    })
  }

  // ── Indicador de completitud ──────────────────────────────────────────────────
  function slideState(i: number): 'unseen' | 'ok' | 'attention' {
    if (!visited.has(i)) return 'unseen'
    switch (i) {
      case 0: return Object.values(data.emotions).some(v => v > 0) ? 'ok' : 'attention'
      case 1: return 'ok'
      case 2: return 'ok'
      case 3: return data.skills.length > 0 ? 'ok' : 'attention'
      case 4: return 'ok'
      case 5: return saveStatus === 'saved' ? 'ok' : 'attention'
      default: return 'ok'
    }
  }

  // ── Slides content ────────────────────────────────────────────────────────────
  const slides = [
    /* 0 – Emociones */
    <div key="emociones" className="flex flex-col gap-1">
      <SlideHeader
        title="Emociones"
        subtitle="¿Cuál fue la intensidad más alta que sentiste hoy? (0 = nada, 10 = máximo)"
      />
      <p className="text-xs text-amber-600 font-medium mb-3 flex items-center gap-1">
        <span>👆</span> Deslizá el punto blanco para cambiar el número
      </p>
      <div className="flex flex-col gap-5">
        {EMOTION_LABELS.map(([k, label]) => (
          <SliderRow key={k} label={label} value={data.emotions[k]} onChange={v => setEmo(k, v)} />
        ))}
      </div>
    </div>,

    /* 1 – Impulsos */
    <div key="impulsos" className="flex flex-col gap-1">
      <SlideHeader
        title="Impulsos"
        subtitle="Intensidad del impulso, aunque no lo hayas actuado (0 = ninguno, 10 = intensísimo)"
      />
      <p className="text-xs text-amber-600 font-medium mb-3 flex items-center gap-1">
        <span>👆</span> Deslizá el punto blanco para cambiar el número
      </p>
      <div className="flex flex-col gap-5">
        {URGE_LABELS.map(([k, label]) => (
          <SliderRow key={k} label={label} value={data.urges[k]} onChange={v => setUrge(k, v)} />
        ))}
      </div>
    </div>,

    /* 2 – Acciones */
    <div key="acciones" className="flex flex-col gap-1">
      <SlideHeader
        title="Acciones"
        subtitle="¿Realizaste estas conductas hoy?"
      />
      <div className="flex flex-col divide-y mt-2">
        {ACTION_LABELS.map(([k, label]) => (
          <ActionToggle key={k} label={label} value={data.actions[k]} onChange={v => setAct(k, v)} />
        ))}
      </div>
    </div>,

    /* 3 – Habilidades */
    <div key="habilidades" className="flex flex-col gap-1">
      <SlideHeader
        title="Habilidades"
        subtitle="Tocá las habilidades que practicaste hoy"
      />
      <div className="flex flex-col gap-4 mt-2">
        {MODULES.map(mod => {
          const skills = DBT_SKILLS.filter(s => s.module === mod)
          return (
            <div key={mod}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{mod}</p>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => {
                  const sel = data.skills.includes(s.code)
                  return (
                    <button key={s.code} type="button" onClick={() => toggleSkill(s.code)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        sel ? MODULE_SELECTED[mod] : MODULE_COLORS[mod]
                      }`}>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {data.skills.length > 0 && (
        <p className="text-xs text-primary font-medium mt-3">
          ✓ {data.skills.length} habilidad{data.skills.length !== 1 ? 'es' : ''} seleccionada{data.skills.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>,

    /* 4 – Efectividad + Notas */
    <div key="notas" className="flex flex-col gap-5">
      <SlideHeader
        title="Notas del día"
        subtitle="Opcional — algo que quieras recordar o compartir con tu terapeuta"
      />
      {data.skills.length > 0 && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted">
          <p className="text-sm font-semibold">¿Cuánto te ayudaron las habilidades?</p>
          <p className="text-xs text-muted-foreground">0 = no ayudaron, 7 = ayudaron muchísimo</p>
          <SliderRow
            label="Efectividad"
            value={data.skillEffectiveness}
            max={7}
            onChange={v => setData(p => ({ ...p, skillEffectiveness: v }))}
          />
        </div>
      )}
      <Textarea
        placeholder="Escribe aquí tus notas (opcional)..."
        value={data.notes}
        onChange={e => setData(p => ({ ...p, notes: e.target.value }))}
        className="min-h-36 resize-none"
      />
    </div>,

    /* 5 – Guardar */
    <div key="guardar" className="flex flex-col gap-4">
      <SlideHeader title="Guardar tarjeta" subtitle="Revisá el resumen y guardá cuando estés lista/o" />

      {/* Resumen rápido */}
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3 text-sm">
        <SummaryRow label="Emociones" ok={Object.values(data.emotions).some(v => v > 0)}
          text={Object.values(data.emotions).some(v => v > 0)
            ? `Máximo: ${Math.max(...Object.values(data.emotions))}/10`
            : 'Todo en 0 — ¿estás segura/o?'} />
        <SummaryRow label="Impulsos"  ok={true}
          text={`Máximo: ${Math.max(...Object.values(data.urges))}/10`} />
        <SummaryRow label="Acciones"  ok={true}
          text={Object.values(data.actions).some(v => v) ? 'Hubo acciones registradas' : 'Sin acciones'} />
        <SummaryRow label="Habilidades" ok={data.skills.length > 0}
          text={data.skills.length > 0
            ? `${data.skills.length} habilidad${data.skills.length !== 1 ? 'es' : ''}`
            : 'Sin habilidades — ¿las usaste?'} />
        <SummaryRow label="Notas" ok={true}
          text={data.notes.trim() ? 'Con notas' : 'Sin notas'} />
      </div>

      {/* Error */}
      {saveStatus === 'error' && (
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
      )}

      {/* Botón */}
      {saveStatus === 'saved' ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check size={28} className="text-emerald-600" />
          </div>
          <p className="text-base font-semibold text-emerald-700">¡Tarjeta guardada!</p>
          <p className="text-xs text-muted-foreground">
            Tus datos están cifrados en este dispositivo.
          </p>
        </div>
      ) : (
        <Button onClick={handleSave} disabled={isPending} size="lg" className="w-full gap-2">
          <Save size={18} />
          {isPending ? 'Guardando...' : 'Guardar tarjeta del día'}
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">
        🔒 Se cifra en tu dispositivo antes de guardarse
      </p>
    </div>,
  ]

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Cargando...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* ── Desliza hint ── */}
      {showHint && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
          <ChevronLeft size={14} />
          <span>Deslizá entre secciones</span>
          <ChevronRight size={14} />
        </div>
      )}

      {/* ── Slide window ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ height: 'calc(100dvh - 14rem)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            width: `${N * 100}%`,
            transform: `translateX(-${(current / N) * 100}%)`,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="h-full overflow-y-auto bg-card rounded-2xl px-5 py-5"
              style={{ width: `${100 / N}%` }}
            >
              {slide}

              {/* Botones siguiente / anterior dentro del slide */}
              <div className={`flex mt-6 mb-2 ${i > 0 ? 'justify-between' : 'justify-end'}`}>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                )}
                {i < N - 1 && (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Indicador de progreso ── */}
      <div className="flex items-center justify-center gap-2 py-1">
        {SLIDES.map((s, i) => {
          const state = slideState(i)
          const isActive = i === current
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a ${s.label}`}
              className="flex flex-col items-center gap-0.5"
            >
              <div className={`
                rounded-full transition-all duration-200
                ${isActive ? 'w-6 h-2.5' : 'w-2.5 h-2.5'}
                ${state === 'unseen'    ? 'bg-slate-200'  : ''}
                ${state === 'ok'       ? 'bg-emerald-500' : ''}
                ${state === 'attention'? 'bg-red-400'      : ''}
              `} />
              {isActive && (
                <span className="text-[9px] font-semibold text-primary leading-none">
                  {s.label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function SlideHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  )
}

function SummaryRow({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        {ok
          ? <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
          : <Circle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        }
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-muted-foreground text-right text-xs">{text}</span>
    </div>
  )
}
