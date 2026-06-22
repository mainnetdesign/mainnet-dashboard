'use client'
import { useState } from 'react'
import { useTheme } from 'next-themes'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}

const PRESETS = [
  {
    label: 'Últimos 3 meses',
    get: () => {
      const e = new Date(); const s = new Date(e); s.setMonth(s.getMonth() - 3)
      return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }
    },
  },
  {
    label: 'Últimos 6 meses',
    get: () => {
      const e = new Date(); const s = new Date(e); s.setMonth(s.getMonth() - 6)
      return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }
    },
  },
  {
    label: 'Este ano',
    get: () => {
      const now = new Date()
      return { start: `${now.getFullYear()}-01-01`, end: now.toISOString().split('T')[0] }
    },
  },
  {
    label: 'Este mês',
    get: () => {
      const now = new Date()
      return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }
    },
  },
]

// Clockify free plan supports at most 6 months of history
const MIN_DATE = (() => {
  const d = new Date(); d.setMonth(d.getMonth() - 6); d.setDate(1)
  return d.toISOString().split('T')[0]
})()

export default function DateRangePicker({ start, end, onChange }: Props) {
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)
  const { theme } = useTheme()

  function apply() {
    const clampedStart = localStart < MIN_DATE ? MIN_DATE : localStart
    onChange(clampedStart, localEnd)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            const { start: s, end: e } = p.get()
            const clampedS = s < MIN_DATE ? MIN_DATE : s
            setLocalStart(clampedS); setLocalEnd(e); onChange(clampedS, e)
          }}
          className="px-3 py-1.5 text-sm border border-[var(--bd)] text-[var(--tx2)] hover:border-[var(--bd3)] hover:text-[var(--tx)] transition-colors"
        >
          {p.label}
        </button>
      ))}

      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={localStart}
          min={MIN_DATE}
          onChange={(e) => setLocalStart(e.target.value)}
          className="bg-[var(--bg3)] border border-[var(--bd)] px-3 py-1.5 text-sm text-[var(--tx)] focus:outline-none focus:border-[var(--bd3)]"
          style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
        />
        <span className="text-[var(--tx3)] text-sm">→</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="bg-[var(--bg3)] border border-[var(--bd)] px-3 py-1.5 text-sm text-[var(--tx)] focus:outline-none focus:border-[var(--bd3)]"
          style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
        />
        <button
          onClick={apply}
          className="px-4 py-1.5 text-sm font-medium bg-[var(--inv)] text-[var(--inv-tx)] hover:opacity-80 transition-opacity"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
