'use client'

import { RiArrowRightSLine } from '@remixicon/react'
import type { FunnelStep } from '@/types/insta2figma'
import { cn } from '@/utils/cn'

const DEFAULT_COLORS = ['#3559e9', '#7c5cfc', '#9d4edd', '#2a9d8f', '#1fc16b']

type HorizontalFunnelProps = {
  title: string
  steps: FunnelStep[]
  colors?: string[]
  className?: string
}

function rateFromFirst(count: number, first: number) {
  if (first <= 0) return 0
  return Math.round((count / first) * 1000) / 10
}

function buildSegments(steps: FunnelStep[], width: number, height: number) {
  const n = steps.length
  if (n === 0) return []

  const first = Math.max(steps[0].count, 1)
  const segmentWidth = width / n
  const cy = height / 2
  const maxBand = height * 0.82

  return steps.map((step, i) => {
    const leftH = Math.max((step.count / first) * maxBand, 10)
    const nextCount = steps[i + 1]?.count ?? step.count
    const rightH = Math.max((nextCount / first) * maxBand, 10)
    const x0 = i * segmentWidth
    const x1 = (i + 1) * segmentWidth

    return {
      path: `M ${x0} ${cy - leftH / 2} L ${x1} ${cy - rightH / 2} L ${x1} ${cy + rightH / 2} L ${x0} ${cy + leftH / 2} Z`,
      pct: rateFromFirst(step.count, steps[0].count),
      cxPct: ((x0 + x1) / 2 / width) * 100,
      step,
    }
  })
}

export default function HorizontalFunnel({
  title,
  steps,
  colors = DEFAULT_COLORS,
  className,
}: HorizontalFunnelProps) {
  const segments = buildSegments(steps, 1000, 220)
  const n = steps.length

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0',
        className,
      )}
    >
      <div className="border-b border-stroke-soft-200 px-5 py-3">
        <p className="text-label-sm text-text-strong-950">{title}</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Headers */}
          <div
            className="grid border-b border-stroke-soft-200"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {steps.map((step, i) => (
              <div
                key={step.name}
                className={cn(
                  'relative flex items-start gap-2 px-5 py-4',
                  i < n - 1 && 'border-r border-stroke-soft-200',
                )}
              >
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <div className="min-w-0">
                  <p className="text-label-xs text-text-soft-400">{step.label}</p>
                  <p className="font-display text-title-h5 text-text-strong-950">
                    {step.count.toLocaleString('pt-BR')}
                  </p>
                </div>
                {i < n - 1 && (
                  <span className="absolute -right-3 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 text-text-soft-400 shadow-sm">
                    <RiArrowRightSLine className="size-4" />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Funnel shape */}
          <div className="relative h-[220px] bg-bg-weak-50/50">
            <svg
              viewBox="0 0 1000 220"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              <defs>
                {segments.map((seg, i) => (
                  <linearGradient
                    key={`grad-${seg.step.name}`}
                    id={`funnel-grad-${seg.step.name}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.75} />
                  </linearGradient>
                ))}
                <filter id="funnel-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {segments.map((seg, i) => (
                <path
                  key={`glow-${seg.step.name}`}
                  d={seg.path}
                  fill={colors[i % colors.length]}
                  opacity={0.25}
                  filter="url(#funnel-glow)"
                />
              ))}

              {segments.map((seg, i) => (
                <path
                  key={seg.step.name}
                  d={seg.path}
                  fill={`url(#funnel-grad-${seg.step.name})`}
                />
              ))}

              {/* Column dividers */}
              {Array.from({ length: n - 1 }, (_, i) => {
                const x = ((i + 1) / n) * 1000
                return (
                  <line
                    key={`div-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={220}
                    stroke="var(--color-stroke-soft-200)"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                )
              })}
            </svg>

            {segments.map((seg) => (
              <div
                key={`badge-${seg.step.name}`}
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${seg.cxPct}%` }}
              >
                <span className="inline-flex min-w-[52px] items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 px-2.5 py-1 text-label-xs font-medium text-text-strong-950 shadow-sm">
                  {seg.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
