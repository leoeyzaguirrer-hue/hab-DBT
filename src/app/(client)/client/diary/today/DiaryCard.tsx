'use client'

import { useState, useEffect, useTransition } from 'react'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DBT_SKILLS } from '@/lib/dbt/skills'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { encryptData } from '@/lib/crypto/encrypt'
import { decryptData } from '@/lib/crypto/decrypt'
import { saveDiaryCard, loadDiaryCard } from '../actions'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DiaryCardData {
  emotions: {
    tristeza: number
    ira: number
    miedo: number
    vergüenza: number
    ansiedad: number
    alegría: number
    soledad: number
  }
  urges: {
    autolesion: number
    suicidio: number
    sustancias: number
    impulsivas: number
  }
  actions: {
    autolesion: boolean
    suicidio: boolean
    sustancias: boolean
    impulsivas: boolean
  }
  skills: string[]
  skillEffectiveness: number
  notes: string
}

const INITIAL_DATA: DiaryCardData = {
  emotions: {
    tristeza: 0,
    ira: 0,
    miedo: 0,
    vergüenza: 0,
    ansiedad: 0,
    alegría: 0,
    soledad: 0,
  },
  urges: {
    autolesion: 0,
    suicidio: 0,
    sustancias: 0,
    impulsivas: 0,
  },
  actions: {
    autolesion: false,
    suicidio: false,
    sustancias: false,
    impulsivas: false,
  },
  skills: [],
  skillEffectiveness: 0,
  notes: '',
}

// ── Labels legibles ───────────────────────────────────────────────────────────

const EMOTION_LABELS: Record<string, string> = {
  tristeza: 'Tristeza',
  ira: 'Ira',
  miedo: 'Miedo',
  vergüenza: 'Vergüenza',
  ansiedad: 'Ansiedad',
  alegría: 'Alegría',
  soledad: 'Soledad',
}

const URGE_LABELS: Record<string, string> = {
  autolesion: 'Autolesión',
  suicidio: 'Conducta suicida',
  sustancias: 'Uso de sustancias',
  impulsivas: 'Conductas impulsivas',
}

const MODULE_COLORS: Record<string, string> = {
  Mindfulness: 'bg-blue-100 text-blue-800 border-blue-200',
  Tolerancia: 'bg-orange-100 text-orange-800 border-orange-200',
  Regulación: 'bg-green-100 text-green-800 border-green-200',
  Interpersonal: 'bg-purple-100 text-purple-800 border-purple-200',
}

const MODULE_SELECTED: Record<string, string> = {
  Mindfulness: 'bg-blue-600 text-white border-blue-600',
  Tolerancia: 'bg-orange-500 text-white border-orange-500',
  Regulación: 'bg-green-600 text-white border-green-600',
  Interpersonal: 'bg-purple-600 text-white border-purple-600',
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  max = 10,
  onChange,
}: {
  label: string
  value: number
  max?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="w-6 text-center tabular-nums font-semibold text-primary">
          {value}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>0</span>
        <Slider
          className="flex-1"
          value={[value]}
          min={0}
          max={max}
          step={1}
          onValueChange={(vals) => onChange(Array.isArray(vals) ? vals[0] : vals)}
        />
        <span>{max}</span>
      </div>
    </div>
  )
}

function ActionToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 transition-colors ${
            value
              ? 'bg-destructive text-white'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 transition-colors border-l ${
            !value
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          No
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function DiaryCard({
  date,
  userId,
}: {
  date: string
  userId: string
}) {
  const [data, setData] = useState<DiaryCardData>(INITIAL_DATA)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // Cargar tarjeta existente al montar
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { encryptedData, encryptionIv, error } = await loadDiaryCard(date)
        if (cancelled) return

        if (error) {
          setStatus('idle')
          return
        }

        if (encryptedData && encryptionIv) {
          const key = await getOrCreateDeviceKey(userId)
          const decrypted = await decryptData<DiaryCardData>(encryptedData, encryptionIv, key)
          if (!cancelled && decrypted) {
            setData(decrypted)
          }
        }
      } catch {
        // Si falla la carga, empezar con datos vacíos
      } finally {
        if (!cancelled) setStatus('idle')
      }
    }

    load()
    return () => { cancelled = true }
  }, [date, userId])

  // Helpers de actualización de estado
  function setEmotion(key: keyof DiaryCardData['emotions'], val: number) {
    setData(prev => ({ ...prev, emotions: { ...prev.emotions, [key]: val } }))
  }
  function setUrge(key: keyof DiaryCardData['urges'], val: number) {
    setData(prev => ({ ...prev, urges: { ...prev.urges, [key]: val } }))
  }
  function setAction(key: keyof DiaryCardData['actions'], val: boolean) {
    setData(prev => ({ ...prev, actions: { ...prev.actions, [key]: val } }))
  }
  function toggleSkill(code: string) {
    setData(prev => ({
      ...prev,
      skills: prev.skills.includes(code)
        ? prev.skills.filter(s => s !== code)
        : [...prev.skills, code],
    }))
  }

  // Guardar
  function handleSave() {
    startTransition(async () => {
      setStatus('loading')
      setErrorMsg('')
      try {
        const key = await getOrCreateDeviceKey(userId)
        const { ciphertext, iv } = await encryptData(data, key)
        const result = await saveDiaryCard(date, ciphertext, iv)
        if (result.error) {
          setErrorMsg(result.error)
          setStatus('error')
        } else {
          setStatus('saved')
          setTimeout(() => setStatus('idle'), 2500)
        }
      } catch {
        setErrorMsg('Error al cifrar o guardar la tarjeta.')
        setStatus('error')
      }
    })
  }

  // Agrupar habilidades por módulo
  const modules = ['Mindfulness', 'Tolerancia', 'Regulación', 'Interpersonal'] as const

  const isLoading = status === 'loading' && !isPending

  return (
    <div className="flex flex-col gap-4">
      {/* ── Emociones ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Emociones del día</CardTitle>
          <p className="text-xs text-muted-foreground">
            Intensidad más alta que experimentaste hoy (0 = nada, 10 = máximo)
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Object.entries(EMOTION_LABELS).map(([key, label]) => (
            <SliderRow
              key={key}
              label={label}
              value={data.emotions[key as keyof DiaryCardData['emotions']]}
              onChange={(v) => setEmotion(key as keyof DiaryCardData['emotions'], v)}
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Urges ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Impulsos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Intensidad del impulso (0 = ninguno, 10 = intensísimo)
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {Object.entries(URGE_LABELS).map(([key, label]) => (
            <SliderRow
              key={key}
              label={label}
              value={data.urges[key as keyof DiaryCardData['urges']]}
              onChange={(v) => setUrge(key as keyof DiaryCardData['urges'], v)}
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Acciones ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acciones tomadas</CardTitle>
          <p className="text-xs text-muted-foreground">
            ¿Realizaste estas conductas hoy?
          </p>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {Object.entries(URGE_LABELS).map(([key, label]) => (
            <ActionToggle
              key={key}
              label={label}
              value={data.actions[key as keyof DiaryCardData['actions']]}
              onChange={(v) => setAction(key as keyof DiaryCardData['actions'], v)}
            />
          ))}
        </CardContent>
      </Card>

      {/* ── Habilidades DBT ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Habilidades usadas</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tocá las habilidades que practicaste hoy
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {modules.map(module => {
            const skillsInModule = DBT_SKILLS.filter(s => s.module === module)
            return (
              <div key={module}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {module}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {skillsInModule.map(skill => {
                    const selected = data.skills.includes(skill.code)
                    return (
                      <button
                        key={skill.code}
                        type="button"
                        onClick={() => toggleSkill(skill.code)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? MODULE_SELECTED[module]
                            : MODULE_COLORS[module]
                        }`}
                      >
                        {skill.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {data.skills.length > 0 && (
            <div className="mt-2 flex flex-col gap-3 border-t pt-3">
              <SliderRow
                label="Efectividad de las habilidades"
                value={data.skillEffectiveness}
                max={7}
                onChange={(v) =>
                  setData(prev => ({ ...prev, skillEffectiveness: v }))
                }
              />
              <p className="text-xs text-muted-foreground -mt-1">
                0 = no ayudaron, 7 = ayudaron muchísimo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Notas ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notas del día</CardTitle>
          <p className="text-xs text-muted-foreground">
            Algo que quieras recordar o compartir con tu terapeuta
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escribe aquí tus notas..."
            value={data.notes}
            onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))}
            className="min-h-28 resize-none"
          />
        </CardContent>
      </Card>

      {/* ── Guardar ── */}
      <div className="flex flex-col gap-2 pb-2">
        {status === 'error' && (
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
        )}
        {status === 'saved' && (
          <p className="text-sm text-green-600 text-center font-medium">
            ✓ Tarjeta guardada
          </p>
        )}
        <Button
          onClick={handleSave}
          disabled={isPending || isLoading}
          size="lg"
          className="w-full"
        >
          {isPending ? 'Guardando...' : 'Guardar tarjeta del día'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Tus datos se cifran en este dispositivo antes de guardarse.
        </p>
      </div>
    </div>
  )
}
