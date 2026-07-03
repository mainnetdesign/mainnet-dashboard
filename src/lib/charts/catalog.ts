// Chart builder — metric catalog (shared client/server).
// The catalog is the whitelist: only measures/dimensions defined here can be
// queried. The server maps them to hardcoded SQL (see chart-query.ts), so no
// user input ever reaches SQL directly.

export type Unit = 'count' | 'usd'

export type Measure = {
  id: string
  label: string
  unit: Unit
  // which dimensions this measure can be grouped by
  dimensions: string[]
}

export type Dimension = {
  id: string
  label: string
}

export const DIMENSIONS: Record<string, Dimension> = {
  time: { id: 'time', label: 'Tempo (dia)' },
  platform: { id: 'platform', label: 'Plataforma' },
  plan_tier: { id: 'plan_tier', label: 'Plano' },
  job_status: { id: 'job_status', label: 'Status do job' },
  event_name: { id: 'event_name', label: 'Evento' },
  verified: { id: 'verified', label: 'Verificado' },
  has_import: { id: 'has_import', label: 'Fez import?' },
}

export const MEASURES: Record<string, Measure> = {
  jobs: {
    id: 'jobs',
    label: 'Importações (jobs)',
    unit: 'count',
    dimensions: ['time', 'platform', 'job_status'],
  },
  images: {
    id: 'images',
    label: 'Imagens importadas',
    unit: 'count',
    dimensions: ['time'],
  },
  users: {
    id: 'users',
    label: 'Usuários',
    unit: 'count',
    dimensions: ['time', 'plan_tier', 'verified', 'has_import'],
  },
  events: {
    id: 'events',
    label: 'Eventos',
    unit: 'count',
    dimensions: ['time', 'platform', 'plan_tier', 'event_name'],
  },
}

// Which measures each page's builder offers.
export const PAGE_MEASURES: Record<string, string[]> = {
  overview: ['jobs', 'images', 'users'],
  users: ['users', 'jobs'],
  earnings: ['jobs', 'images'],
  analytics: ['events', 'jobs'],
}

export function measuresForPage(page: string): Measure[] {
  return (PAGE_MEASURES[page] ?? Object.keys(MEASURES)).map((id) => MEASURES[id])
}

// Two measures can share a chart only if same unit.
export function sameUnit(measureIds: string[]): boolean {
  const units = new Set(measureIds.map((id) => MEASURES[id]?.unit))
  return units.size <= 1
}

// Dimensions valid for a set of measures = intersection of each measure's dims.
export function commonDimensions(measureIds: string[]): Dimension[] {
  if (measureIds.length === 0) return []
  let ids = MEASURES[measureIds[0]]?.dimensions ?? []
  for (const m of measureIds.slice(1)) {
    const d = new Set(MEASURES[m]?.dimensions ?? [])
    ids = ids.filter((x) => d.has(x))
  }
  return ids.map((id) => DIMENSIONS[id])
}

// Series colors are restricted to DS state tokens (theme-aware CSS vars).
// The stored `color` is the var() string so recharts can consume it directly.
export const STATE_COLORS: { label: string; value: string }[] = [
  { label: 'Feature', value: 'var(--color-feature-base)' },
  { label: 'Information', value: 'var(--color-information-base)' },
  { label: 'Success', value: 'var(--color-success-base)' },
  { label: 'Away', value: 'var(--color-away-base)' },
  { label: 'Warning', value: 'var(--color-warning-base)' },
  { label: 'Error', value: 'var(--color-error-base)' },
  { label: 'Verified', value: 'var(--color-verified-base)' },
  { label: 'Highlighted', value: 'var(--color-highlighted-base)' },
  { label: 'Faded', value: 'var(--color-faded-base)' },
]

export const SERIES_PALETTE = STATE_COLORS.map((c) => c.value)
