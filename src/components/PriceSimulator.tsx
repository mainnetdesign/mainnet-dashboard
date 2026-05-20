'use client'
import { useState } from 'react'
import { CollaboratorSummary } from '@/types'

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
    <div className="bg-[var(--bg3)] border border-[var(--bd)] overflow-hidden mb-8 no-print">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg4)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[var(--tx)]">Simulador de preço</h2>
          <span className="text-xs text-[var(--tx3)] font-normal hidden sm:block">
            Calcule o preço mínimo para uma margem desejada
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--tx3)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--bd)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-4">
                Horas por colaborador
              </p>
              <div className="space-y-3">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-sm text-[var(--tx2)] w-24 shrink-0">{c.name}</span>
                    <input
                      type="number"
                      min={0}
                      value={hours[c.id] ?? ''}
                      placeholder="0"
                      onChange={(e) => setHour(c.id, Number(e.target.value))}
                      className="w-20 bg-[var(--bg2)] border border-[var(--bd)] px-2 py-1.5 text-sm text-center text-[var(--tx)] focus:outline-none focus:border-[var(--bd3)]"
                    />
                    <span className="text-xs text-[var(--tx3)]">h</span>
                    <span className="text-xs text-[var(--tx3)] ml-auto">× {fmtBRL(c.effectiveHourlyRate)}/h</span>
                    {(hours[c.id] ?? 0) > 0 && (
                      <span className="text-sm font-semibold text-[var(--tx)] w-24 text-right">
                        {fmtBRL((hours[c.id] ?? 0) * c.effectiveHourlyRate)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">Margem desejada</p>
                  <span className="text-sm font-bold text-[var(--tx)]">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--tx)' }}
                />
                <div className="flex justify-between text-xs text-[var(--tx3)] mt-1">
                  <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider">Resultado</p>

              <div className="bg-[var(--bg2)] border border-[var(--bd)] p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--tx2)]">Total de horas</span>
                  <span className="text-sm font-semibold text-[var(--tx)]">{totalHours}h</span>
                </div>
                <div className="flex justify-between items-center border-t border-[var(--bd)] pt-3">
                  <span className="text-sm text-[var(--tx2)]">Custo total</span>
                  <span className="text-sm font-semibold text-[var(--tx)]">{fmtBRL(totalCost)}</span>
                </div>
              </div>

              {totalCost > 0 && (
                <>
                  <div className="bg-[var(--bg2)] border border-[var(--bd2)] p-5">
                    <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">
                      Preço mínimo ({targetMargin}% margem)
                    </p>
                    <p className="text-3xl font-bold text-[var(--tx)]">{fmtBRL(minPrice)}</p>
                    <p className="text-xs mt-1" style={{ color: '#22C55E' }}>Lucro: {fmtBRL(minPrice - totalCost)}</p>
                  </div>

                  <div className="bg-[var(--bg3)] border border-[var(--bd3)] p-5">
                    <p className="text-[11px] font-semibold text-[var(--tx3)] uppercase tracking-wider mb-1">
                      Preço sugerido (50% margem)
                    </p>
                    <p className="text-3xl font-bold text-[var(--tx)]">{fmtBRL(suggestedPrice)}</p>
                    <p className="text-xs mt-1" style={{ color: '#22C55E' }}>Lucro: {fmtBRL(suggestedPrice - totalCost)}</p>
                  </div>
                </>
              )}

              {totalCost === 0 && (
                <div className="bg-[var(--bg2)] border border-[var(--bd)] p-5 text-center">
                  <p className="text-sm text-[var(--tx3)]">Insira as horas de cada colaborador para calcular o preço.</p>
                </div>
              )}

              {totalCost > 0 && (
                <button
                  onClick={() => setHours({})}
                  className="text-xs text-[var(--tx3)] hover:text-[var(--tx2)] transition-colors self-start"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
