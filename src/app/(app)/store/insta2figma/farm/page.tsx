'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import FarmCanvas from '@/components/store/FarmCanvas'
import StoreDrawerStack from '@/components/store/StoreDrawerStack'
import { useStoreDrawers } from '@/components/store/useStoreDrawers'
import type { FarmData } from '@/types/insta2figma'

export default function FarmPage() {
  const [data, setData] = useState<FarmData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const drawers = useStoreDrawers()

  useEffect(() => {
    fetch('/api/store/insta2figma/farm')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden lg:h-screen">
      <PageHeader title="Farm" />

      <main className="flex min-h-0 flex-1 flex-col p-5">
        {error && <p className="mb-4 shrink-0 text-paragraph-sm text-error-base">{error}</p>}

        {!data && !error && (
          <div className="mn-shimmer min-h-0 flex-1 rounded-2xl" />
        )}

        {data && (
          <div className="mn-page-stagger min-h-0 flex-1">
            <FarmCanvas
            data={data}
            onOpenUser={(id) => drawers.openUser(id)}
            className="min-h-0 flex-1"
            />
          </div>
        )}
      </main>

      <StoreDrawerStack {...drawers} />
    </div>
  )
}
