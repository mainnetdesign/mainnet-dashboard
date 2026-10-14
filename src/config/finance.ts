import { SUBSCRIPTIONS } from '@/config/subscriptions'
import { INSTA2FIGMA_MONTHLY_COSTS_USD } from '@/config/insta2figma'

export type FixedCostGroup = 'Pessoal' | 'Assinaturas' | 'Infra Insta2Figma'

export interface FixedCost {
  id: string
  label: string
  group: FixedCostGroup
  amountBRL?: number
  amountUSD?: number
  /** Prefixo do nome no Notion (ex.: "João Out 2026") — esse lançamento já é este custo, não um variável */
  notionPrefix?: string
}

export const PERSONNEL_COSTS: FixedCost[] = [
  { id: 'salario-joao', label: 'Salário João', group: 'Pessoal', amountBRL: 1621, notionPrefix: 'João' },
]

/** Usada quando a cotação do dia não está disponível */
export const USD_BRL_FALLBACK = 5.4

/** Simples Nacional sobre toda a receita — sobe com o faturamento dos últimos 12 meses; confirmar com o contador */
export const TAX_RATE = 0.06

export const CIRCLE_CONTRACT = {
  client: 'Circle',
  service: 'Design',
  annualUSD: 107_000,
  /** Quinzenal: uma fatura no dia 15 e outra no último dia do mês */
  invoicesPerMonth: 2,
  platform: 'Remote',
  /** Spread + taxas da Remote na conversão — estimativa até termos o valor real */
  fxSpread: 0.01,
  /** Entradas do Notion com este texto no nome são pagamentos da Circle */
  notionMatch: 'Circle',
}

export function allFixedCosts(): FixedCost[] {
  return [
    ...PERSONNEL_COSTS,
    ...SUBSCRIPTIONS.map((s) => ({
      id: s.id,
      label: s.name,
      group: 'Assinaturas' as const,
      amountBRL: s.monthlyBRL,
    })),
    ...INSTA2FIGMA_MONTHLY_COSTS_USD.map((c) => ({
      id: c.id,
      label: c.label,
      group: 'Infra Insta2Figma' as const,
      amountUSD: c.amountUSD,
    })),
  ]
}
