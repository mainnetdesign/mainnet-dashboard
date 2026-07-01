'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import StatWidget from '@/components/ds/StatWidget'
import FilterBar from '@/components/ds/FilterBar'
import WidgetCard from '@/components/ds/WidgetCard'
import FunnelBar from '@/components/store/FunnelBar'
import type { AnalyticsData } from '@/types/insta2figma'
import { featureLabel, PLAN_FILTER_OPTIONS, platformLabel } from '@/lib/insta2figma/labels'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState('all')
  const [plan, setPlan] = useState('all')

  const load = useCallback(() => {
    const params = new URLSearchParams({ platform, plan })
    fetch(`/api/store/insta2figma/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [platform, plan])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader title="Métricas" />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        <FilterBar
          segments={[
            { value: 'all', label: 'Todas plataformas' },
            { value: 'figma', label: 'Figma' },
            { value: 'framer', label: 'Framer' },
          ]}
          segmentValue={platform}
          onSegmentChange={setPlatform}
        />

        <FilterBar
          segments={PLAN_FILTER_OPTIONS.map(({ value, label }) => ({ value, label }))}
          segmentValue={plan}
          onSegmentChange={setPlan}
        />

        {data && (
          <>
            <FunnelBar title="Funil de uso" steps={data.usageFunnel} />
            <FunnelBar title="Funil de conversão" steps={data.conversionFunnel} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatWidget label="Sessões" value={data.insights.sessions.toLocaleString()} />
              <StatWidget
                label="Duração média"
                value={`${data.insights.avgSessionMinutes} min`}
              />
              <StatWidget
                label="Conclusão de import"
                value={`${data.insights.importCompletionRate}%`}
              />
              <StatWidget
                label="Abandono de import"
                value={`${data.insights.importAbandonRate}%`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WidgetCard>
                <p className="mb-3 text-label-sm text-text-strong-950">Fricções & erros</p>
                <ul className="space-y-2 text-paragraph-sm text-text-sub-600">
                  <li>Conta privada: {data.insights.previewPrivateAccount}</li>
                  <li>Limite de preview: {data.insights.previewLimitReached}</li>
                </ul>
              </WidgetCard>

              <WidgetCard>
                <p className="mb-3 text-label-sm text-text-strong-950">Features mais usadas</p>
                <ul className="space-y-2">
                  {data.insights.featureToggles.map((f) => (
                    <li key={f.name} className="flex justify-between text-paragraph-sm">
                      <span className="text-text-sub-600">{featureLabel(f.name)}</span>
                      <span className="text-text-strong-950">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </WidgetCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <WidgetCard>
                <p className="mb-3 text-label-sm text-text-strong-950">Perfis IG mais buscados</p>
                <ul className="space-y-2">
                  {data.topProfiles.map((p) => (
                    <li key={p.username} className="flex justify-between text-paragraph-sm">
                      <span className="text-text-strong-950">@{p.username}</span>
                      <span className="text-text-sub-600">{p.searches} buscas</span>
                    </li>
                  ))}
                  {data.topProfiles.length === 0 && (
                    <li className="text-paragraph-sm text-text-soft-400">Sem dados</li>
                  )}
                </ul>
              </WidgetCard>

              <WidgetCard>
                <p className="mb-3 text-label-sm text-text-strong-950">Plataforma</p>
                <ul className="space-y-2">
                  {data.platformBreakdown.map((p) => (
                    <li key={p.platform} className="flex justify-between text-paragraph-sm">
                      <span className="text-text-sub-600">{platformLabel(p.platform)}</span>
                      <span className="text-text-strong-950">{p.count} sessões</span>
                    </li>
                  ))}
                </ul>
              </WidgetCard>
            </div>
          </>
        )}
      </main>
    </>
  )
}
