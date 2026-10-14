import { NextRequest, NextResponse } from 'next/server'
import { fetchLedger } from '@/lib/notion'
import { fetchPolarOrders } from '@/lib/insta2figma/polar'
import { fetchUsdBrl } from '@/lib/fx'
import { currentYM, inMonth, isTaxEntry, resolveFixedCosts, sum } from '@/lib/finance'
import { CIRCLE_CONTRACT, TAX_RATE } from '@/config/finance'
import type { ReportData, ReportLine } from '@/types'

const byDate = (a: ReportLine, b: ReportLine) => (a.date ?? '9999').localeCompare(b.date ?? '9999')

export async function GET(req: NextRequest) {
  try {
    const param = req.nextUrl.searchParams.get('month')
    const month = param && /^\d{4}-\d{2}$/.test(param) ? param : currentYM()
    const today = currentYM()

    const [ledger, orders, rate] = await Promise.all([fetchLedger(), fetchPolarOrders(), fetchUsdBrl()])
    const fixed = resolveFixedCosts(rate.value)
    const entries = ledger.filter((e) => inMonth(e, month))

    // ── Entradas ─────────────────────────────────────────────────────────────
    const inflows: ReportLine[] = entries
      .filter((e) => e.type === 'Entrada')
      .map((e) => ({ id: e.id, label: e.name || '(sem nome)', source: 'notion' as const, amount: e.amount, date: e.date, realized: e.realized }))

    const monthOrders = orders.filter((o) => o.createdAt.slice(0, 7) === month)
    if (monthOrders.length > 0) {
      inflows.push({
        id: 'polar',
        label: `Insta2Figma · ${monthOrders.length} pedido${monthOrders.length > 1 ? 's' : ''}`,
        source: 'polar',
        amount: sum(monthOrders.map((o) => o.amountUSD * rate.value)),
        date: null,
        realized: true,
      })
    }
    inflows.sort(byDate)
    const inflowTotal = sum(inflows.map((l) => l.amount))

    // ── Saídas ───────────────────────────────────────────────────────────────
    const outEntries = entries.filter((e) => e.type === 'Saída')
    const outflows: ReportLine[] = outEntries
      .map((e) => ({ id: e.id, label: e.name || '(sem nome)', source: 'notion' as const, amount: e.amount, date: e.date, realized: e.realized }))

    // Assinaturas e infra nunca são lançadas no Notion
    const groups = [...new Set(fixed.items.map((c) => c.group))]
    for (const g of groups) {
      if (g === 'Pessoal') continue
      const items = fixed.items.filter((c) => c.group === g)
      outflows.push({
        id: `fixo-${g}`,
        label: `${g} (${items.length})`,
        source: 'fixo',
        amount: sum(items.map((c) => c.monthlyBRL)),
        date: null,
        realized: month < today,
      })
    }

    // Salário ainda não lançado no Notion: projeta pelo valor da config (só mês atual em diante)
    if (month >= today) {
      for (const p of fixed.personnel) {
        if (outEntries.some((e) => e.name.startsWith(p.prefix))) continue
        outflows.push({ id: `fixo-${p.id}`, label: `${p.label} (previsto)`, source: 'estimado', amount: p.monthlyBRL, date: null, realized: false })
      }
    }

    if (!outEntries.some(isTaxEntry) && inflowTotal > 0) {
      outflows.push({
        id: 'imposto',
        label: `Imposto estimado (${Math.round(TAX_RATE * 100)}% das entradas)`,
        source: 'estimado',
        amount: inflowTotal * TAX_RATE,
        date: null,
        realized: false,
      })
    }
    outflows.sort(byDate)
    const outflowTotal = sum(outflows.map((l) => l.amount))

    // ── Circle ───────────────────────────────────────────────────────────────
    const match = CIRCLE_CONTRACT.notionMatch.toLowerCase()
    const expectedUSD = CIRCLE_CONTRACT.annualUSD / 12
    const result = inflowTotal - outflowTotal

    const round = (l: ReportLine) => ({ ...l, amount: Math.round(l.amount * 100) / 100 })
    const data: ReportData = {
      month,
      isCurrent: month === today,
      isFuture: month > today,
      rate: rate.value,
      inflows: inflows.map(round),
      outflows: outflows.map(round),
      totals: {
        inflow: Math.round(inflowTotal),
        outflow: Math.round(outflowTotal),
        result: Math.round(result),
        margin: inflowTotal > 0 ? Math.round((result / inflowTotal) * 1000) / 10 : null,
      },
      circle: {
        client: CIRCLE_CONTRACT.client,
        expectedUSD: Math.round(expectedUSD),
        expectedBRL: Math.round(expectedUSD * rate.value),
        receivedBRL: Math.round(sum(
          inflows.filter((l) => l.label.toLowerCase().includes(match)).map((l) => l.amount)
        )),
      },
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[relatorio] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
