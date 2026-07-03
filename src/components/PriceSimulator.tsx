'use client'
import { useState } from 'react'
import { CollaboratorSummary } from '@/types'
import WidgetCard from '@/components/ds/WidgetCard'
import { RiArrowDownSLine } from '@remixicon/react'
import { cn } from '@/utils/cn'

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

interface Props {
  collaborators: CollaboratorSummary[]
}

export default function PriceSimulator({ collaborators }: Props) {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState<Record<string, number>>({})
  const [targetMargin, setTargetMargin] = useState(40)

  function setHour(id: string, val: number) {
    setHours((prev) => ({ ...prev, [id]: Math.max(0, val) }))
  }

  const lines = collaborators.map((c) => ({
    ...c,
    h: hours[c.id] ?? 0,
    lineCost: (hours[c.id] ?? 0) * c.effectiveHourlyRate,
  }))

  const totalCost = lines.reduce((s, l) => s + l.lineCost, 0)
  const totalHours = lines.reduce((s, l) => s + l.h, 0)
  const minPrice = targetMargin < 100 ? totalCost / (1 - targetMargin / 100) : 0
  const suggestedPrice = totalCost > 0 ? totalCost / (1 - 0.5) : 0

  return (
    <WidgetCard padding="none" className="overflow-hidden no-print">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-bg-weak-50"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-label-md text-text-strong-950">Simulador de preço</h2>
          <span className="hidden text-paragraph-xs text-text-sub-600 sm:block">
            Calcule o preço mínimo para uma margem desejada
          </span>
        </div>
        <RiArrowDownSLine className={cn('size-5 text-text-soft-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-stroke-soft-200 p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-label-2xs text-text-sub-600">Horas por colaborador</p>
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 px-3 py-2.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="w-24 shrink-0 text-paragraph-sm text-text-strong-950">{c.name}</span>
                    <input
                      type="number"
                      min={0}
                      value={hours[c.id] ?? ''}
                      placeholder="0"
                      onChange={(e) => setHour(c.id, Number(e.target.value))}
                      className="w-20 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5 text-center text-paragraph-sm focus:border-stroke-sub-300 focus:outline-none"
                    />
                    <span className="text-paragraph-xs text-text-sub-600">h</span>
                    <span className="ml-auto text-label-xs text-text-sub-600">× {fmtBRL(c.effectiveHourlyRate)}/h</span>
                    {(hours[c.id] ?? 0) > 0 && (
                      <span className="w-24 text-right text-label-sm text-error-base">
                        {fmtBRL((hours[c.id] ?? 0) * c.effectiveHourlyRate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-label-2xs">Margem desejada</p>
                  <span className="text-label-sm">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--color-text-strong-950)' }}
                />
                <div className="flex justify-between text-paragraph-xs mt-1">
                  <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-label-2xs text-text-sub-600">Resultado</p>

              <div className="space-y-4 rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-5">
                <div className="flex justify-between items-center">
                  <span className="text-paragraph-sm">Total de horas</span>
                  <span className="text-label-sm">{totalHours}h</span>
                </div>
                <div className="flex justify-between items-center border-t border-stroke-soft-200 pt-3">
                  <span className="text-paragraph-sm">Custo total</span>
                  <span className="text-label-sm">{fmtBRL(totalCost)}</span>
                </div>
              </div>

              {totalCost > 0 && (
                <>
                  <div className="rounded-xl border border-success-light/40 bg-success-lighter/20 p-5">
                    <p className="mb-1 text-label-2xs text-text-sub-600">Preço mínimo ({targetMargin}% margem)</p>
                    <p className="text-title-h4 text-success-base">{fmtBRL(minPrice)}</p>
                    <p className="mt-1 text-paragraph-xs text-success-base">Lucro: {fmtBRL(minPrice - totalCost)}</p>
                  </div>

                  <div className="rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-5">
                    <p className="mb-1 text-label-2xs text-text-sub-600">Preço sugerido (50% margem)</p>
                    <p className="text-title-h4 text-success-base">{fmtBRL(suggestedPrice)}</p>
                    <p className="mt-1 text-paragraph-xs text-success-base">Lucro: {fmtBRL(suggestedPrice - totalCost)}</p>
                  </div>
                </>
              )}

              {totalCost === 0 && (
                <div className="rounded-xl border border-stroke-soft-200 bg-bg-weak-50 p-5 text-center">
                  <p className="text-paragraph-sm text-text-sub-600">Insira as horas de cada colaborador para calcular o preço.</p>
                </div>
              )}

              {totalCost > 0 && (
                <button
                  onClick={() => setHours({})}
                  className="text-xs text-text-soft-400 hover:text-text-sub-600 transition-colors self-start"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
