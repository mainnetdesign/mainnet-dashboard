import { NextResponse } from 'next/server'
import { fetchLedger } from '@/lib/notion'
import { fetchActivePolarSubscriptions, fetchPolarOrders } from '@/lib/insta2figma/polar'
import { fetchUsdBrl } from '@/lib/fx'
import { inMonth, isTaxEntry, monthLabel, resolveFixedCosts, sum } from '@/lib/finance'
import { CIRCLE_CONTRACT, TAX_RATE } from '@/config/finance'
import type { CircleData, FinanceData, FinanceMonth, LedgerEntry } from '@/types'

const HISTORY_MONTHS = 6
const NEXT_INVOICES = 4

function lastMonths(count: number): string[] {
  const now = new Date()
  return Array.from({ length: count + 1 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - count + i, 1))
    return d.toISOString().slice(0, 7)
  })
}

/** Datas das próximas faturas quinzenais: dia 15 e último dia de cada mês */
function nextInvoiceDates(count: number): string[] {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const dates: string[] = []
  for (let i = 0; dates.length < count && i < 12; i++) {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth() + i
    const mid = new Date(Date.UTC(y, m, 15)).toISOString().slice(0, 10)
    const end = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10)
    for (const d of [mid, end]) if (d >= today && dates.length < count) dates.push(d)
  }
  return dates
}

export async function GET() {
  try {
    const [ledger, orders, subscriptions, rate] = await Promise.all([
      fetchLedger(),
      fetchPolarOrders(),
      fetchActivePolarSubscriptions(),
      fetchUsdBrl(),
    ])
    const mrrUSD = sum(subscriptions.map((s) => (s.interval === 'year' ? s.amountUSD / 12 : s.amountUSD)))
    const mrrBRL = mrrUSD * rate.value

    const months = lastMonths(HISTORY_MONTHS)
    const currentMonth = months[months.length - 1]
    const lastDayOfMonth = new Date(Date.UTC(
      Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 0
    )).toISOString().slice(0, 10)

    const fixed = resolveFixedCosts(rate.value)
    const outflows = (ym: string) => ledger.filter((e) => e.type === 'Saída' && inMonth(e, ym))

    const notionVariable = outflows(currentMonth)
      .filter((e) => !fixed.isFixedInNotion(e))
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

    let currentTaxEstimate = 0

    const monthly: FinanceMonth[] = months.map((ym) => {
      const isCurrent = ym === currentMonth
      const polarRevenue = sum(
        orders.filter((o) => o.createdAt.slice(0, 7) === ym).map((o) => o.amountUSD * rate.value)
      )
      const notionRevenue = sum(
        ledger.filter((e) => e.type === 'Entrada' && inMonth(e, ym)).map((e) => e.amount)
      )
      const revenue = polarRevenue + notionRevenue

      // Imposto lançado no Notion tem prioridade; sem lançamento, estima TAX_RATE sobre a receita
      const out = outflows(ym)
      const taxInNotion = sum(out.filter(isTaxEntry).map((e) => e.amount))
      const taxEstimate = out.some(isTaxEntry) ? 0 : revenue * TAX_RATE
      if (isCurrent) currentTaxEstimate = taxEstimate

      // Meses passados: saídas reais do Notion + assinaturas/infra (que não são lançadas no Notion).
      // Mês atual: custo fixo projetado + variáveis lançados no Notion.
      const cost = (isCurrent
        ? fixed.total + sum(notionVariable.map((e) => e.amount))
        : fixed.nonPersonnelTotal + sum(out.map((e) => e.amount))) + taxEstimate

      return {
        month: ym,
        label: monthLabel(ym),
        isCurrent,
        polarRevenue: Math.round(polarRevenue),
        notionRevenue: Math.round(notionRevenue),
        revenue: Math.round(revenue),
        tax: Math.round(taxInNotion + taxEstimate),
        cost: Math.round(cost),
        result: Math.round(revenue - cost),
      }
    })

    const variableThisMonth: LedgerEntry[] = currentTaxEstimate > 0
      ? [...notionVariable, {
          id: 'tax-estimate',
          name: `Imposto estimado (${Math.round(TAX_RATE * 100)}% da receita)`,
          type: 'Saída',
          amount: Math.round(currentTaxEstimate * 100) / 100,
          realized: false,
          date: lastDayOfMonth,
          category: 'Imposto',
        }]
      : notionVariable

    // ── Circle ───────────────────────────────────────────────────────────────
    const monthlyUSD = CIRCLE_CONTRACT.annualUSD / 12
    const invoiceUSD = monthlyUSD / CIRCLE_CONTRACT.invoicesPerMonth
    const monthlyGrossBRL = monthlyUSD * rate.value
    const monthlyTaxBRL = monthlyGrossBRL * TAX_RATE
    const monthlySpreadBRL = monthlyGrossBRL * CIRCLE_CONTRACT.fxSpread
    const monthlyNetBRL = monthlyGrossBRL - monthlyTaxBRL - monthlySpreadBRL

    const match = CIRCLE_CONTRACT.notionMatch.toLowerCase()
    const circlePaid = ledger.filter(
      (e) => e.type === 'Entrada' && e.realized && e.name.toLowerCase().includes(match)
    )
    const receivedThisMonth = circlePaid
      .filter((e) => inMonth(e, currentMonth))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

    const circle: CircleData = {
      client: CIRCLE_CONTRACT.client,
      service: CIRCLE_CONTRACT.service,
      platform: CIRCLE_CONTRACT.platform,
      annualUSD: CIRCLE_CONTRACT.annualUSD,
      monthlyUSD: Math.round(monthlyUSD),
      invoiceUSD: Math.round(invoiceUSD),
      taxRate: TAX_RATE,
      fxSpread: CIRCLE_CONTRACT.fxSpread,
      monthlyGrossBRL: Math.round(monthlyGrossBRL),
      monthlyTaxBRL: Math.round(monthlyTaxBRL),
      monthlySpreadBRL: Math.round(monthlySpreadBRL),
      monthlyNetBRL: Math.round(monthlyNetBRL),
      receivedThisMonthBRL: Math.round(sum(receivedThisMonth.map((e) => e.amount))),
      receivedThisMonth,
      receivedYearBRL: Math.round(sum(
        circlePaid.filter((e) => e.date?.startsWith(currentMonth.slice(0, 4))).map((e) => e.amount)
      )),
      nextInvoices: nextInvoiceDates(NEXT_INVOICES).map((date) => ({
        date,
        amountUSD: Math.round(invoiceUSD),
        amountBRL: Math.round(invoiceUSD * rate.value),
      })),
    }

    const byDate = (a: LedgerEntry, b: LedgerEntry) =>
      (a.date ?? '9999').localeCompare(b.date ?? '9999')
    const payables = ledger.filter((e) => e.type === 'Saída' && !e.realized).sort(byDate)
    const receivables = ledger.filter((e) => e.type === 'Entrada' && !e.realized).sort(byDate)

    const mrrNetBRL = mrrBRL * (1 - TAX_RATE)

    const data: FinanceData = {
      currentMonth,
      rate,
      fixedCosts: fixed.items,
      fixedTotal: Math.round(fixed.total),
      taxRate: TAX_RATE,
      circle,
      variableThisMonth,
      monthly,
      payables,
      receivables,
      summary: {
        mrrUSD: Math.round(mrrUSD * 100) / 100,
        mrrBRL: Math.round(mrrBRL),
        activeSubscriptions: subscriptions.length,
        mrrNetBRL: Math.round(mrrNetBRL),
        netBurn: Math.round(fixed.total - monthlyNetBRL - mrrNetBRL),
      },
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[financeiro] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
