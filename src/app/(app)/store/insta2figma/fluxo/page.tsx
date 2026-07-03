'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import ImportJourneyMap from '@/components/store/ImportJourneyMap'
import StoreDrawerStack from '@/components/store/StoreDrawerStack'
import { useStoreDrawers } from '@/components/store/useStoreDrawers'
import type { FlowJourneyData } from '@/types/insta2figma'
import { I2F_MIN_DATE } from '@/lib/insta2figma/constants'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})()

export default function FluxoPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [flow, setFlow] = useState<FlowJourneyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)
  const drawers = useStoreDrawers()

  const load = useCallback(
    (silent = false) => {
      if (!silent) setError(null)
      const params = new URLSearchParams({ start, end })

      fetch(`/api/store/insta2figma/flow?${params}`)
        .then((r) => r.json())
        .then((f) => {
          if (f.error) throw new Error(f.error)
          setFlow(f)
          hasDataRef.current = true
        })
        .catch((e) => {
          if (!silent) setError(e.message)
        })
    },
    [start, end],
  )

  useEffect(() => {
    load(hasDataRef.current)
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => load(true), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [load])

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden lg:h-screen">
      <PageHeader
        title="Fluxo"
        actions={
          <DateRangePicker
            start={start}
            end={end}
            minDate={I2F_MIN_DATE}
            onChange={(s, e) => {
              setStart(s)
              setEnd(e)
            }}
          />
        }
      />

      <main className="flex min-h-0 flex-1 flex-col p-5">
        {error && <p className="mb-4 shrink-0 text-paragraph-sm text-error-base">{error}</p>}

        {!flow && !error && (
          <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-bg-weak-50" />
        )}

        {flow && (
          <ImportJourneyMap
            data={flow}
            start={start}
            end={end}
            onJobClick={(job) =>
              drawers.openImport(job.id, { userId: job.userId, displayName: job.displayName })
            }
            className="min-h-0 flex-1"
          />
        )}
      </main>

      <StoreDrawerStack {...drawers} />
    </div>
  )
}
