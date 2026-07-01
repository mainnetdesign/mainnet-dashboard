'use client'
import { useState, useEffect } from 'react'
import { COLLABORATORS } from '@/config/collaborators'
import * as Button from '@/components/ui/button'
import * as Input from '@/components/ui/input'

interface RateOverride {
  monthlySalary?: number
  hourlyRate?: number
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function RatesEditor({ onClose, onSaved }: Props) {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, RateOverride>>({})

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    fetch('/api/settings/rates')
      .then((r) => r.json())
      .then((data) => setOverrides(data ?? {}))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function getValue(id: string, field: 'monthlySalary' | 'hourlyRate', defaultVal: number | undefined) {
    const o = overrides[id]
    if (o && o[field] !== undefined) return o[field]!
    return defaultVal ?? 0
  }

  function setValue(id: string, field: 'monthlySalary' | 'hourlyRate', val: number) {
    setOverrides((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: val },
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/settings/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides),
      })
      onSaved()
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  function fmtBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0, backdropFilter: 'blur(3px)' }}
        onClick={handleClose}
      />

      <aside
        className="fixed top-0 right-0 z-50 h-full w-full max-w-[420px] bg-[var(--bg3)] shadow-2xl overflow-y-auto flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)', borderLeft: '1px solid var(--bd)' }}
      >
        {/* Accent strip */}
        <div className="h-[3px] shrink-0 bg-[#6366F1]" />

        {/* Header */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between shrink-0 border-b border-[var(--bd)]">
          <div>
            <h2 className="text-title-h6 text-[var(--tx)]">Taxas & Salários</h2>
            <p className="text-paragraph-xs text-[var(--tx3)] mt-0.5">Edite os valores — os custos são recalculados ao salvar</p>
          </div>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx)] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Collaborator rows */}
        <div className="flex-1 px-7 py-6 space-y-6">
          {COLLABORATORS.map((c) => {
            const isHourly = c.hourlyRate !== undefined
            const field = isHourly ? 'hourlyRate' : 'monthlySalary'
            const current = getValue(c.id, field, isHourly ? c.hourlyRate : c.monthlySalary)
            const original = isHourly ? c.hourlyRate : c.monthlySalary
            const changed = overrides[c.id]?.[field] !== undefined && overrides[c.id]![field] !== original

            return (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: c.color + '22', color: c.color, border: `1.5px solid ${c.color}44` }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-label-sm text-[var(--tx)]">{c.name}</p>
                      <p className="text-paragraph-xs text-[var(--tx3)]">{isHourly ? 'Taxa fixa/hora' : 'Salário mensal'}</p>
                    </div>
                  </div>
                  {changed && (
                    <span className="text-label-2xs px-2 py-0.5" style={{ background: '#6366F122', color: '#6366F1', border: '1px solid #6366F144' }}>
                      alterado
                    </span>
                  )}
                </div>

                <Input.Root size="medium">
                  <Input.Affix>R$</Input.Affix>
                  <Input.Wrapper>
                    <Input.Input
                      type="number"
                      min={0}
                      step={isHourly ? 1 : 50}
                      value={current}
                      onChange={(e) => setValue(c.id, field, parseFloat(e.target.value) || 0)}
                    />
                  </Input.Wrapper>
                  <Input.Affix>{isHourly ? '/h' : '/mês'}</Input.Affix>
                </Input.Root>

                {changed && original !== undefined && (
                  <p className="text-paragraph-xs text-[var(--tx3)] mt-1">
                    Original: {fmtBRL(original)}{isHourly ? '/h' : '/mês'}
                    <button
                      className="ml-2 underline hover:text-[var(--tx2)]"
                      onClick={() => {
                        setOverrides((prev) => {
                          const next = { ...prev }
                          delete next[c.id]
                          return next
                        })
                      }}
                    >
                      restaurar
                    </button>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-[var(--bd)] shrink-0 flex gap-3">
          <Button.Root variant="neutral" mode="stroke" size="medium" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button.Root>
          <Button.Root variant="primary" mode="filled" size="medium" className="flex-1" onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar e recalcular'}
          </Button.Root>
        </div>
      </aside>
    </>
  )
}
