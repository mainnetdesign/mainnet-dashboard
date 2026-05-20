'use client'
import { useState } from 'react'

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
    label: 'Desde jun/25',
    get: () => ({ start: '2025-06-01', end: new Date().toISOString().split('T')[0] }),
  },
]

export default function DateRangePicker({ start, end, onChange }: Props) {
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)

  function apply() { onChange(localStart, localEnd) }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            const { start: s, end: e } = p.get()
            setLocalStart(s); setLocalEnd(e); onChange(s, e)
          }}
          className="px-3 py-1.5 text-sm border border-[#222222] text-[#999999] hover:border-[#444444] hover:text-white transition-colors"
        >
          {p.label}
        </button>
      ))}

      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          className="bg-[#111111] border border-[#222222] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#444444]"
          style={{ colorScheme: 'dark' }}
        />
        <span className="text-[#666666] text-sm">→</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="bg-[#111111] border border-[#222222] px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#444444]"
          style={{ colorScheme: 'dark' }}
        />
        <button
          onClick={apply}
          className="px-4 py-1.5 text-sm font-medium bg-white text-black hover:bg-[#e5e5e5] transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
