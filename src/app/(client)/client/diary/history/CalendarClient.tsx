'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDiaryDates } from '../actions'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getCalendarDays(year: number, month: number): (number | null)[] {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=domingo
  // Convertir a lunes = 0
  const startOffset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Rellenar hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function CalendarClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12
  const [filledDates, setFilledDates] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  useEffect(() => {
    startTransition(async () => {
      const dates = await getDiaryDates(year, month)
      setFilledDates(new Set(dates))
    })
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const nowYear = new Date().getFullYear()
    const nowMonth = new Date().getMonth() + 1
    if (year === nowYear && month === nowMonth) return // no ir al futuro
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1

  const cells = getCalendarDays(year, month)

  return (
    <div className="flex flex-col gap-4">
      {/* Navegación mes */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </Button>
        <h2 className="text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          disabled={isCurrentMonth}
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Grilla */}
      <div
        className={`rounded-xl border bg-card p-3 transition-opacity ${
          isPending ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {/* Cabecera días */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div
              key={d}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} />
            }

            const dateStr = `${year}-${pad(month)}-${pad(day)}`
            const isFilled = filledDates.has(dateStr)
            const isToday = dateStr === today
            const isFuture = dateStr > today

            if (isFuture) {
              return (
                <div
                  key={dateStr}
                  className="flex items-center justify-center aspect-square rounded-full text-sm text-muted-foreground/40"
                >
                  {day}
                </div>
              )
            }

            return (
              <Link
                key={dateStr}
                href={`/client/diary/${dateStr}`}
                className={`
                  flex items-center justify-center aspect-square rounded-full text-sm font-medium
                  transition-colors relative
                  ${isToday
                    ? 'ring-2 ring-primary ring-offset-1'
                    : ''}
                  ${isFilled
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-muted text-foreground'}
                `}
              >
                {day}
                {isFilled && !isToday && (
                  <span className="sr-only">(con tarjeta)</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-primary" />
          <span>Con tarjeta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full border-2 border-primary" />
          <span>Hoy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-muted" />
          <span>Sin tarjeta</span>
        </div>
      </div>
    </div>
  )
}
