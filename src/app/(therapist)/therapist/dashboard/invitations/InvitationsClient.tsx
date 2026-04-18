'use client'

import { useState, useTransition } from 'react'
import QRCode from 'react-qr-code'
import { Copy, Check, Plus, Loader2, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type InvitationCode } from '@/types/database'
import { generateInvitationCode } from './actions'
import { formatInvitationCode } from '@/lib/utils/format'

function getCodeStatus(code: InvitationCode): 'activo' | 'usado' | 'expirado' {
  if (code.used_by) return 'usado'
  if (new Date(code.expires_at) < new Date()) return 'expirado'
  return 'activo'
}

const statusStyles = {
  activo:   'bg-green-100 text-green-800',
  usado:    'bg-slate-100 text-slate-600',
  expirado: 'bg-red-100 text-red-700',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copiar código"
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}

interface NewCodeModalProps {
  open: boolean
  onClose: () => void
  appUrl: string
}

function NewCodeModal({ open, onClose, appUrl }: NewCodeModalProps) {
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  const registerUrl = generatedCode
    ? `${appUrl}/register/client?code=${generatedCode}`
    : ''

  function handleClose() {
    setGeneratedCode(null)
    setNote('')
    setError(null)
    setShowQr(false)
    onClose()
  }

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateInvitationCode(note)
      if ('error' in result) {
        setError(result.error)
      } else {
        setGeneratedCode(result.data.code)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Generar código de invitación</DialogTitle>
          <DialogDescription>
            El código expira en 7 días y es de uso único.
          </DialogDescription>
        </DialogHeader>

        {!generatedCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nota (opcional)
              </label>
              <Input
                placeholder="Ej: Para Juan Pérez"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={100}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={handleGenerate} disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Generando...' : 'Generar código'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Código */}
            <div className="bg-muted flex items-center justify-between rounded-lg px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-widest">
                {formatInvitationCode(generatedCode)}
              </span>
              <CopyButton text={formatInvitationCode(generatedCode)} />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(registerUrl)}
              >
                <Copy size={14} className="mr-1" />
                Copiar link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowQr((v) => !v)}
              >
                <QrCode size={14} className="mr-1" />
                {showQr ? 'Ocultar QR' : 'Ver QR'}
              </Button>
            </div>

            {/* QR */}
            {showQr && (
              <div className="flex justify-center rounded-lg border p-4">
                <QRCode value={registerUrl} size={160} />
              </div>
            )}

            <p className="text-muted-foreground text-center text-xs">
              Compartí el código o el QR con tu consultante
            </p>

            <Button variant="outline" className="w-full" onClick={handleClose}>
              Listo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  codes: InvitationCode[]
  appUrl: string
}

export function InvitationsClient({ codes, appUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invitaciones</h1>
          <p className="text-muted-foreground text-sm">
            Generá códigos para que tus consultantes puedan registrarse.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" />
          Generar código
        </Button>
      </div>

      {codes.length === 0 ? (
        <div className="border-muted mt-8 rounded-lg border-2 border-dashed py-16 text-center">
          <p className="text-muted-foreground">Todavía no generaste ningún código.</p>
          <Button variant="outline" className="mt-4" onClick={() => setModalOpen(true)}>
            Generar el primero
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {codes.map((code) => {
            const status = getCodeStatus(code)
            return (
              <div
                key={code.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-semibold">
                    {formatInvitationCode(code.code)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
                    {status}
                  </span>
                  {code.notes && (
                    <span className="text-muted-foreground text-sm">{code.notes}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    Vence {new Date(code.expires_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                  {status === 'activo' && <CopyButton text={formatInvitationCode(code.code)} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NewCodeModal open={modalOpen} onClose={() => setModalOpen(false)} appUrl={appUrl} />
    </>
  )
}
