export * from './studio'

export interface LedgerEntry {
  id: string
  name: string
  type: 'Entrada' | 'Saída'
  amount: number // BRL, sempre positivo
  realized: boolean
  date: string | null // Data Pagamento, senão Data Vencimento
  category: string | null
}

export interface FinanceMonth {
  month: string // YYYY-MM
  label: string
  isCurrent: boolean
  polarRevenue: number
  notionRevenue: number
  revenue: number
  tax: number
  cost: number
  result: number
}

export interface CircleData {
  client: string
  service: string
  platform: string
  annualUSD: number
  monthlyUSD: number
  invoiceUSD: number
  taxRate: number
  fxSpread: number
  monthlyGrossBRL: number
  monthlyTaxBRL: number
  monthlySpreadBRL: number
  monthlyNetBRL: number
  receivedThisMonthBRL: number
  receivedThisMonth: LedgerEntry[]
  receivedYearBRL: number
  nextInvoices: Array<{ date: string; amountUSD: number; amountBRL: number }>
}

export interface FinanceCostItem {
  id: string
  label: string
  group: string
  monthlyBRL: number
  amountUSD?: number
}

export interface FinanceData {
  currentMonth: string
  rate: { value: number; source: 'awesomeapi' | 'fallback' }
  fixedCosts: FinanceCostItem[]
  fixedTotal: number
  taxRate: number
  circle: CircleData
  variableThisMonth: LedgerEntry[]
  monthly: FinanceMonth[]
  payables: LedgerEntry[]
  receivables: LedgerEntry[]
  summary: {
    mrrUSD: number
    mrrBRL: number
    activeSubscriptions: number
    /** MRR do Insta2Figma já descontado o imposto */
    mrrNetBRL: number
    /** custo fixo mensal − receita recorrente líquida (Circle + MRR); ≤ 0 = a empresa sobra dinheiro */
    netBurn: number
  }
}

export interface ReportLine {
  id: string
  label: string
  /** Origem do valor: lançado no Notion, Polar, custo fixo da config ou estimativa */
  source: 'notion' | 'polar' | 'fixo' | 'estimado'
  amount: number
  date: string | null
  realized: boolean
}

export interface ReportData {
  month: string // YYYY-MM
  isCurrent: boolean
  isFuture: boolean
  rate: number
  inflows: ReportLine[]
  outflows: ReportLine[]
  totals: {
    inflow: number
    outflow: number
    result: number
    /** resultado / entradas, em %; null quando não houve entrada */
    margin: number | null
  }
  circle: {
    client: string
    expectedBRL: number
    expectedUSD: number
    receivedBRL: number
  }
}
