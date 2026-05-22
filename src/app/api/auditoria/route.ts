import { NextRequest, NextResponse } from 'next/server'
import { fetchAllTimeEntries } from '@/lib/clockify'
import { fetchAllTransactions } from '@/lib/notion'
import { extractProjectName } from '@/config/projectMapping'

// ─── Matching ────────────────────────────────────────────────────────────────

function fuzzyMatchDebug(extracted: string, options: string[]): string | null {
  const GENERIC_WORDS = new Set(['design', 'web', 'app', 'site', 'logo', 'brand', 'ui', 'ux', 'slides', 'video'])
  const lower = extracted.toLowerCase().trim()
  if (!lower) return null
  const exact = options.find((o) => o.toLowerCase() === lower)
  if (exact) return exact
  const isGeneric = GENERIC_WORDS.has(lower) || lower.split(' ').length < 2
  if (!isGeneric) {
    const contains = options.find(
      (o) => o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase())
    )
    if (contains) return contains
  }
  return null
}

// ─── Similarity for suggestions ──────────────────────────────────────────────

function wordSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().split(/[\s\-_/()]+/).filter((w) => w.length > 1))
  const wa = tokenize(a)
  const wb = tokenize(b)
  if (wa.size === 0 || wb.size === 0) return 0
  let common = 0
  for (const w of wa) if (wb.has(w)) common++
  // also give partial credit for substring matches
  let partial = 0
  for (const w of wa) {
    for (const v of wb) {
      if (w !== v && (w.includes(v) || v.includes(w))) partial += 0.4
    }
  }
  return Math.min(1, (common + partial) / Math.max(wa.size, wb.size))
}

// ─── Month label helper ───────────────────────────────────────────────────────

function monthLabel(ym: string): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const [y, m] = ym.split('-')
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const start = searchParams.get('start') ?? '2025-06-01'
    const end = searchParams.get('end') ?? new Date().toISOString().split('T')[0]

    const [entries, transactions] = await Promise.all([
      fetchAllTimeEntries(start, end),
      fetchAllTransactions(),
    ])

    // All unique Clockify project names in the period
    const clockifyProjects = [...new Set(
      entries.filter((e) => e.projectName).map((e) => e.projectName as string)
    )].sort()

    // Clockify hours per project
    const hoursPerProject: Record<string, number> = {}
    for (const e of entries) {
      if (!e.projectName) continue
      hoursPerProject[e.projectName] = (hoursPerProject[e.projectName] ?? 0) + e.duration / 3600
    }

    // Audit each transaction
    const auditTransactions = transactions.map((tx) => {
      const extracted = extractProjectName(tx.name)
      let status: 'matched' | 'ignored' | 'unmatched' | 'not-realized'
      let matchedProject: string | null = null

      if (!tx.realized) {
        status = 'not-realized'
      } else {
        // Priority 1: use the "Projetos" relation the user set in Notion directly
        if (tx.linkedProjectNames.length > 0) {
          for (const linkedName of tx.linkedProjectNames) {
            // exact / contains match
            matchedProject = fuzzyMatchDebug(linkedName, clockifyProjects)
            if (matchedProject) break
            // similarity fallback
            const best = clockifyProjects
              .map((p) => ({ p, score: wordSimilarity(linkedName, p) }))
              .filter((x) => x.score > 0.15)
              .sort((a, b) => b.score - a.score)[0]
            if (best) { matchedProject = best.p; break }
          }
          status = matchedProject ? 'matched' : 'unmatched'
        // Priority 2: fallback — extract project name from transaction title
        } else if (extracted === null) {
          status = 'ignored'
        } else {
          matchedProject = fuzzyMatchDebug(extracted, clockifyProjects)
          status = matchedProject ? 'matched' : 'unmatched'
        }
      }

      return {
        id: tx.id,
        name: tx.name,
        value: tx.value,
        predictedValue: tx.predictedValue,
        realized: tx.realized,
        paymentDate: tx.paymentDate,
        extractedName: tx.linkedProjectNames[0] ?? extracted,  // show linked name if available
        matchedProject,
        status,
      }
    })

    // Filter to period
    const periodTx = auditTransactions.filter(
      (tx) => tx.paymentDate && tx.paymentDate >= start && tx.paymentDate <= end
    )

    // ── Summary ──────────────────────────────────────────────────────────────

    const totalRealizedRevenue = periodTx.filter((tx) => tx.realized).reduce((s, tx) => s + tx.value, 0)
    const totalMatchedRevenue  = periodTx.filter((tx) => tx.status === 'matched').reduce((s, tx) => s + tx.value, 0)
    const totalIgnoredRevenue  = periodTx.filter((tx) => tx.status === 'ignored').reduce((s, tx) => s + tx.value, 0)
    const totalUnmatchedRevenue = periodTx.filter((tx) => tx.status === 'unmatched').reduce((s, tx) => s + tx.value, 0)

    // ── Projects with no revenue ─────────────────────────────────────────────

    const revenueByProject = new Set(
      auditTransactions
        .filter((tx) => tx.status === 'matched' && tx.matchedProject)
        .map((tx) => tx.matchedProject as string)
    )
    const projectsWithNoRevenue = clockifyProjects
      .filter((p) => !revenueByProject.has(p))
      .map((p) => ({ name: p, hours: Math.round(hoursPerProject[p] ?? 0) }))

    // ── Revenue without Clockify hours ───────────────────────────────────────

    const revenueProjectsNoHours = auditTransactions
      .filter((tx) => tx.status === 'matched' && tx.matchedProject && tx.realized)
      .map((tx) => tx.matchedProject as string)
      .filter((p, i, arr) => arr.indexOf(p) === i)
      .filter((p) => !hoursPerProject[p])
      .map((p) => ({
        name: p,
        revenue: auditTransactions
          .filter((tx) => tx.matchedProject === p && tx.realized)
          .reduce((s, tx) => s + tx.value, 0),
      }))

    // ── Match suggestions for unmatched transactions ─────────────────────────

    const suggestions = auditTransactions
      .filter((tx) => tx.status === 'unmatched' && tx.extractedName)
      .map((tx) => {
        const scored = clockifyProjects
          .map((p) => ({ project: p, score: wordSimilarity(tx.extractedName!, p) }))
          .filter((s) => s.score > 0.1)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
        return {
          txId: tx.id,
          txName: tx.name,
          txValue: tx.value,
          extractedName: tx.extractedName!,
          paymentDate: tx.paymentDate,
          suggestions: scored,
        }
      })
      .filter((s) => s.suggestions.length > 0)

    // ── Monthly breakdown ─────────────────────────────────────────────────────

    const monthlyMap: Record<string, { matched: number; unmatched: number; ignored: number; notRealized: number; matchedValue: number; unmatchedValue: number }> = {}
    for (const tx of auditTransactions) {
      if (!tx.paymentDate) continue
      const ym = tx.paymentDate.slice(0, 7)
      if (!monthlyMap[ym]) monthlyMap[ym] = { matched: 0, unmatched: 0, ignored: 0, notRealized: 0, matchedValue: 0, unmatchedValue: 0 }
      const key = tx.status === 'not-realized' ? 'notRealized' : tx.status as 'matched' | 'unmatched' | 'ignored'
      monthlyMap[ym][key]++
      if (tx.status === 'matched')   monthlyMap[ym].matchedValue += tx.value
      if (tx.status === 'unmatched') monthlyMap[ym].unmatchedValue += tx.value
    }
    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, counts]) => ({
        ym,
        label: monthLabel(ym),
        ...counts,
        total: counts.matched + counts.unmatched + counts.ignored + counts.notRealized,
      }))

    // ── Duplicate detector ────────────────────────────────────────────────────

    interface DupGroup {
      transactions: Array<{ id: string; name: string; value: number; paymentDate: string | null; status: string }>
      value: number
      month: string
    }
    const duplicateGroups: DupGroup[] = []
    const seenDup = new Set<string>()

    for (let i = 0; i < auditTransactions.length; i++) {
      const a = auditTransactions[i]
      if (!a.paymentDate || seenDup.has(a.id)) continue
      const group: typeof auditTransactions = [a]

      for (let j = i + 1; j < auditTransactions.length; j++) {
        const b = auditTransactions[j]
        if (seenDup.has(b.id) || !b.paymentDate) continue
        const sameMonth = a.paymentDate.slice(0, 7) === b.paymentDate.slice(0, 7)
        const sameValue = a.value === b.value
        const sim = wordSimilarity(a.name, b.name)
        if (sameMonth && sameValue && sim >= 0.45) group.push(b)
      }

      if (group.length > 1) {
        group.forEach((tx) => seenDup.add(tx.id))
        duplicateGroups.push({
          transactions: group.map((tx) => ({
            id: tx.id, name: tx.name, value: tx.value,
            paymentDate: tx.paymentDate, status: tx.status,
          })),
          value: a.value,
          month: monthLabel(a.paymentDate.slice(0, 7)),
        })
      }
    }

    // ── Implied rate per project ──────────────────────────────────────────────

    const rateAcc: Record<string, { revenue: number; hours: number }> = {}
    for (const tx of auditTransactions) {
      if (tx.status !== 'matched' || !tx.matchedProject || !tx.realized) continue
      const p = tx.matchedProject
      if (!rateAcc[p]) rateAcc[p] = { revenue: 0, hours: hoursPerProject[p] ?? 0 }
      rateAcc[p].revenue += tx.value
    }
    const impliedRates = Object.entries(rateAcc)
      .filter(([, d]) => d.hours > 0)
      .map(([name, d]) => ({
        name,
        revenue: d.revenue,
        hours: Math.round(d.hours * 10) / 10,
        rate: Math.round(d.revenue / d.hours),
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // avg rate for anomaly flag
    const avgRate = impliedRates.length
      ? impliedRates.reduce((s, r) => s + r.rate, 0) / impliedRates.length
      : 0

    const impliedRatesAnnotated = impliedRates.map((r) => ({
      ...r,
      anomaly: avgRate > 0 && (r.rate > avgRate * 2.5 || r.rate < avgRate * 0.25),
    }))

    // ── Overdue not-realized (> 30 days past expected date) ──────────────────

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    const overdueNotRealized = auditTransactions
      .filter((tx) => tx.status === 'not-realized' && tx.paymentDate && tx.paymentDate <= thirtyDaysAgo)
      .map((tx) => ({
        id: tx.id,
        name: tx.name,
        value: tx.value,
        paymentDate: tx.paymentDate,
        daysOverdue: Math.floor(
          (Date.now() - new Date(tx.paymentDate!).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)

    return NextResponse.json({
      period: { start, end },
      clockifyProjects,
      transactions: auditTransactions,
      periodTransactions: periodTx,
      summary: {
        totalRealizedRevenue,
        totalMatchedRevenue,
        totalIgnoredRevenue,
        totalUnmatchedRevenue,
        matchedCount: periodTx.filter((tx) => tx.status === 'matched').length,
        unmatchedCount: periodTx.filter((tx) => tx.status === 'unmatched').length,
        ignoredCount: periodTx.filter((tx) => tx.status === 'ignored').length,
        notRealizedCount: periodTx.filter((tx) => tx.status === 'not-realized').length,
      },
      projectsWithNoRevenue,
      revenueProjectsNoHours,
      suggestions,
      monthlyBreakdown,
      duplicateGroups,
      impliedRates: impliedRatesAnnotated,
      overdueNotRealized,
    })
  } catch (err) {
    console.error('Audit API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
