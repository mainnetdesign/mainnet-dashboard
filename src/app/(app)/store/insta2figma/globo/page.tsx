'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import GlobeView, { type GlobeMode } from '@/components/store/GlobeView'
import type { GlobeData } from '@/types/insta2figma'
import { cn } from '@/utils/cn'

const LIVE_POLL_MS = 15_000

const MODES: { value: GlobeMode; label: string }[] = [
  { value: 'live', label: 'Ao vivo' },
  { value: 'analytics', label: 'Análise' },
]

export default function GloboPage() {
  const [mode, setMode] = useState<GlobeMode>('live')
  const [data, setData] = useState<GlobeData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch('/api/store/insta2figma/globe')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return
          if (d.error) throw new Error(d.error)
          setData(d)
          setError(null)
        })
        .catch((e) => {
          if (!cancelled) setError(e.message)
        })

    load()
    // Modo live re-consulta a cada 15s; análise não precisa de polling.
    const timer = mode === 'live' ? setInterval(load, LIVE_POLL_MS) : null
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [mode])

  return (
    <>
      <PageHeader
        title="Globo"
        actions={
          <div className="flex rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className={cn(
                  'rounded-md px-3 py-1 text-label-sm transition-colors',
                  mode === m.value
                    ? 'bg-bg-strong-950 text-text-white-0'
                    : 'text-text-sub-600 hover:text-text-strong-950',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex min-h-[70vh] items-center justify-center">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}
        {!error && !data && (
          <p className="text-paragraph-sm text-text-soft-400">Carregando globo...</p>
        )}
        {!error && data && <GlobeView data={data} mode={mode} />}
      </div>
    </>
  )
}
