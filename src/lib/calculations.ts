import { ClockifyEntry, ProjectCostData, CollaboratorSummary, ProjectPL, DashboardData, MonthlyData, ComparisonKPIs, AlertItem } from '@/types'
import { COLLABORATORS, COLLABORATOR_MAP } from '@/config/collaborators'
import { NotionTransaction } from '@/types'
import { extractProjectName } from '@/config/projectMapping'

const LOW_MARGIN_THRESHOLD = 0.20 // below 20% margin = "Margem baixa"

// --- COST CALCULATIONS ---

export function calculateCosts(entries: ClockifyEntry[]): {
  projectCosts: Map<string, ProjectCostData>
  overheadCost: number
  overheadHours: number
  userMonthHours: Map<string, Map<string, number>> // userId → month → total hours
} {
  // Step 1: Build userMonthHours (total hours per user per month across all entries)
  const userMonthHours = new Map<string, Map<string, number>>()

  for (const entry of entries) {
    const collab = COLLABORATOR_MAP.get(entry.userId)
    if (!collab) continue

    if (!userMonthHours.has(entry.userId)) userMonthHours.set(entry.userId, new Map())
    const monthMap = userMonthHours.get(entry.userId)!
    const prev = monthMap.get(entry.month) ?? 0
    monthMap.set(entry.month, prev + entry.duration / 3600)
  }

  // Step 2: Calculate cost per entry
  const projectCosts = new Map<string, ProjectCostData>()
  let overheadCost = 0
  let overheadHours = 0

  for (const entry of entries) {
    const collab = COLLABORATOR_MAP.get(entry.userId)
    if (!collab) continue

    const hours = entry.duration / 3600

    // Determine hourly rate
    let rate: number
    if (collab.hourlyRate !== undefined) {
      rate = collab.hourlyRate
    } else {
      // Dynamic: salary / total hours that month
      const totalHoursThisMonth = userMonthHours.get(entry.userId)?.get(entry.month) ?? hours
      rate = (collab.monthlySalary ?? 0) / totalHoursThisMonth
    }

    const cost = hours * rate

    // Overhead (no project)
    if (!entry.projectId) {
      overheadCost += cost
      overheadHours += hours
      continue
    }

    const projectId = entry.projectId
    const projectName = entry.projectName ?? projectId

    if (!projectCosts.has(projectId)) {
      projectCosts.set(projectId, {
        projectId,
        projectName,
        totalHours: 0,
        totalCost: 0,
        costByCollaborator: {},
      })
    }

    const proj = projectCosts.get(projectId)!
    proj.totalHours += hours
    proj.totalCost += cost

    if (!proj.costByCollaborator[entry.userId]) {
      proj.costByCollaborator[entry.userId] = {
        hours: 0,
        cost: 0,
        name: collab.name,
        color: collab.color,
      }
    }
    proj.costByCollaborator[entry.userId].hours += hours
    proj.costByCollaborator[entry.userId].cost += cost
  }

  return { projectCosts, overheadCost, overheadHours, userMonthHours }
}

// --- COLLABORATOR SUMMARIES ---

export function buildCollaboratorSummaries(
  entries: ClockifyEntry[],
  userMonthHours: Map<string, Map<string, number>>
): { summaries: CollaboratorSummary[]; total: number } {
  const totals = new Map<string, { totalCost: number; totalHours: number }>()

  for (const entry of entries) {
    const collab = COLLABORATOR_MAP.get(entry.userId)
    if (!collab) continue

    const hours = entry.duration / 3600
    let rate: number
    if (collab.hourlyRate !== undefined) {
      rate = collab.hourlyRate
    } else {
      const totalHoursThisMonth = userMonthHours.get(entry.userId)?.get(entry.month) ?? hours
      rate = (collab.monthlySalary ?? 0) / totalHoursThisMonth
    }
    const cost = hours * rate

    if (!totals.has(entry.userId)) totals.set(entry.userId, { totalCost: 0, totalHours: 0 })
    const t = totals.get(entry.userId)!
    t.totalCost += cost
    t.totalHours += hours
  }

  const total = Array.from(totals.values()).reduce((s, v) => s + v.totalCost, 0)

  const summaries: CollaboratorSummary[] = COLLABORATORS.map((c) => {
    const t = totals.get(c.id) ?? { totalCost: 0, totalHours: 0 }
    return {
      id: c.id,
      name: c.name,
      color: c.color,
      totalCost: t.totalCost,
      totalHours: t.totalHours,
      effectiveHourlyRate: t.totalHours > 0 ? t.totalCost / t.totalHours : (c.hourlyRate ?? 0),
      percentOfTotal: total > 0 ? (t.totalCost / total) * 100 : 0,
    }
  }).filter((s) => s.totalHours > 0)
    .sort((a, b) => b.totalCost - a.totalCost)

  return { summaries, total }
}

// --- REVENUE MATCHING ---

export function matchRevenueToProjects(
  transactions: NotionTransaction[],
  clockifyProjectNames: string[]
): Map<string, { revenue: number; hasPreTracking: boolean }> {
  const revenueMap = new Map<string, { revenue: number; hasPreTracking: boolean }>()

  const TRACKING_START = new Date('2025-06-01')

  for (const tx of transactions) {
    if (!tx.realized) continue

    const extracted = extractProjectName(tx.name)
    if (!extracted) continue // unassigned revenue (platform, etc.)

    // Fuzzy match against Clockify project names
    const matched = fuzzyMatch(extracted, clockifyProjectNames)
    if (!matched) continue

    if (!revenueMap.has(matched)) {
      revenueMap.set(matched, { revenue: 0, hasPreTracking: false })
    }
    const entry = revenueMap.get(matched)!
    entry.revenue += tx.value

    // Flag pre-tracking revenue
    if (tx.paymentDate && new Date(tx.paymentDate) < TRACKING_START) {
      entry.hasPreTracking = true
    }
  }

  return revenueMap
}

// Generic single words that should never trigger a contains-match
const GENERIC_WORDS = new Set(['design', 'web', 'app', 'site', 'logo', 'brand', 'ui', 'ux', 'slides', 'video'])

function fuzzyMatch(extracted: string, options: string[]): string | null {
  const lower = extracted.toLowerCase().trim()
  if (!lower) return null

  // Exact match (case-insensitive)
  const exact = options.find((o) => o.toLowerCase() === lower)
  if (exact) return exact

  // Contains match — only if extracted has 2+ words OR is not a generic word
  const isGeneric = GENERIC_WORDS.has(lower) || lower.split(' ').length < 2
  if (!isGeneric) {
    const contains = options.find(
      (o) => o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase())
    )
    if (contains) return contains
  }

  return null
}

// --- FINAL DASHBOARD DATA ---

export function buildDashboardData(
  entries: ClockifyEntry[],
  transactions: NotionTransaction[],
  startDate: string,
  endDate: string
): DashboardData {
  const { projectCosts, overheadCost, overheadHours, userMonthHours } = calculateCosts(entries)
  const { summaries, total: totalCostAllCollaborators } = buildCollaboratorSummaries(entries, userMonthHours)

  const clockifyProjectNames = Array.from(projectCosts.values()).map((p) => p.projectName)
  const revenueMap = matchRevenueToProjects(transactions, clockifyProjectNames)

  const totalCost = Array.from(projectCosts.values()).reduce((s, p) => s + p.totalCost, 0) + overheadCost

  // Sort projects by cost
  const sortedProjects = Array.from(projectCosts.values()).sort((a, b) => b.totalCost - a.totalCost)

  // Most expensive project
  const mostExpensive = sortedProjects[0] ?? { projectName: '-', totalCost: 0 }

  // Highest cost-per-hour collaborator
  const highestRateCollab = summaries.reduce(
    (best, c) => (c.effectiveHourlyRate > best.effectiveHourlyRate ? c : best),
    summaries[0] ?? { name: '-', effectiveHourlyRate: 0, totalCost: 0, percentOfTotal: 0 }
  )

  // Overhead percent (of total hours)
  const totalHours = entries.reduce((s, e) => s + e.duration / 3600, 0)
  const overheadPercent = totalHours > 0 ? (overheadHours / totalHours) * 100 : 0

  // Build P&L
  const pl: ProjectPL[] = sortedProjects.map((p) => {
    const rev = revenueMap.get(p.projectName)
    const revenue = rev?.revenue ?? 0
    const cost = p.totalCost
    const result = revenue - cost
    const margin = revenue > 0 ? (result / revenue) * 100 : null

    let status: ProjectPL['status'] = 'Lucro'
    if (result < 0) status = 'Prejuízo'
    else if (margin !== null && margin < LOW_MARGIN_THRESHOLD * 100) status = 'Margem baixa'

    return {
      clockifyProjectName: p.projectName,
      clockifyProjectId: p.projectId,
      hours: p.totalHours,
      revenue,
      cost,
      result,
      margin,
      status,
      hasAttention: rev?.hasPreTracking ?? false,
    }
  })

  // --- MONTHLY BREAKDOWN ---
  const MONTH_LABELS: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
  }

  // Cost per month from entries
  const monthlyCost = new Map<string, number>()
  for (const entry of entries) {
    const collab = COLLABORATOR_MAP.get(entry.userId)
    if (!collab) continue
    const hours = entry.duration / 3600
    let rate: number
    if (collab.hourlyRate !== undefined) {
      rate = collab.hourlyRate
    } else {
      const totalHoursThisMonth = userMonthHours.get(entry.userId)?.get(entry.month) ?? hours
      rate = (collab.monthlySalary ?? 0) / totalHoursThisMonth
    }
    monthlyCost.set(entry.month, (monthlyCost.get(entry.month) ?? 0) + hours * rate)
  }

  // Revenue per month from Notion payment dates (realized only)
  const monthlyRevenue = new Map<string, number>()
  const monthlyPredictedRevenue = new Map<string, number>()
  for (const tx of transactions) {
    if (!tx.paymentDate) continue
    const month = tx.paymentDate.slice(0, 7) // YYYY-MM
    if (tx.realized) {
      monthlyRevenue.set(month, (monthlyRevenue.get(month) ?? 0) + tx.value)
    }
    // predicted: sum Valor Previsto for all entries (realized or not)
    monthlyPredictedRevenue.set(month, (monthlyPredictedRevenue.get(month) ?? 0) + tx.predictedValue)
  }

  // Collaborator effective rates per month: userId → month → R$/h
  const collaboratorMonthRates = new Map<string, Map<string, number>>()
  for (const [userId, monthMap] of userMonthHours.entries()) {
    const collab = COLLABORATOR_MAP.get(userId)
    if (!collab) continue
    const rateMap = new Map<string, number>()
    for (const [month, hours] of monthMap.entries()) {
      const rate = collab.hourlyRate !== undefined
        ? collab.hourlyRate
        : (collab.monthlySalary ?? 0) / hours
      rateMap.set(month, rate)
    }
    collaboratorMonthRates.set(userId, rateMap)
  }

  // Merge and sort
  const allMonths = new Set([...monthlyCost.keys(), ...monthlyRevenue.keys(), ...monthlyPredictedRevenue.keys()])
  const monthly: MonthlyData[] = Array.from(allMonths)
    .sort()
    .map((m) => {
      const [year, mon] = m.split('-')
      const cost = monthlyCost.get(m) ?? 0
      const revenue = monthlyRevenue.get(m) ?? 0
      const predictedRevenue = monthlyPredictedRevenue.get(m) ?? 0

      // Build collaboratorRates for this month
      const collaboratorRates: Record<string, number> = {}
      for (const [userId, rateMap] of collaboratorMonthRates.entries()) {
        const rate = rateMap.get(m)
        if (rate !== undefined) collaboratorRates[userId] = rate
      }

      return {
        month: m,
        label: `${MONTH_LABELS[mon]}/${year.slice(2)}`,
        cost,
        revenue,
        predictedRevenue,
        result: revenue - cost,
        collaboratorRates,
      }
    })

  // Alerts
  const ALERT_LOSS_THRESHOLD = 5000
  const ALERT_NO_REVENUE_COST_THRESHOLD = 3000
  const alerts: AlertItem[] = pl
    .filter((p) => {
      if (p.result < -ALERT_LOSS_THRESHOLD) return true
      if (p.margin !== null && p.margin < LOW_MARGIN_THRESHOLD * 100 && p.result >= 0) return true
      if (p.revenue === 0 && p.cost >= ALERT_NO_REVENUE_COST_THRESHOLD) return true
      return false
    })
    .map((p) => ({
      projectName: p.clockifyProjectName,
      type: p.result < 0 ? 'loss' : p.revenue === 0 ? 'no-revenue' : 'low-margin',
      cost: p.cost,
      revenue: p.revenue,
      result: p.result,
      hours: p.hours,
    } as AlertItem))

  // Comparison KPIs (previous period of same length)
  const comparison = buildComparisonKPIs(transactions, startDate, endDate)

  return {
    period: { start: startDate, end: endDate },
    totalCost,
    overheadCost,
    overheadHours,
    overheadPercent,
    mostExpensiveProject: { name: mostExpensive.projectName, cost: mostExpensive.totalCost },
    highestCostPerHour: {
      name: highestRateCollab?.name ?? '-',
      rate: highestRateCollab?.effectiveHourlyRate ?? 0,
      percentOfTotal: highestRateCollab?.percentOfTotal ?? 0,
    },
    costByProject: sortedProjects,
    collaborators: summaries,
    totalCostAllCollaborators,
    pl,
    monthly,
    comparison,
    alerts,
  }
}

function buildComparisonKPIs(
  transactions: NotionTransaction[],
  startDate: string,
  endDate: string
): ComparisonKPIs | null {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  if (days <= 0) return null

  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - (days - 1))

  const prevStartStr = prevStart.toISOString().split('T')[0]
  const prevEndStr = prevEnd.toISOString().split('T')[0]

  let totalRevenue = 0
  for (const tx of transactions) {
    if (!tx.realized || !tx.paymentDate) continue
    if (tx.paymentDate >= prevStartStr && tx.paymentDate <= prevEndStr) {
      totalRevenue += tx.value
    }
  }

  // We don't have prev-period Clockify data here, so return revenue only
  // totalCost and netResult use null sentinel so KPICards skips those deltas
  return {
    totalCost: 0,      // placeholder — not available without extra Clockify fetch
    totalRevenue,
    netResult: 0,
    overheadPercent: 0,
  }
}
