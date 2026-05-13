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
      const e = new Date()
      const s = new Date(e)
      s.setMonth(s.getMonth() - 3)
      return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }
    },
  },
  {
    label: 'Últimos 6 meses',
    get: () => {
      const e = new Date()
      const s = new Date(e)
      s.setMonth(s.getMonth() - 6)
      return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] }
    },
  },
  {
    label: 'Este ano',
    get: () => {
      const now = new Date()
      return {
        start: `${now.getFullYear()}-01-01`,
        end: now.toISOString().split('T')[0],
      }
    },
  },
  {
    label: 'Desde jun/25',
    get: () => ({
      start: '2025-06-01',
      end: new Date().toISOString().split('T')[0],
    }),
  },
]

export default function DateRangePicker({ start, end, onChange }: Props) {
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)

  function apply() {
    onChange(localStart, localEnd)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Presets */}
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => {
            const { start: s, end: e } = p.get()
            setLocalStart(s)
            setLocalEnd(e)
            onChange(s, e)
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
        >
          {p.label}
        </button>
      ))}

      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={apply}
          className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
