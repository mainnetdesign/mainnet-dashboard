import { cn } from '@/utils/cn'
import type { FunnelStep } from '@/types/insta2figma'

export default function FunnelBar({
  title,
  steps,
  className,
}: {
  title: string
  steps: FunnelStep[]
  className?: string
}) {
  const max = Math.max(...steps.map((s) => s.count), 1)

  return (
    <div className={cn('rounded-2xl border border-stroke-soft-200 bg-bg-white-0 p-5', className)}>
      <p className="mb-4 text-label-sm text-text-strong-950">{title}</p>
      <div className="flex flex-wrap items-end gap-2">
        {steps.map((step, i) => (
          <div key={step.name} className="flex items-end gap-2">
            <div className="flex min-w-[100px] flex-col gap-1">
              <div
                className="rounded-lg bg-primary-base/90 transition-all"
                style={{
                  height: Math.max(24, Math.round((step.count / max) * 80)),
                  minWidth: 100,
                }}
              />
              <p className="text-label-xs text-text-strong-950">{step.label}</p>
              <p className="text-paragraph-xs text-text-soft-400">
                {step.count.toLocaleString()}
                {step.rateFromPrev != null && ` · ${step.rateFromPrev}%`}
              </p>
            </div>
            {i < steps.length - 1 && (
              <span className="mb-6 text-label-xs text-text-soft-400">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
