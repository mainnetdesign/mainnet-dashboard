'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import StatWidget from '@/components/ds/StatWidget'
import ServiceCard from '@/components/store/ServiceCard'
import type { ServicesHubData } from '@/types/insta2figma'
import { fmtUSD } from '@/lib/insta2figma/constants'

export default function StorePage() {
  const [data, setData] = useState<ServicesHubData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/store/services')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <>
      <PageHeader title="Serviços" />
      <main className="flex flex-col gap-6 p-5">
        {error && (
          <div className="rounded-2xl border border-error-light bg-error-lighter p-4 text-paragraph-sm text-error-dark">
            {error}
          </div>
        )}

        {!data && !error && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-bg-weak-50" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatWidget label="MRR consolidado" value={fmtUSD(data.mrrUSD)} delta="+5%" />
              <StatWidget label="Total de usuários" value={data.totalUsers.toLocaleString()} />
              <StatWidget label="Receita do mês" value={fmtUSD(data.monthRevenueUSD)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.services.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}

              <button
                type="button"
                disabled
                className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-stroke-soft-200 bg-bg-weak-50 text-label-sm text-text-soft-400"
              >
                + Novo SaaS
                <span className="mt-1 text-paragraph-xs">Em breve</span>
              </button>
            </div>
          </>
        )}
      </main>
    </>
  )
}
