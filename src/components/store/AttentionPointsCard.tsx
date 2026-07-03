'use client'

import Link from 'next/link'
import { RiAlertLine, RiArrowRightSLine, RiCheckboxCircleLine } from '@remixicon/react'
import WidgetCard from '@/components/ds/WidgetCard'
import type { OverviewAttentionPoint } from '@/types/insta2figma'
import { cn } from '@/utils/cn'

const SEVERITY_STYLES = {
  error: {
    dot: 'bg-error-base',
    icon: 'text-error-base',
    border: 'border-error-light/30 bg-error-lighter/30',
  },
  warning: {
    dot: 'bg-away-base',
    icon: 'text-away-base',
    border: 'border-away-light/30 bg-away-lighter/30',
  },
  info: {
    dot: 'bg-information-base',
    icon: 'text-information-base',
    border: 'border-information-light/30 bg-information-lighter/30',
  },
} as const

type AttentionPointsCardProps = {
  points: OverviewAttentionPoint[]
  className?: string
}

export default function AttentionPointsCard({ points, className }: AttentionPointsCardProps) {
  return (
    <WidgetCard className={cn('flex h-full flex-col gap-4', className)}>
      <div>
        <p className="text-paragraph-sm text-text-sub-600">Pontos de atenção</p>
        <p className="mt-1 font-display text-title-h5 text-text-strong-950">
          {points.length === 0 ? 'Tudo certo' : `${points.length} alerta${points.length === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {points.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center">
            <RiCheckboxCircleLine className="size-8 text-success-base" />
            <p className="text-paragraph-sm text-text-sub-600">Nenhum alerta no período selecionado.</p>
          </div>
        ) : (
          points.map((point) => {
            const styles = SEVERITY_STYLES[point.severity]
            const content = (
              <div
                className={cn(
                  'rounded-xl border px-3 py-2.5 transition-colors',
                  styles.border,
                  point.href && 'hover:border-stroke-sub-300',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <RiAlertLine className={cn('mt-0.5 size-4 shrink-0', styles.icon)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-label-sm text-text-strong-950">{point.title}</p>
                    <p className="mt-0.5 text-paragraph-xs text-text-sub-600">{point.description}</p>
                  </div>
                  {point.href && (
                    <RiArrowRightSLine className="size-4 shrink-0 text-text-soft-400" aria-hidden />
                  )}
                </div>
              </div>
            )

            if (point.href) {
              return (
                <Link key={point.id} href={point.href} className="block">
                  {content}
                </Link>
              )
            }

            return <div key={point.id}>{content}</div>
          })
        )}
      </div>
    </WidgetCard>
  )
}
