import { allFixedCosts } from '@/config/finance'
import type { FinanceCostItem, LedgerEntry } from '@/types'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_LABELS[Number(m) - 1]}/${y.slice(2)}`
}

export function currentYM() {
  return new Date().toISOString().slice(0, 7)
}

export const inMonth = (e: LedgerEntry, ym: string) => e.date?.slice(0, 7) === ym

export const isTaxEntry = (e: LedgerEntry) =>
  e.category === 'Imposto' || /imposto/i.test(e.name) || /\bDAS\b/.test(e.name)

/** Custos fixos da config convertidos para BRL na cotação informada */
export function resolveFixedCosts(rate: number) {
  const config = allFixedCosts()
  const toBRL = (c: (typeof config)[number]) => c.amountBRL ?? (c.amountUSD ?? 0) * rate
  const items: FinanceCostItem[] = config.map((c) => ({
    id: c.id,
    label: c.label,
    group: c.group,
    monthlyBRL: toBRL(c),
    amountUSD: c.amountUSD,
  }))
  // Custos com notionPrefix (salários) são lançados no Notion; os demais nunca aparecem lá
  const personnel = config.filter((c) => c.notionPrefix)
  const prefixes = personnel.map((c) => c.notionPrefix!)
  return {
    items,
    total: sum(items.map((c) => c.monthlyBRL)),
    nonPersonnelTotal: sum(config.filter((c) => !c.notionPrefix).map(toBRL)),
    personnel: personnel.map((c) => ({ id: c.id, label: c.label, prefix: c.notionPrefix!, monthlyBRL: toBRL(c) })),
    isFixedInNotion: (e: LedgerEntry) => prefixes.some((p) => e.name.startsWith(p)),
  }
}
