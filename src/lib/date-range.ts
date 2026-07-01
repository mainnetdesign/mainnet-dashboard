import {
  addMonths,
  format,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subHours,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type DateRangePresetId =
  | '24h'
  | '7d'
  | '30d'
  | '3m'
  | '12m'
  | 'mtd'
  | 'qtd'
  | 'ytd'
  | 'all'

export type DateRangePreset = {
  id: DateRangePresetId
  label: string
  shortcut: string
  get: (minDate: string) => { start: string; end: string }
}

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function clampStart(start: string, minDate: string): string {
  return start < minDate ? minDate : start
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    id: '24h',
    label: 'Últimas 24 horas',
    shortcut: 'D',
    get: () => {
      const end = new Date()
      const start = subHours(end, 24)
      return { start: toDateStr(start), end: toDateStr(end) }
    },
  },
  {
    id: '7d',
    label: 'Últimos 7 dias',
    shortcut: 'W',
    get: () => {
      const end = new Date()
      const start = subDays(end, 6)
      return { start: toDateStr(start), end: toDateStr(end) }
    },
  },
  {
    id: '30d',
    label: 'Últimos 30 dias',
    shortcut: 'T',
    get: () => {
      const end = new Date()
      const start = subDays(end, 29)
      return { start: toDateStr(start), end: toDateStr(end) }
    },
  },
  {
    id: '3m',
    label: 'Últimos 3 meses',
    shortcut: '3',
    get: (minDate) => {
      const end = new Date()
      const start = subMonths(end, 3)
      return { start: clampStart(toDateStr(start), minDate), end: toDateStr(end) }
    },
  },
  {
    id: '12m',
    label: 'Últimos 12 meses',
    shortcut: 'L',
    get: (minDate) => {
      const end = new Date()
      const start = subMonths(end, 12)
      return { start: clampStart(toDateStr(start), minDate), end: toDateStr(end) }
    },
  },
  {
    id: 'mtd',
    label: 'Mês até hoje',
    shortcut: 'M',
    get: (minDate) => {
      const now = new Date()
      return { start: clampStart(toDateStr(startOfMonth(now)), minDate), end: toDateStr(now) }
    },
  },
  {
    id: 'qtd',
    label: 'Trimestre até hoje',
    shortcut: 'Q',
    get: (minDate) => {
      const now = new Date()
      return { start: clampStart(toDateStr(startOfQuarter(now)), minDate), end: toDateStr(now) }
    },
  },
  {
    id: 'ytd',
    label: 'Ano até hoje',
    shortcut: 'Y',
    get: (minDate) => {
      const now = new Date()
      return { start: clampStart(toDateStr(startOfYear(now)), minDate), end: toDateStr(now) }
    },
  },
  {
    id: 'all',
    label: 'Todo o período',
    shortcut: 'A',
    get: (minDate) => ({ start: minDate, end: toDateStr(new Date()) }),
  },
]

export function matchPreset(start: string, end: string, minDate: string): DateRangePreset | null {
  for (const preset of DATE_RANGE_PRESETS) {
    const range = preset.get(minDate)
    if (range.start === start && range.end === end) return preset
  }
  return null
}

export function formatRangeLabel(start: string, end: string, minDate: string): string {
  const preset = matchPreset(start, end, minDate)
  if (preset) return preset.label

  const s = parseISO(start)
  const e = parseISO(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()

  if (sameMonth) {
    return `${format(s, 'd', { locale: ptBR })} – ${format(e, 'd MMM yyyy', { locale: ptBR })}`
  }
  if (sameYear) {
    return `${format(s, 'd MMM', { locale: ptBR })} – ${format(e, 'd MMM yyyy', { locale: ptBR })}`
  }
  return `${format(s, 'd MMM yyyy', { locale: ptBR })} – ${format(e, 'd MMM yyyy', { locale: ptBR })}`
}

export function formatMonthYear(d: Date): string {
  const raw = format(d, 'MMMM yyyy', { locale: ptBR })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

/** Clockify free plan supports at most 6 months of history */
export const CLOCKIFY_MIN_DATE = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 6)
  d.setDate(1)
  return toDateStr(d)
})()
