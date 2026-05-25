import { NextRequest, NextResponse } from 'next/server'
import { fetchAllTimeEntries } from '@/lib/clockify'
import { fetchAllTransactions } from '@/lib/notion'
import { getKnownMapping, extractProjectName } from '@/config/projectMapping'
import { COLLABORATOR_MAP } from '@/config/collaborators'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-')
  return `${MONTH_LABELS[m]}/${y.slice(2)}`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    // Wide range to capture historical costs + future scheduled payments
    const start = searchParams.get('start') ?? '2025-01-01'
    const end   = searchParams.get('end')   ?? new Date().toISOString().split('T')[0]

    const [entries, transactions] = await Promise.all([
      fetchAllTimeEntries(start, end),
      fetchAllTransactions(),
    ])

    const todayYM = new Date().toISOString().slice(0, 7)

    // ── Monthly cost from Clockify ─────────────────────────────────────────────
    const userMonthHours = new Map<string, Map<string, number>>()
    for (const e of entries) {
      if (!COLLABORATOR_MAP.has(e.userId)) continue
      if (!userMonthHours.has(e.userId)) userMonthHours.set(e.userId, new Map())
      const mmap = userMonthHours.get(e.userId)!
      mmap.set(e.month, (mmap.get(e.month) ?? 0) + e.duration / 3600)
    }

    const monthlyCost = new Map<string, number>()
    for (const e of entries) {
      const collab = COLLABORATOR_MAP.get(e.userId)
      if (!collab) continue
      const hours = e.duration / 3600
      const totalH = userMonthHours.get(e.userId)?.get(e.month) ?? hours
      const rate = collab.hourlyRate !== undefined
        ? collab.hourlyRate
        : (collab.monthlySalary ?? 0) / totalH
      monthlyCost.set(e.month, (monthlyCost.get(e.month) ?? 0) + hours * rate)
    }

    // ── Monthly revenue + predicted from Notion ───────────────────────────────
    const monthlyRealized  = new Map<string, number>()
    const monthlyPredicted = new Map<string, number>()

    // Upcoming entries (unrealized, future payment date)
    const upcoming: Array<{
      id: string; name: string; value: number; predictedValue: number
      paymentDate: string; extractedName: string | null
    }> = []

    // Overdue entries (unrealized, past payment date)
    const overdue: Array<{
      id: string; name: string; value: number; predictedValue: number
      paymentDate: string; daysOverdue: number; extractedName: string | null
    }> = []

    for (const tx of transactions) {
      if (!tx.paymentDate) continue
      const ym = tx.paymentDate.slice(0, 7)

      // Determine display name
      const known = getKnownMapping(tx.name)
      const displayName = known.found
        ? known.value
        : extractProjectName(tx.name)

      if (tx.realized) {
        monthlyRealized.set(ym, (monthlyRealized.get(ym) ?? 0) + tx.value)
      } else {
        // Unrealized: upcoming or overdue
        if (tx.paymentDate > end) {
          upcoming.push({
            id: tx.id, name: tx.name, value: tx.predictedValue,
            predictedValue: tx.predictedValue,
            paymentDate: tx.paymentDate, extractedName: displayName,
          })
        } else {
          // Past due but not realized
          const daysOverdue = Math.floor(
            (Date.now() - new Date(tx.paymentDate).getTime()) / (1000 * 60 * 60 * 24)
          )
          overdue.push({
            id: tx.id, name: tx.name, value: tx.predictedValue,
            predictedValue: tx.predictedValue,
            paymentDate: tx.paymentDate, daysOverdue, extractedName: displayName,
          })
        }
      }

      // Predicted revenue = predictedValue for all (realized or not)
      monthlyPredicted.set(ym, (monthlyPredicted.get(ym) ?? 0) + tx.predictedValue)
    }

    // ── Merge all months ──────────────────────────────────────────────────────
    const allYMs = new Set([
      ...monthlyCost.keys(),
      ...monthlyRealized.keys(),
      ...monthlyPredicted.keys(),
    ])

    const monthly = Array.from(allYMs).sort().map((ym) => ({
      month: ym,
      label: monthLabel(ym),
      isFuture: ym > todayYM,
      cost: monthlyCost.get(ym) ?? 0,
      revenue: monthlyRealized.get(ym) ?? 0,
      predictedRevenue: monthlyPredicted.get(ym) ?? 0,
      result: (monthlyRealized.get(ym) ?? 0) - (monthlyCost.get(ym) ?? 0),
    }))

    // ── KPI summary ───────────────────────────────────────────────────────────
    const pastMonths = monthly.filter((m) => !m.isFuture)
    const totalRealized = pastMonths.reduce((s, m) => s + m.revenue, 0)
    const totalCost     = pastMonths.reduce((s, m) => s + m.cost, 0)
    const netBalance    = totalRealized - totalCost

    const futureMonths  = monthly.filter((m) => m.isFuture && m.predictedRevenue > 0)
    const next3Forecast = futureMonths.slice(0, 3).reduce((s, m) => s + m.predictedRevenue, 0)

    const last3Costs = pastMonths.filter((m) => m.cost > 0).slice(-3)
    const avgCost    = last3Costs.length > 0
      ? last3Costs.reduce((s, m) => s + m.cost, 0) / last3Costs.length
      : 0

    // Sort upcoming/overdue by date
    upcoming.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({
      monthly,
      upcoming,
      overdue,
      summary: {
        totalRealized,
        totalCost,
        netBalance,
        next3Forecast,
        avgMonthlyCost: avgCost,
        nextEntry: futureMonths[0] ?? null,
        totalOverdue: overdue.reduce((s, t) => s + t.value, 0),
      },
    })
  } catch (err) {
    console.error('Cashflow API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
