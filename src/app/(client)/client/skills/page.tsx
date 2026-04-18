import { BookOpen } from 'lucide-react'
import { DBT_SKILLS } from '@/lib/dbt/skills'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MODULES = ['Mindfulness', 'Tolerancia', 'Regulación', 'Interpersonal'] as const

const MODULE_DESC: Record<string, string> = {
  Mindfulness: 'Observar, describir y participar sin juzgar',
  Tolerancia: 'Sobrevivir crisis sin empeorar la situación',
  Regulación: 'Entender y cambiar emociones intensas',
  Interpersonal: 'Relaciones efectivas y cuidado del respeto propio',
}

export default function SkillsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Habilidades DBT</h1>
        <p className="text-sm text-muted-foreground">
          Referencia rápida de las habilidades que practicas
        </p>
      </div>

      {MODULES.map(module => {
        const skills = DBT_SKILLS.filter(s => s.module === module)
        return (
          <Card key={module}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{module}</CardTitle>
              <p className="text-xs text-muted-foreground">{MODULE_DESC[module]}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <span
                    key={skill.code}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                  >
                    {skill.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <p className="text-center text-xs text-muted-foreground pb-2">
        Más contenido sobre cada habilidad próximamente.
      </p>
    </div>
  )
}
