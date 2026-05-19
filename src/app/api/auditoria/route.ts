import { NextRequest, NextResponse } from 'next/server'
import { fetchAllTimeEntries } from '@/lib/clockify'
import { fetchAllTransactions } from '@/lib/notion'
import { extractProjectName } from '@/config/projectMapping'

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
      entries
        .filter((e) => e.projectName)
        .map((e) => e.projectName as string)
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
      } else if (extracted === null) {
        status = 'ignored' // manually set to null in projectMapping
      } else {
        matchedProject = fuzzyMatchDebug(extracted, clockifyProjects)
        status = matchedProject ? 'matched' : 'unmatched'
      }

      return {
        id: tx.id,
        name: tx.name,
        value: tx.value,
        predictedValue: tx.predictedValue,
        realized: tx.realized,
        paymentDate: tx.paymentDate,
        extractedName: extracted,
        matchedProject,
        status,
      }
    })

    // Filter to period for revenue stats
    const periodTx = auditTransactions.filter(
      (tx) => tx.paymentDate && tx.paymentDate >= start && tx.paymentDate <= end
    )

    const totalRealizedRevenue = periodTx
      .filter((tx) => tx.realized)
      .reduce((s, tx) => s + tx.value, 0)

    const totalMatchedRevenue = periodTx
      .filter((tx) => tx.status === 'matched')
      .reduce((s, tx) => s + tx.value, 0)

    const totalIgnoredRevenue = periodTx
      .filter((tx) => tx.status === 'ignored')
      .reduce((s, tx) => s + tx.value, 0)

    const totalUnmatchedRevenue = periodTx
      .filter((tx) => tx.status === 'unmatched')
      .reduce((s, tx) => s + tx.value, 0)

    // Projects with no revenue
    const revenueByProject = new Set(
      auditTransactions
        .filter((tx) => tx.status === 'matched' && tx.matchedProject)
        .map((tx) => tx.matchedProject as string)
    )
    const projectsWithNoRevenue = clockifyProjects.filter(
      (p) => !revenueByProject.has(p)
    ).map((p) => ({
      name: p,
      hours: Math.round(hoursPerProject[p] ?? 0),
    }))

    // Projects with revenue but no Clockify hours in period
    const revenueProjectsNoHours = auditTransactions
      .filter((tx) => tx.status === 'matched' && tx.matchedProject && tx.realized)
      .map((tx) => tx.matchedProject as string)
      .filter((p, i, arr) => arr.indexOf(p) === i) // unique
      .filter((p) => !hoursPerProject[p])
      .map((p) => ({
        name: p,
        revenue: auditTransactions
          .filter((tx) => tx.matchedProject === p && tx.realized)
          .reduce((s, tx) => s + tx.value, 0),
      }))

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
    })
  } catch (err) {
    console.error('Audit API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
