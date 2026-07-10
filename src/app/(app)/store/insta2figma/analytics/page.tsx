'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/shell/PageHeader'
import DateRangePicker from '@/components/DateRangePicker'
import StatWidget from '@/components/ds/StatWidget'
import FilterSelect from '@/components/ds/FilterSelect'
import WidgetCard from '@/components/ds/WidgetCard'
import HorizontalFunnel from '@/components/store/HorizontalFunnel'
import type { AnalyticsData } from '@/types/insta2figma'
import { I2F_MIN_DATE } from '@/lib/insta2figma/constants'
import {
  featureLabel,
  PLAN_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  platformLabel,
} from '@/lib/insta2figma/labels'

const DEFAULT_END = new Date().toISOString().split('T')[0]
const DEFAULT_START = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
})()

const USAGE_FUNNEL_COLORS = ['#3559e9', '#6366f1', '#8b5cf6', '#2dd4bf', '#1fc16b']
const CONVERSION_FUNNEL_COLORS = ['#3559e9', '#7c3aed', '#14b8a6']

export default function AnalyticsPage() {
  const [start, setStart] = useState(DEFAULT_START)
  const [end, setEnd] = useState(DEFAULT_END)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState('all')
  const [plan, setPlan] = useState('all')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ start, end, platform, plan })
    fetch(`/api/store/insta2figma/analytics?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [start, end, platform, plan])

  useEffect(() => {
    load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Métricas"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <FilterSelect
              value={platform}
              onChange={setPlatform}
              options={PLATFORM_FILTER_OPTIONS}
              aria-label="Plataforma"
            />
            <FilterSelect
              value={plan}
              onChange={setPlan}
              options={PLAN_FILTER_OPTIONS}
              aria-label="Plano"
            />
            <DateRangePicker
              start={start}
              end={end}
              minDate={I2F_MIN_DATE}
              onChange={(s, e) => {
                setStart(s)
                setEnd(e)
              }}
            />
          </div>
        }
      />
      <main className="flex flex-col gap-6 p-5">
        {error && <p className="text-paragraph-sm text-error-base">{error}</p>}

        {loading && !data && !error && (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="mn-shimmer h-72 rounded-2xl" />
            ))}
          </div>
        )}

        {data && (
          <div className="mn-page-stagger flex flex-col gap-6">
            <div className={loading ? 'pointer-events-none flex flex-col gap-4 opacity-60' : 'flex flex-col gap-4'}>
              <HorizontalFunnel
                title="Funil de uso"
                steps={data.usageFunnel}
                colors={USAGE_FUNNEL_COLORS}
              />
              <HorizontalFunnel
                title="Funil de conversão"
                steps={data.conversionFunnel}
                colors={CONVERSION_FUNNEL_COLORS}
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
              <StatWidget label="Sessões" value={data.insights.sessions.toLocaleString('pt-BR')} />
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

            <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
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

            <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
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
          </div>
        )}
      </main>
    </>
  )
}
