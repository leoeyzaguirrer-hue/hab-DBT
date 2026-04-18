'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getOrCreateDeviceKey } from '@/lib/crypto/deviceKey'
import { encryptData } from '@/lib/crypto/encrypt'
import { decryptData } from '@/lib/crypto/decrypt'
import { saveCrisisPlanOffline, loadCrisisPlanOffline } from '@/lib/crisis/offlineStorage'
import { saveCrisisPlan, loadCrisisPlan } from '../actions'
import { DEFAULT_CRISIS_PLAN } from '@/lib/crisis/defaults'
import type { CrisisPlanContent, CrisisContact } from '@/lib/crisis/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

// ── Lista editable (strings) ──────────────────────────────────────────────────

function EditableList({
  title,
  emoji,
  items,
  placeholder,
  hint,
  onChange,
}: {
  title: string
  emoji: string
  items: string[]
  placeholder: string
  hint?: string
  onChange: (items: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setDraft('')
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted transition-colors"
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <span>{emoji}</span> {title}
          <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

          {/* Ítems existentes */}
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 text-sm bg-muted rounded-lg px-3 py-2">{item}</div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {/* Agregar nuevo */}
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-h-10 resize-none text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={add}
              disabled={!draft.trim()}
              aria-label="Agregar"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Lista de contactos ────────────────────────────────────────────────────────

function ContactsEditor({
  contacts,
  onChange,
}: {
  contacts: CrisisContact[]
  onChange: (c: CrisisContact[]) => void
}) {
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState({ name: '', role: 'amigo' as CrisisContact['role'], phone: '' })

  function add() {
    if (!draft.name.trim() || !draft.phone.trim()) return
    onChange([...contacts, { id: uid(), ...draft }])
    setDraft({ name: '', role: 'amigo', phone: '' })
  }
  function remove(id: string) {
    onChange(contacts.filter(c => c.id !== id))
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted transition-colors"
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <span>📞</span> Contactos de apoyo
          <span className="text-xs text-muted-foreground font-normal">({contacts.length})</span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Personas de confianza a las que podés llamar en una crisis.
          </p>

          {contacts.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <div className="flex-1 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role} · {c.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="p-1 text-muted-foreground hover:text-destructive"
                aria-label="Eliminar contacto"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {/* Agregar contacto */}
          <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed">
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Nombre"
              className="text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring"
            />
            <div className="flex gap-2">
              <select
                value={draft.role}
                onChange={e => setDraft(d => ({ ...d, role: e.target.value as CrisisContact['role'] }))}
                className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring"
              >
                <option value="familiar">Familiar</option>
                <option value="amigo">Amigo/a</option>
                <option value="otro">Otro</option>
              </select>
              <input
                type="tel"
                value={draft.phone}
                onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))}
                placeholder="Teléfono"
                className="flex-1 text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={add}
              disabled={!draft.name.trim() || !draft.phone.trim()}
              className="w-full gap-1"
            >
              <Plus size={14} /> Agregar contacto
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Editor de terapeuta ───────────────────────────────────────────────────────

function TherapistEditor({
  name,
  phone,
  onChangeName,
  onChangePhone,
}: {
  name: string
  phone: string
  onChangeName: (v: string) => void
  onChangePhone: (v: string) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted transition-colors"
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <span>🧑‍⚕️</span> Mi terapeuta
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <input
            type="text"
            value={name}
            onChange={e => onChangeName(e.target.value)}
            placeholder="Nombre del terapeuta"
            className="text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring w-full"
          />
          <input
            type="tel"
            value={phone}
            onChange={e => onChangePhone(e.target.value)}
            placeholder="Teléfono (+591 ...)"
            className="text-sm rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring w-full"
          />
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CrisisPlanEditor({ userId }: { userId: string }) {
  const [plan, setPlan] = useState<CrisisPlanContent>(DEFAULT_CRISIS_PLAN)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  // Cargar plan existente
  useEffect(() => {
    let cancelled = false
    async function load() {
      // Offline first
      const offline = await loadCrisisPlanOffline(userId)
      if (!cancelled && offline) setPlan(offline)

      // Sincronizar con servidor
      try {
        const { encryptedData, encryptionIv } = await loadCrisisPlan()
        if (cancelled) return
        if (encryptedData && encryptionIv) {
          const key = await getOrCreateDeviceKey(userId)
          const dec = await decryptData<CrisisPlanContent>(encryptedData, encryptionIv, key)
          if (!cancelled && dec) setPlan(dec)
        }
      } catch { /* sin internet, usar offline */ }

      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  // Guardar
  function handleSave() {
    startTransition(async () => {
      setSaveStatus('saving')
      setErrorMsg('')
      try {
        const key = await getOrCreateDeviceKey(userId)
        const { ciphertext, iv } = await encryptData(plan, key)
        const result = await saveCrisisPlan(ciphertext, iv)
        if (result.error) {
          setErrorMsg(result.error)
          setSaveStatus('error')
        } else {
          await saveCrisisPlanOffline(userId, plan)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 3000)
        }
      } catch {
        setErrorMsg('Error al cifrar o guardar.')
        setSaveStatus('error')
      }
    })
  }

  const set = <K extends keyof CrisisPlanContent>(key: K, value: CrisisPlanContent[K]) =>
    setPlan(p => ({ ...p, [key]: value }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando tu plan...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
        <strong>Tu plan es privado.</strong> Se cifra en este dispositivo antes de guardarse. Tu terapeuta solo puede verlo si vos decidís compartirlo.
      </div>

      <EditableList
        title="Razones para vivir"
        emoji="♥"
        items={plan.reasonsToLive}
        placeholder="Ej: Mi familia, mi perro, quiero viajar..."
        hint="Lo más personal e importante. Estas razones aparecen primero en el wizard."
        onChange={v => set('reasonsToLive', v)}
      />

      <EditableList
        title="Señales de advertencia"
        emoji="🔍"
        items={plan.warningSignals}
        placeholder="Ej: No dormí bien, discutí con alguien..."
        hint="¿Cómo sabés que estás entrando en una crisis?"
        onChange={v => set('warningSignals', v)}
      />

      <EditableList
        title="Mis compromisos con la vida"
        emoji="◆"
        items={plan.commitments}
        placeholder="Ej: Me comprometo a pedir ayuda antes de actuar..."
        onChange={v => set('commitments', v)}
      />

      <EditableList
        title="Lo que NO debo hacer en crisis"
        emoji="🚫"
        items={plan.dontList}
        placeholder="Ej: No quedarme sola en casa, no tomar decisiones importantes..."
        onChange={v => set('dontList', v)}
      />

      <EditableList
        title="Estrategias: cambiar la fisiología"
        emoji="🧊"
        items={plan.bodyStrategies}
        placeholder="Ej: Agua fría en la cara, apretar hielo..."
        hint="Cambios físicos que regulan las emociones intensas (TIPP)."
        onChange={v => set('bodyStrategies', v)}
      />

      <EditableList
        title="Estrategias: distraerse"
        emoji="🎵"
        items={plan.distractionStrategies}
        placeholder="Ej: Poner música fuerte, caminar, ver videos..."
        onChange={v => set('distractionStrategies', v)}
      />

      <EditableList
        title="Estrategias: sentidos (Mindfulness)"
        emoji="🌿"
        items={plan.mindfulnessStrategies}
        placeholder="Ej: Observar las nubes, escuchar el ambiente..."
        onChange={v => set('mindfulnessStrategies', v)}
      />

      <ContactsEditor contacts={plan.contacts} onChange={v => set('contacts', v)} />

      <TherapistEditor
        name={plan.therapistName}
        phone={plan.therapistPhone}
        onChangeName={v => set('therapistName', v)}
        onChangePhone={v => set('therapistPhone', v)}
      />

      {/* Notas */}
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-2">
        <p className="font-semibold text-sm flex items-center gap-2">
          <span>📝</span> Notas adicionales
        </p>
        <Textarea
          value={plan.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Cualquier cosa importante para vos..."
          className="min-h-20 resize-none text-sm"
        />
      </div>

      {/* Guardar */}
      <div className="flex flex-col gap-2 sticky bottom-20 z-10">
        {saveStatus === 'error' && (
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
        )}
        <Button
          onClick={handleSave}
          disabled={isPending}
          size="lg"
          className="w-full gap-2 shadow-lg"
        >
          {saveStatus === 'saving' ? (
            <><Loader2 size={16} className="animate-spin" /> Guardando...</>
          ) : saveStatus === 'saved' ? (
            <><Check size={16} /> Guardado</>
          ) : (
            '💾 Guardar mi plan'
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          🔒 Se cifra en este dispositivo antes de guardarse
        </p>
      </div>
    </div>
  )
}
