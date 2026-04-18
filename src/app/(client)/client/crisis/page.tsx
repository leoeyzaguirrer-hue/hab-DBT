import { ShieldAlert } from 'lucide-react'

export default function CrisisPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-16 text-center">
      <ShieldAlert size={48} className="text-destructive" />
      <h1 className="text-xl font-bold">Plan de crisis</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Tu plan de seguridad personalizado estará disponible aquí pronto.
      </p>
    </div>
  )
}
