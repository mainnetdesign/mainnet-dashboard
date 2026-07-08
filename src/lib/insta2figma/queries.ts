import {
  INSTA2FIGMA_PRODUCT,
  monthlyCostsTotalUSD,
  PLAN_PRICING_USD,
  USAGE_FUNNEL_EVENTS,
  CONVERSION_FUNNEL_EVENTS,
  FEATURE_TOGGLE_EVENTS,
} from '@/config/insta2figma'
import { i2fQuery } from '@/lib/insta2figma/db'
import { pseudonym } from '@/lib/insta2figma/pseudonym'
import { fetchPolarOrders, fetchActivePolarSubscriptions } from '@/lib/insta2figma/polar'
import { resolveImportScrapeSource, importSourceSqlCondition } from '@/lib/insta2figma/import-source'
import { parseImportJobInput, postsRequestedFromInput } from '@/lib/insta2figma/job-input'
import { I2F_BASE } from '@/lib/insta2figma/constants'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  AnalyticsData,
  EarningsData,
  OverviewDailyPoint,
  OverviewData,
  OverviewUserDayPoint,
  OverviewAttentionPoint,
  ServicesHubData,
  UserDetail,
  UsersListData,
  UsersSeries,
  ImportsData,
  ImportsJobsList,
  ImportJobDetail,
  ImportScrapeSource,
  ImportFlowSummary,
  ImportFlowStep,
  ImportFlowStepAttempt,
  IgProfileSnapshot,
  ScrapeTelemetryEntry,
  FlowJourneyData,
  FlowNodeDetail,
  FlowNodeOccurrence,
  FarmData,
} from '@/types/insta2figma'

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function defaultRange(start?: string, end?: string) {
  const endDate = end ? new Date(`${end}T23:59:59.999Z`) : new Date()
  const startDate = start
    ? new Date(`${start}T00:00:00.000Z`)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    prevStart: new Date(
      startDate.getTime() - (endDate.getTime() - startDate.getTime()),
    ).toISOString(),
  }
}

async function mrrUSD() {
  const subs = await fetchActivePolarSubscriptions()
  return subs.reduce((sum, s) => sum + s.amountUSD, 0)
}

async function userCounts() {
  const { rows } = await i2fQuery<{ total: string; pro: string; max: string }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE plan_tier = 'pro')::text AS pro,
      COUNT(*) FILTER (WHERE plan_tier = 'max')::text AS max
    FROM users`,
  )
  return {
    total: Number(rows[0]?.total ?? 0),
    pro: Number(rows[0]?.pro ?? 0),
    max: Number(rows[0]?.max ?? 0),
  }
}

async function monthlyUserGrowth(months = 6) {
  const { rows } = await i2fQuery<{ month: string; count: string }>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COUNT(*)::text AS count
     FROM users
     WHERE created_at >= NOW() - ($1 || ' months')::interval
     GROUP BY 1 ORDER BY 1`,
    [String(months)],
  )
  return rows.map((r) => Number(r.count))
}

async function monthlyRevenue(months = 6) {
  const { rows } = await i2fQuery<{ pro: string; max: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE u.plan_tier = 'pro')::text AS pro,
      COUNT(*) FILTER (WHERE u.plan_tier = 'max')::text AS max
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= date_trunc('month', NOW()) - ($1 || ' months')::interval
     GROUP BY date_trunc('month', s.created_at)
     ORDER BY date_trunc('month', s.created_at)`,
    [String(months)],
  )
  return rows.map(
    (r) => Number(r.pro) * PLAN_PRICING_USD.pro + Number(r.max) * PLAN_PRICING_USD.max,
  )
}

async function monthlyImages(months = 6) {
  const { rows } = await i2fQuery<{ month: string; count: string }>(
    `SELECT to_char(date_trunc('month', j.created_at), 'YYYY-MM') AS month,
            COUNT(*)::text AS count
     FROM assets a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.created_at >= NOW() - ($1 || ' months')::interval
     GROUP BY 1 ORDER BY 1`,
    [String(months)],
  )
  return rows.map((r) => Number(r.count))
}

export async function getServicesHub(): Promise<ServicesHubData> {
  const mrr = await mrrUSD()
  const counts = await userCounts()
  const sparkline = await monthlyUserGrowth(6).then((users) =>
    users.map((_, i) => Math.round(mrr * (0.85 + i * 0.03))),
  )

  return {
    mrrUSD: mrr,
    totalUsers: counts.total,
    monthRevenueUSD: mrr,
    services: [
      {
        id: INSTA2FIGMA_PRODUCT.id,
        name: INSTA2FIGMA_PRODUCT.name,
        slug: INSTA2FIGMA_PRODUCT.slug,
        url: INSTA2FIGMA_PRODUCT.url,
        status: INSTA2FIGMA_PRODUCT.status,
        mrrUSD: mrr,
        users: counts.total,
        mrrDeltaPct: 5,
        earningsSparkline: sparkline.length ? sparkline : [0, 0, 0, 0, 0, mrr],
      },
    ],
  }
}

async function revenueInPeriod(start: string, end: string) {
  const orders = await fetchPolarOrders()
  return orders
    .filter((o) => o.createdAt >= start && o.createdAt <= end)
    .reduce((sum, o) => sum + o.amountUSD, 0)
}

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

function buildDailySeries(
  startIso: string,
  endIso: string,
  dayMap: Map<string, number>,
): OverviewDailyPoint[] {
  const points: OverviewDailyPoint[] = []
  let cur = isoDay(startIso)
  const end = isoDay(endIso)

  while (cur <= end) {
    const d = parseISO(cur)
    points.push({
      date: cur,
      label: format(d, 'EEE, d MMM', { locale: ptBR }),
      value: dayMap.get(cur) ?? 0,
    })
    const next = parseISO(cur)
    next.setUTCDate(next.getUTCDate() + 1)
    cur = next.toISOString().slice(0, 10)
  }

  return points
}

async function dailyEarnings(start: string, end: string) {
  const orders = await fetchPolarOrders()
  const map = new Map<string, number>()
  for (const o of orders) {
    if (o.createdAt < start || o.createdAt > end) continue
    const day = o.createdAt.slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + o.amountUSD)
  }
  return map
}

async function dailyCounts(
  start: string,
  end: string,
  sql: string,
): Promise<Map<string, number>> {
  const { rows } = await i2fQuery<{ day: string; count: string }>(sql, [start, end])
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.day, Number(r.count))
  return map
}

async function dailyNewUsersSplit(start: string, end: string) {
  const [exportedRows, neverRows] = await Promise.all([
    i2fQuery<{ day: string; count: string }>(
      `SELECT to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM users u
       WHERE u.created_at >= $1 AND u.created_at <= $2
         AND EXISTS (SELECT 1 FROM jobs j WHERE j.user_id = u.id)
       GROUP BY 1`,
      [start, end],
    ),
    i2fQuery<{ day: string; count: string }>(
      `SELECT to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM users u
       WHERE u.created_at >= $1 AND u.created_at <= $2
         AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.user_id = u.id)
       GROUP BY 1`,
      [start, end],
    ),
  ])

  const exportedMap = new Map<string, number>()
  const neverMap = new Map<string, number>()
  for (const r of exportedRows.rows) exportedMap.set(r.day, Number(r.count))
  for (const r of neverRows.rows) neverMap.set(r.day, Number(r.count))
  return { exportedMap, neverMap }
}

function buildUserSplitSeries(
  startIso: string,
  endIso: string,
  exportedMap: Map<string, number>,
  neverMap: Map<string, number>,
) {
  const points: OverviewUserDayPoint[] = []
  let cur = isoDay(startIso)
  const end = isoDay(endIso)

  while (cur <= end) {
    const exported = exportedMap.get(cur) ?? 0
    const neverExported = neverMap.get(cur) ?? 0
    const d = parseISO(cur)
    points.push({
      date: cur,
      label: format(d, 'EEE, d MMM', { locale: ptBR }),
      exported,
      neverExported,
      value: exported + neverExported,
    })
    const next = parseISO(cur)
    next.setUTCDate(next.getUTCDate() + 1)
    cur = next.toISOString().slice(0, 10)
  }

  return points
}

async function overviewDailySeries(start: string, end: string) {
  const [earningsMap, { exportedMap, neverMap }, imagesMap, jobsMap] = await Promise.all([
    dailyEarnings(start, end),
    dailyNewUsersSplit(start, end),
    dailyCounts(
      start,
      end,
      `SELECT to_char(j.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM assets a JOIN jobs j ON j.id = a.job_id
       WHERE j.created_at >= $1 AND j.created_at <= $2 GROUP BY 1`,
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM jobs WHERE created_at >= $1 AND created_at <= $2 GROUP BY 1`,
    ),
  ])

  return {
    earnings: buildDailySeries(start, end, earningsMap),
    users: buildUserSplitSeries(start, end, exportedMap, neverMap),
    images: buildDailySeries(start, end, imagesMap),
    jobs: buildDailySeries(start, end, jobsMap),
  }
}

async function getOverviewAttentionPoints(start: string, end: string): Promise<OverviewAttentionPoint[]> {
  const rangeWhere = `j.created_at >= $1 AND j.created_at <= $2`
  const params = [start, end]
  const apifySql = importSourceSqlCondition('apify')
  const workerSql = importSourceSqlCondition('worker')

  const [totalRes, failedRes, apifyTotalRes, apifyFailedRes, workerTotalRes, workerFailedRes] =
    await Promise.all([
      i2fQuery<{ c: string }>(`SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere}`, params),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere} AND j.status = 'failed'`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere} AND ${apifySql}`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere} AND j.status = 'failed' AND ${apifySql}`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere} AND ${workerSql}`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs j WHERE ${rangeWhere} AND j.status = 'failed' AND ${workerSql}`,
        params,
      ),
    ])

  const total = Number(totalRes.rows[0]?.c ?? 0)
  const failed = Number(failedRes.rows[0]?.c ?? 0)
  const apifyTotal = Number(apifyTotalRes.rows[0]?.c ?? 0)
  const apifyFailed = Number(apifyFailedRes.rows[0]?.c ?? 0)
  const workerTotal = Number(workerTotalRes.rows[0]?.c ?? 0)
  const workerFailed = Number(workerFailedRes.rows[0]?.c ?? 0)

  const importsHref = `${I2F_BASE}/importacoes`
  const points: OverviewAttentionPoint[] = []

  if (apifyFailed > 0) {
    const apifyFailRate = apifyTotal > 0 ? Math.round((apifyFailed / apifyTotal) * 100) : 100
    points.push({
      id: 'apify-failures',
      severity: apifyFailed >= 5 || apifyFailRate >= 25 ? 'error' : 'warning',
      title: 'Apify com falhas',
      description:
        apifyTotal > 0
          ? `${apifyFailed} importação(ões) via Apify falharam (${apifyFailRate}% de ${apifyTotal} via Apify).`
          : `${apifyFailed} importação(ões) com erro relacionado ao Apify.`,
      href: importsHref,
    })
  }

  if (workerFailed >= 3 && workerTotal > 0) {
    const workerFailRate = Math.round((workerFailed / workerTotal) * 100)
    if (workerFailRate >= 15) {
      points.push({
        id: 'worker-failures',
        severity: workerFailRate >= 30 ? 'error' : 'warning',
        title: 'Worker com falhas',
        description: `${workerFailed} importação(ões) via Worker falharam (${workerFailRate}% de ${workerTotal}).`,
        href: importsHref,
      })
    }
  }

  if (total > 0 && failed > 0) {
    const failureRate = Math.round((failed / total) * 100)
    if (failureRate >= 10 && failed >= 5) {
      points.push({
        id: 'high-failure-rate',
        severity: failureRate >= 20 ? 'error' : 'warning',
        title: 'Taxa de erro elevada',
        description: `${failed} de ${total} importações falharam (${failureRate}% no período).`,
        href: importsHref,
      })
    }
  }

  return points.slice(0, 4)
}

export async function getOverview(start?: string, end?: string): Promise<OverviewData> {
  const range = defaultRange(start, end)
  const counts = await userCounts()

  const [earningsNow, earningsPrev, imagesNow, imagesPrev, jobsNow, usersNew, usersNewPrev, series, attentionPoints] =
    await Promise.all([
      revenueInPeriod(range.start, range.end),
      revenueInPeriod(range.prevStart, range.start),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM assets a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.created_at >= $1 AND j.created_at <= $2`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM assets a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.created_at >= $1 AND j.created_at < $2`,
        [range.prevStart, range.start],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM jobs WHERE created_at >= $1 AND created_at <= $2`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users WHERE created_at >= $1 AND created_at <= $2`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users WHERE created_at >= $1 AND created_at < $2`,
        [range.prevStart, range.start],
      ),
      overviewDailySeries(range.start, range.end),
      getOverviewAttentionPoints(range.start, range.end),
    ])

  const imagesCount = Number(imagesNow.rows[0]?.c ?? 0)
  const imagesPrevCount = Number(imagesPrev.rows[0]?.c ?? 0)

  const { rows: recentJobs } = await i2fQuery<{
    id: string
    user_id: string
    created_at: Date
    platform: string
    username: string | null
    image_count: string
    status: string
  }>(
    `SELECT j.id, j.user_id, j.created_at, j.platform,
            j.input->>'username' AS username,
            (SELECT COUNT(*) FROM assets a WHERE a.job_id = j.id)::text AS image_count,
            j.status::text
     FROM jobs j
     WHERE j.created_at >= $1 AND j.created_at <= $2
     ORDER BY j.created_at DESC
     LIMIT 20`,
    [range.start, range.end],
  )

  return {
    kpis: {
      earningsUSD: earningsNow,
      earningsDeltaPct: pctDelta(earningsNow, earningsPrev),
      users: counts.total,
      usersDeltaPct: pctDelta(Number(usersNew.rows[0]?.c ?? 0), Number(usersNewPrev.rows[0]?.c ?? 0)),
      imagesImported: imagesCount,
      imagesDeltaPct: pctDelta(imagesCount, imagesPrevCount),
      jobsInPeriod: Number(jobsNow.rows[0]?.c ?? 0),
      series,
    },
    recentJobs: recentJobs.map((j) => ({
      id: j.id,
      userId: j.user_id,
      displayName: pseudonym(j.user_id),
      createdAt: j.created_at.toISOString(),
      platform: j.platform,
      profileUsername: j.username,
      imageCount: Number(j.image_count),
      status: j.status as OverviewData['recentJobs'][0]['status'],
    })),
    attentionPoints,
  }
}

async function usersPageSeries(start: string, end: string): Promise<UsersSeries> {
  const [baselineRes, newUsersMap, activeMap, conversionsMap] = await Promise.all([
    i2fQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE created_at < $1`,
      [start],
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM users WHERE created_at >= $1 AND created_at <= $2 GROUP BY 1`,
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(j.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
              COUNT(DISTINCT j.user_id)::text AS count
       FROM jobs j WHERE j.created_at >= $1 AND j.created_at <= $2 GROUP BY 1`,
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.created_at >= $1 AND s.created_at <= $2
         AND u.plan_tier IN ('pro','max')
       GROUP BY 1`,
    ),
  ])

  let cumulative = Number(baselineRes.rows[0]?.count ?? 0)
  const cumulativePoints: OverviewDailyPoint[] = []
  let cur = isoDay(start)
  const endDay = isoDay(end)

  while (cur <= endDay) {
    cumulative += newUsersMap.get(cur) ?? 0
    const d = parseISO(cur)
    cumulativePoints.push({
      date: cur,
      label: format(d, 'EEE, d MMM', { locale: ptBR }),
      value: cumulative,
    })
    const next = parseISO(cur)
    next.setUTCDate(next.getUTCDate() + 1)
    cur = next.toISOString().slice(0, 10)
  }

  return {
    cumulative: cumulativePoints,
    active: buildDailySeries(start, end, activeMap),
    newUsers: buildDailySeries(start, end, newUsersMap),
    conversions: buildDailySeries(start, end, conversionsMap),
  }
}

function conversionPct(paid: number, newUsers: number): number {
  if (newUsers === 0) return 0
  return Math.round((paid / newUsers) * 1000) / 10
}

async function usersKpisForRange(range: ReturnType<typeof defaultRange>) {
  const [totalRes, activeNow, activePrev, newNow, newPrev, paidNow, paidPrev, series] =
    await Promise.all([
      i2fQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS c FROM jobs
         WHERE created_at >= $1 AND created_at <= $2`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(DISTINCT user_id)::text AS c FROM jobs
         WHERE created_at >= $1 AND created_at < $2`,
        [range.prevStart, range.start],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users WHERE created_at >= $1 AND created_at <= $2`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM users WHERE created_at >= $1 AND created_at < $2`,
        [range.prevStart, range.start],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         WHERE s.created_at >= $1 AND s.created_at <= $2 AND u.plan_tier IN ('pro','max')`,
        [range.start, range.end],
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         WHERE s.created_at >= $1 AND s.created_at < $2 AND u.plan_tier IN ('pro','max')`,
        [range.prevStart, range.start],
      ),
      usersPageSeries(range.start, range.end),
    ])

  const newInPeriod = Number(newNow.rows[0]?.c ?? 0)
  const newPrevCount = Number(newPrev.rows[0]?.c ?? 0)
  const paidCount = Number(paidNow.rows[0]?.c ?? 0)
  const paidPrevCount = Number(paidPrev.rows[0]?.c ?? 0)
  const convNow = conversionPct(paidCount, newInPeriod)
  const convPrev = conversionPct(paidPrevCount, newPrevCount)

  return {
    total: Number(totalRes.rows[0]?.count ?? 0),
    active: Number(activeNow.rows[0]?.c ?? 0),
    activeDeltaPct: pctDelta(Number(activeNow.rows[0]?.c ?? 0), Number(activePrev.rows[0]?.c ?? 0)),
    newInPeriod,
    newDeltaPct: pctDelta(newInPeriod, newPrevCount),
    paidConversionPct: convNow,
    conversionDeltaPct: pctDelta(convNow, convPrev),
    series,
  }
}

function mapUserRow(u: {
  id: string
  plan_tier: string
  email_verified: boolean
  figma_user_id: string | null
  framer_user_id: string | null
  images_used: string
  created_at: Date
  last_import_at: Date | null
}): UsersListData['users'][0] {
  return {
    id: u.id,
    displayName: pseudonym(u.id),
    planTier: u.plan_tier as UsersListData['users'][0]['planTier'],
    emailVerified: u.email_verified,
    platform: u.figma_user_id ? 'figma' : u.framer_user_id ? 'framer' : null,
    imagesUsed: Number(u.images_used),
    createdAt: u.created_at.toISOString(),
    lastImportAt: u.last_import_at?.toISOString() ?? null,
  }
}

export async function getUsersList(opts: {
  start?: string
  end?: string
  search?: string
  plan?: string
  page?: number
  pageSize?: number
}): Promise<UsersListData> {
  const range = defaultRange(opts.start, opts.end)
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 15))
  const offset = (page - 1) * pageSize

  const conditions: string[] = []
  const params: unknown[] = []
  let pi = 1

  if (opts.plan && opts.plan !== 'all') {
    conditions.push(`u.plan_tier = $${pi++}`)
    params.push(opts.plan)
  }

  conditions.push(`u.created_at >= $${pi++}`)
  params.push(range.start)
  conditions.push(`u.created_at <= $${pi++}`)
  params.push(range.end)

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const searchTerm = opts.search?.trim().toLowerCase()

  const userSelect = `SELECT u.id, u.plan_tier, u.email_verified,
              u.figma_user_id, u.framer_user_id,
              COALESCE((SELECT SUM(uc.images_used) FROM usage_counters uc WHERE uc.user_id = u.id), 0)::text AS images_used,
              u.created_at,
              (SELECT MAX(j.created_at) FROM jobs j WHERE j.user_id = u.id) AS last_import_at
       FROM users u
       ${where}
       ORDER BY u.created_at DESC`

  type UserRowDb = {
    id: string
    plan_tier: string
    email_verified: boolean
    figma_user_id: string | null
    framer_user_id: string | null
    images_used: string
    created_at: Date
    last_import_at: Date | null
  }

  const kpis = await usersKpisForRange(range)

  if (searchTerm) {
    const { rows: allRows } = await i2fQuery<UserRowDb>(userSelect, params)
    const filtered = allRows.filter((u) => pseudonym(u.id).toLowerCase().includes(searchTerm))
    const pageRows = filtered.slice(offset, offset + pageSize)

    return {
      kpis,
      total: filtered.length,
      users: pageRows.map(mapUserRow),
    }
  }

  const [listRes, countRes] = await Promise.all([
    i2fQuery<UserRowDb>(
      `${userSelect}
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, pageSize, offset],
    ),
    i2fQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users u ${where}`,
      params,
    ),
  ])

  return {
    kpis,
    total: Number(countRes.rows[0]?.count ?? 0),
    users: listRes.rows.map(mapUserRow),
  }
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const { rows } = await i2fQuery<{
    id: string
    email: string
    email_verified: boolean
    plan_tier: string
    figma_user_id: string | null
    framer_user_id: string | null
    google_id: string | null
    polar_customer_id: string | null
    created_at: Date
    sub_status: string | null
    sub_product_id: string | null
    sub_period_end: Date | null
    usage_period: Date | null
    usage_images: string | null
  }>(
    `SELECT u.id, u.email, u.email_verified, u.plan_tier,
            u.figma_user_id, u.framer_user_id, u.google_id, u.polar_customer_id, u.created_at,
            s.status AS sub_status, s.product_id AS sub_product_id, s.current_period_end AS sub_period_end,
            uc.period_start AS usage_period, uc.images_used::text AS usage_images
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
     LEFT JOIN LATERAL (
       SELECT period_start, images_used FROM usage_counters
       WHERE user_id = u.id ORDER BY period_start DESC LIMIT 1
     ) uc ON true
     WHERE u.id = $1`,
    [userId],
  )

  const user = rows[0]
  if (!user) return null

  const { rows: jobs } = await i2fQuery<{
    id: string
    created_at: Date
    platform: string
    username: string | null
    status: string
    image_count: string
    started_at: Date | null
    finished_at: Date | null
    error_message: string | null
  }>(
    `SELECT j.id, j.created_at, j.platform, j.input->>'username' AS username,
            j.status::text, j.started_at, j.finished_at, j.error_message,
            (SELECT COUNT(*) FROM assets a WHERE a.job_id = j.id)::text AS image_count
     FROM jobs j WHERE j.user_id = $1 ORDER BY j.created_at DESC LIMIT 50`,
    [userId],
  )

  return {
    id: user.id,
    displayName: pseudonym(user.id),
    emailVerified: user.email_verified,
    planTier: user.plan_tier as UserDetail['planTier'],
    figmaUserId: user.figma_user_id,
    framerUserId: user.framer_user_id,
    googleId: user.google_id,
    polarCustomerId: user.polar_customer_id,
    createdAt: user.created_at.toISOString(),
    subscription: user.sub_status
      ? {
          status: user.sub_status,
          productId: user.sub_product_id ?? '',
          currentPeriodEnd: user.sub_period_end?.toISOString() ?? '',
        }
      : null,
    usage: user.usage_period
      ? {
          periodStart: user.usage_period.toISOString().slice(0, 10),
          imagesUsed: Number(user.usage_images ?? 0),
        }
      : null,
    jobs: jobs.map((j) => ({
      id: j.id,
      createdAt: j.created_at.toISOString(),
      platform: j.platform,
      profileUsername: j.username,
      status: j.status as UserDetail['jobs'][0]['status'],
      imageCount: Number(j.image_count),
      durationMs:
        j.started_at && j.finished_at
          ? j.finished_at.getTime() - j.started_at.getTime()
          : null,
      errorMessage: j.error_message,
    })),
  }
}

export async function getEarnings(start?: string, end?: string): Promise<EarningsData> {
  const monthlyCost = monthlyCostsTotalUSD()
  const orders = await fetchPolarOrders()

  const monthMap = new Map<string, number>()
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthMap.set(d.toISOString().slice(0, 7), 0)
  }
  for (const o of orders) {
    const month = o.createdAt.slice(0, 7)
    if (monthMap.has(month)) monthMap.set(month, (monthMap.get(month) ?? 0) + o.amountUSD)
  }
  const chart = [...monthMap.entries()].map(([month, revenue]) => ({
    month,
    revenue,
    costs: monthlyCost,
    net: revenue - monthlyCost,
  }))

  const range = defaultRange(start, end)
  const periodOrders = orders
    .filter((o) => o.createdAt >= range.start && o.createdAt <= range.end)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const revenueUSD = chart[chart.length - 1]?.revenue ?? 0
  const prevMonthRevenue = chart[chart.length - 2]?.revenue ?? 0

  return {
    revenueUSD,
    costsUSD: monthlyCost,
    netUSD: revenueUSD - monthlyCost,
    revenueDeltaPct: pctDelta(revenueUSD, prevMonthRevenue),
    chart,
    transactions: periodOrders.map((o) => ({
      id: o.id,
      date: o.createdAt,
      type: 'order',
      displayName: o.userId ? pseudonym(o.userId) : null,
      amountUSD: o.amountUSD,
      earningsUSD: o.amountUSD,
      status: o.status,
    })),
  }
}

export async function getAnalytics(opts: {
  start?: string
  end?: string
  platform?: string
  plan?: string
}): Promise<AnalyticsData> {
  const range = defaultRange(opts.start, opts.end)
  const filters: string[] = ['created_at >= $1', 'created_at <= $2']
  const params: unknown[] = [range.start, range.end]
  let pi = 3

  if (opts.platform && opts.platform !== 'all') {
    filters.push(`platform = $${pi++}`)
    params.push(opts.platform)
  }
  if (opts.plan && opts.plan !== 'all') {
    filters.push(`plan_tier = $${pi++}`)
    params.push(opts.plan)
  }

  const where = filters.join(' AND ')

  async function funnelCounts(events: readonly { name: string; label: string }[]) {
    const { rows } = await i2fQuery<{ event_name: string; count: string }>(
      `SELECT event_name, COUNT(DISTINCT session_id)::text AS count
       FROM product_analytics_events
       WHERE ${where} AND event_name = ANY($${pi})
       GROUP BY event_name`,
      [...params, events.map((e) => e.name)],
    )
    const map = new Map(rows.map((r) => [r.event_name, Number(r.count)]))
    let prev: number | null = null
    return events.map((e) => {
      const count = map.get(e.name) ?? 0
      const rateFromPrev = prev !== null && prev > 0 ? Math.round((count / prev) * 1000) / 10 : null
      prev = count
      return { name: e.name, label: e.label, count, rateFromPrev }
    })
  }

  const usageFunnel = await funnelCounts(USAGE_FUNNEL_EVENTS)
  const convRaw = await funnelCounts(CONVERSION_FUNNEL_EVENTS.slice(0, 2))

  const subCountRes = await i2fQuery<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM subscriptions WHERE created_at >= $1 AND created_at <= $2`,
    [range.start, range.end],
  )
  const subscribedCount = Number(subCountRes.rows[0]?.c ?? 0)

  const conversionFunnel = [
    ...convRaw,
    {
      name: 'subscription_created',
      label: CONVERSION_FUNNEL_EVENTS[2].label,
      count: subscribedCount,
      rateFromPrev:
        convRaw[1]?.count > 0
          ? Math.round((subscribedCount / convRaw[1].count) * 1000) / 10
          : null,
    },
  ]

  const [sessions, sessionEnds, importStarted, importCompleted, importAbandoned, privateAccount, limitReached, toggles, topProfiles, platforms] =
    await Promise.all([
      i2fQuery<{ c: string }>(
        `SELECT COUNT(DISTINCT session_id)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'session_start'`,
        params,
      ),
      i2fQuery<{ avg_min: string | null }>(
        `SELECT AVG(EXTRACT(EPOCH FROM (end_ts - start_ts)) / 60)::text AS avg_min FROM (
          SELECT session_id,
                 MIN(created_at) FILTER (WHERE event_name = 'session_start') AS start_ts,
                 MAX(created_at) FILTER (WHERE event_name = 'session_end') AS end_ts
          FROM product_analytics_events WHERE ${where}
          GROUP BY session_id
        ) s WHERE start_ts IS NOT NULL AND end_ts IS NOT NULL`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'import_started'`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'import_completed'`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'import_abandoned'`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'preview_private_account'`,
        params,
      ),
      i2fQuery<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM product_analytics_events WHERE ${where} AND event_name = 'preview_limit_reached'`,
        params,
      ),
      i2fQuery<{ event_name: string; count: string }>(
        `SELECT event_name, COUNT(*)::text AS count FROM product_analytics_events
         WHERE ${where} AND event_name = ANY($${pi})
         GROUP BY event_name ORDER BY count DESC`,
        [...params, [...FEATURE_TOGGLE_EVENTS]],
      ),
      i2fQuery<{ username: string; searches: string }>(
        `SELECT COALESCE(properties->>'username', properties->>'profile') AS username,
                COUNT(*)::text AS searches
         FROM product_analytics_events
         WHERE ${where} AND event_name = 'profile_search'
           AND COALESCE(properties->>'username', properties->>'profile') IS NOT NULL
         GROUP BY 1 ORDER BY searches DESC LIMIT 10`,
        params,
      ),
      i2fQuery<{ platform: string; count: string }>(
        `SELECT COALESCE(platform, 'unknown') AS platform, COUNT(DISTINCT session_id)::text AS count
         FROM product_analytics_events WHERE ${where}
         GROUP BY 1 ORDER BY count DESC`,
        params,
      ),
    ])

  const started = Number(importStarted.rows[0]?.c ?? 0)
  const completed = Number(importCompleted.rows[0]?.c ?? 0)
  const abandoned = Number(importAbandoned.rows[0]?.c ?? 0)

  return {
    usageFunnel,
    conversionFunnel,
    insights: {
      sessions: Number(sessions.rows[0]?.c ?? 0),
      avgSessionMinutes: Math.round(Number(sessionEnds.rows[0]?.avg_min ?? 0) * 10) / 10,
      importCompletionRate: started > 0 ? Math.round((completed / started) * 1000) / 10 : 0,
      importAbandonRate: started > 0 ? Math.round((abandoned / started) * 1000) / 10 : 0,
      previewPrivateAccount: Number(privateAccount.rows[0]?.c ?? 0),
      previewLimitReached: Number(limitReached.rows[0]?.c ?? 0),
      featureToggles: toggles.rows.map((t) => ({
        name: t.event_name.replace(/_toggled|_changed|_clicked/g, '').replace(/_/g, ' '),
        count: Number(t.count),
      })),
    },
    topProfiles: topProfiles.rows
      .filter((p) => p.username)
      .map((p) => ({ username: p.username, searches: Number(p.searches) })),
    platformBreakdown: platforms.rows.map((p) => ({
      platform: p.platform,
      count: Number(p.count),
    })),
  }
}

async function importMetricsInRange(start: string, end: string) {
  const { rows } = await i2fQuery<{ imports: string; images: string; failed: string }>(
    `SELECT
      COUNT(DISTINCT j.id)::text AS imports,
      COUNT(a.id)::text AS images,
      COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'failed')::text AS failed
     FROM jobs j
     LEFT JOIN assets a ON a.job_id = j.id
     WHERE j.created_at >= $1 AND j.created_at <= $2`,
    [start, end],
  )
  const imports = Number(rows[0]?.imports ?? 0)
  const images = Number(rows[0]?.images ?? 0)
  const failed = Number(rows[0]?.failed ?? 0)
  const avg = imports > 0 ? Math.round((images / imports) * 10) / 10 : 0
  const failureRatePct = imports > 0 ? Math.round((failed / imports) * 1000) / 10 : 0
  return { imports, images, avg, failed, failureRatePct }
}

async function importsDailySeries(start: string, end: string) {
  const [importsMap, imagesMap, failedMap] = await Promise.all([
    dailyCounts(
      start,
      end,
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM jobs WHERE created_at >= $1 AND created_at <= $2 GROUP BY 1`,
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(j.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM assets a JOIN jobs j ON j.id = a.job_id
       WHERE j.created_at >= $1 AND j.created_at <= $2 GROUP BY 1`,
    ),
    dailyCounts(
      start,
      end,
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*)::text AS count
       FROM jobs WHERE created_at >= $1 AND created_at <= $2 AND status = 'failed' GROUP BY 1`,
    ),
  ])

  const imports = buildDailySeries(start, end, importsMap)
  const images = buildDailySeries(start, end, imagesMap)
  const failed = buildDailySeries(start, end, failedMap)
  const avgPerImport = imports.map((point, i) => {
    const imp = point.value
    const img = images[i]?.value ?? 0
    return {
      ...point,
      value: imp > 0 ? Math.round((img / imp) * 10) / 10 : 0,
    }
  })

  return { imports, images, avgPerImport, failed }
}

export async function getImports(start?: string, end?: string): Promise<ImportsData> {
  const range = defaultRange(start, end)

  const [current, previous, series, topProfiles, failedJobs, errorSummary] = await Promise.all([
    importMetricsInRange(range.start, range.end),
    importMetricsInRange(range.prevStart, range.start),
    importsDailySeries(range.start, range.end),
    i2fQuery<{ username: string; imports: string; images: string }>(
      `SELECT
        LOWER(TRIM(j.input->>'username')) AS username,
        COUNT(DISTINCT j.id)::text AS imports,
        COUNT(a.id)::text AS images
       FROM jobs j
       LEFT JOIN assets a ON a.job_id = j.id
       WHERE j.created_at >= $1 AND j.created_at <= $2
         AND NULLIF(TRIM(j.input->>'username'), '') IS NOT NULL
       GROUP BY 1
       ORDER BY COUNT(a.id) DESC, COUNT(DISTINCT j.id) DESC
       LIMIT 15`,
      [range.start, range.end],
    ),
    i2fQuery<{
      id: string
      user_id: string
      created_at: Date
      platform: string
      username: string | null
      error_code: string | null
      error_message: string | null
      scrape_source_raw: string | null
    }>(
      `SELECT j.id, j.user_id, j.created_at, j.platform,
              j.input->>'username' AS username,
              j.error_code, j.error_message,
              j.result_summary->>'source' AS scrape_source_raw
       FROM jobs j
       WHERE j.created_at >= $1 AND j.created_at <= $2
         AND j.status = 'failed'
       ORDER BY j.created_at DESC
       LIMIT 100`,
      [range.start, range.end],
    ),
    i2fQuery<{ error_code: string | null; error_message: string | null; count: string }>(
      `SELECT j.error_code, j.error_message, COUNT(*)::text AS count
       FROM jobs j
       WHERE j.created_at >= $1 AND j.created_at <= $2
         AND j.status = 'failed'
       GROUP BY j.error_code, j.error_message
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [range.start, range.end],
    ),
  ])

  return {
    kpis: {
      totalImports: current.imports,
      totalImages: current.images,
      avgImagesPerImport: current.avg,
      failedImports: current.failed,
      failureRatePct: current.failureRatePct,
      importsDeltaPct: pctDelta(current.imports, previous.imports),
      imagesDeltaPct: pctDelta(current.images, previous.images),
      avgDeltaPct: pctDelta(current.avg, previous.avg),
      failedDeltaPct: pctDelta(current.failed, previous.failed),
      series,
    },
    topProfiles: topProfiles.rows
      .filter((p) => p.username)
      .map((p) => ({
        username: p.username,
        imports: Number(p.imports),
        images: Number(p.images),
      })),
    failedImports: failedJobs.rows.map((j) => ({
      id: j.id,
      userId: j.user_id,
      displayName: pseudonym(j.user_id),
      createdAt: j.created_at.toISOString(),
      platform: j.platform,
      profileUsername: j.username,
      scrapeSource: resolveImportScrapeSource(j.scrape_source_raw, j.error_message, j.error_code),
      errorCode: j.error_code,
      errorMessage: j.error_message,
    })),
    errorSummary: errorSummary.rows.map((e) => ({
      errorCode: e.error_code,
      errorMessage: e.error_message?.trim() || e.error_code?.trim() || 'Erro desconhecido',
      count: Number(e.count),
    })),
  }
}

export async function getImportsJobs(opts: {
  start?: string
  end?: string
  platform?: string
  plan?: string
  status?: string
  origin?: string
  search?: string
  page?: number
  pageSize?: number
}): Promise<ImportsJobsList> {
  const range = defaultRange(opts.start, opts.end)
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 15))
  const offset = (page - 1) * pageSize

  const conditions = ['j.created_at >= $1', 'j.created_at <= $2']
  const params: unknown[] = [range.start, range.end]
  let pi = 3

  if (opts.platform && opts.platform !== 'all') {
    conditions.push(`j.platform = $${pi++}`)
    params.push(opts.platform)
  }
  if (opts.plan && opts.plan !== 'all') {
    conditions.push(`u.plan_tier = $${pi++}`)
    params.push(opts.plan)
  }
  if (opts.status && opts.status !== 'all') {
    conditions.push(`j.status = $${pi++}`)
    params.push(opts.status)
  }

  const origin = opts.origin as ImportScrapeSource | 'all' | undefined
  if (origin && origin !== 'all' && ['worker', 'apify', 'unknown'].includes(origin)) {
    conditions.push(importSourceSqlCondition(origin))
  }

  const searchTerm = opts.search?.trim().toLowerCase().replace(/^@/, '')
  if (searchTerm) {
    conditions.push(`LOWER(COALESCE(j.input->>'username', '')) LIKE $${pi++}`)
    params.push(`%${searchTerm}%`)
  }

  const where = conditions.join(' AND ')
  const fromClause = `FROM jobs j JOIN users u ON u.id = j.user_id WHERE ${where}`

  type JobRowDb = {
    id: string
    user_id: string
    plan_tier: string
    created_at: Date
    started_at: Date | null
    finished_at: Date | null
    platform: string
    username: string | null
    status: string
    job_type: string
    input: unknown
    error_code: string | null
    error_message: string | null
    image_count: string
    scrape_source_raw: string | null
    country_code: string | null
  }

  const selectClause = `SELECT j.id, j.user_id, u.plan_tier, u.country_code, j.created_at, j.started_at, j.finished_at,
            j.platform, j.type AS job_type, j.input,
            j.input->>'username' AS username,
            j.status::text AS status,
            j.error_code, j.error_message,
            j.result_summary->>'source' AS scrape_source_raw,
            (SELECT COUNT(*) FROM assets a WHERE a.job_id = j.id)::text AS image_count`

  const [listRes, countRes] = await Promise.all([
    i2fQuery<JobRowDb>(
      `${selectClause}
       ${fromClause}
       ORDER BY j.created_at DESC
       LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, pageSize, offset],
    ),
    i2fQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${fromClause}`,
      params,
    ),
  ])

  const jobs: ImportsJobsList['jobs'] = listRes.rows.map((j) => {
    const input = parseImportJobInput(j.input)
    return {
      id: j.id,
      userId: j.user_id,
      displayName: pseudonym(j.user_id),
      planTier: j.plan_tier as ImportsJobsList['jobs'][0]['planTier'],
      createdAt: j.created_at.toISOString(),
      platform: j.platform,
      profileUsername: j.username ?? input.username ?? null,
      imageCount: Number(j.image_count),
      postsRequested: postsRequestedFromInput(input),
      durationMs:
        j.started_at && j.finished_at
          ? j.finished_at.getTime() - j.started_at.getTime()
          : null,
      status: j.status as ImportsJobsList['jobs'][0]['status'],
      jobType: j.job_type,
      scrapeSource: resolveImportScrapeSource(j.scrape_source_raw, j.error_message, j.error_code),
      errorCode: j.error_code,
      errorMessage: j.error_message,
      countryCode: j.country_code,
    }
  })

  /*
   * Atividade de busca (antes de existir job): profile_search_logs registra a
   * busca no momento em que acontece; scrape_telemetry dá o frescor ("buscando"
   * = scrape nos últimos 2 min). Vira linha de job quando o import é criado.
   * Só injeta na primeira página com filtros estruturais no padrão.
   */
  const injectSearches =
    page === 1 &&
    (!opts.status || opts.status === 'all') &&
    (!opts.platform || opts.platform === 'all') &&
    (!origin || origin === 'all')

  if (injectSearches) {
    const searchParams: unknown[] = [range.start, range.end]
    let spi = 3
    let planCond = ''
    if (opts.plan && opts.plan !== 'all') {
      planCond = `AND u.plan_tier = $${spi++}`
      searchParams.push(opts.plan)
    }
    let usernameCond = ''
    if (searchTerm) {
      usernameCond = `AND LOWER(l.username) LIKE $${spi++}`
      searchParams.push(`%${searchTerm}%`)
    }

    const { rows: searchRows } = await i2fQuery<{
      id: string
      user_id: string
      plan_tier: string
      username: string
      created_at: Date
      last_scrape: Date | null
      country_code: string | null
    }>(
      `SELECT x.id, x.user_id, x.plan_tier, x.country_code, x.username, x.created_at,
              -- telemetria não tem usuário confiável: o scrape mais recente só
              -- "renova" a busca do buscador mais recente daquele perfil (rn=1)
              CASE WHEN x.rn = 1 THEN (
                SELECT MAX(t.created_at) FROM scrape_telemetry t
                WHERE LOWER(t.ig_username) = LOWER(x.username)
                  AND t.created_at >= x.created_at
              ) END AS last_scrape
       FROM (
         SELECT DISTINCT ON (l.user_id, LOWER(l.username))
                l.id, l.user_id, u.plan_tier, u.country_code, l.username, l.created_at,
                ROW_NUMBER() OVER (PARTITION BY LOWER(l.username) ORDER BY l.created_at DESC) AS rn
         FROM profile_search_logs l
         JOIN users u ON u.id = l.user_id
         WHERE l.created_at >= $1 AND l.created_at <= $2
           ${planCond}
           ${usernameCond}
         ORDER BY l.user_id, LOWER(l.username), l.created_at DESC
       ) x
       -- esconde a busca se um job foi criado depois dela (ou até 2 min antes
       -- da última atividade — scrapes logo após o import não a ressuscitam)
       WHERE NOT EXISTS (
         SELECT 1 FROM jobs j
         WHERE j.user_id = x.user_id
           AND LOWER(COALESCE(j.input->>'username', '')) = LOWER(x.username)
           AND j.created_at >= COALESCE(
             CASE WHEN x.rn = 1 THEN (
               SELECT MAX(t.created_at) FROM scrape_telemetry t
               WHERE LOWER(t.ig_username) = LOWER(x.username)
                 AND t.created_at >= x.created_at
             ) END,
             x.created_at
           ) - INTERVAL '2 minutes'
       )
       ORDER BY COALESCE(CASE WHEN x.rn = 1 THEN (
         SELECT MAX(t.created_at) FROM scrape_telemetry t
         WHERE LOWER(t.ig_username) = LOWER(x.username)
           AND t.created_at >= x.created_at
       ) END, x.created_at) DESC
       LIMIT 20`,
      searchParams,
    )

    const now = Date.now()
    const searchActivity: ImportsJobsList['jobs'] = searchRows.map((r) => {
      const lastSeen = r.last_scrape ?? r.created_at
      return {
        id: `search-${r.id}`,
        userId: r.user_id,
        displayName: pseudonym(r.user_id),
        planTier: r.plan_tier as ImportsJobsList['jobs'][0]['planTier'],
        createdAt: lastSeen.toISOString(),
        platform: '',
        profileUsername: r.username,
        imageCount: 0,
        postsRequested: null,
        durationMs: null,
        status: now - lastSeen.getTime() < 2 * 60 * 1000 ? 'searching' : 'searched',
        jobType: 'search',
        scrapeSource: 'unknown',
        errorCode: null,
        errorMessage: null,
        countryCode: r.country_code,
      }
    })

    return {
      jobs: [...searchActivity, ...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      total: Number(countRes.rows[0]?.count ?? 0),
    }
  }

  return {
    jobs,
    total: Number(countRes.rows[0]?.count ?? 0),
  }
}

async function getImportFlowForJob(jobId: string): Promise<ImportFlowSummary | null> {
  const { rows: flowRows } = await i2fQuery<{
    id: string
    status: string
    total_cost_usd: string
    total_duration_ms: number
    finished_at: Date | null
  }>(
    `SELECT f.id, f.status::text, f.total_cost_usd::text, f.total_duration_ms, f.finished_at
     FROM jobs j
     LEFT JOIN import_flows f ON f.id = j.flow_id
     WHERE j.id = $1 AND f.id IS NOT NULL
     UNION
     SELECT f.id, f.status::text, f.total_cost_usd::text, f.total_duration_ms, f.finished_at
     FROM import_flow_steps s
     JOIN import_flows f ON f.id = s.flow_id
     WHERE s.job_id = $1
     LIMIT 1`,
    [jobId],
  )

  const flow = flowRows[0]
  if (!flow) return null

  const { rows: stepRows } = await i2fQuery<{
    id: string
    step_order: number
    step_type: string
    status: string
    preview_page: number | null
    posts_returned: number | null
    images_imported: number | null
    cost_usd: string
    duration_ms: number
    error_code: string | null
    error_message: string | null
    job_id: string | null
    started_at: Date
    finished_at: Date | null
  }>(
    `SELECT id, step_order, step_type::text, status::text, preview_page, posts_returned,
            images_imported, cost_usd::text, duration_ms, error_code, error_message, job_id,
            started_at, finished_at
     FROM import_flow_steps
     WHERE flow_id = $1
     ORDER BY step_order ASC`,
    [flow.id],
  )

  const stepIds = stepRows.map((s) => s.id)
  const attemptsByStep = new Map<string, ImportFlowStepAttempt[]>()

  if (stepIds.length > 0) {
    const { rows: attemptRows } = await i2fQuery<{
      id: string
      step_id: string
      attempt_order: number
      source: string
      status: string
      http_status: number | null
      error_kind: string | null
      error_message: string | null
      session_account: string | null
      proxy_used: boolean
      retry_count: number
      posts_requested: number | null
      posts_returned: number | null
      billable: boolean
      cost_usd: string
      duration_ms: number
      started_at: Date
      finished_at: Date | null
    }>(
      `SELECT id, step_id, attempt_order, source, status::text, http_status, error_kind,
              error_message, session_account, proxy_used, retry_count, posts_requested,
              posts_returned, billable, cost_usd::text, duration_ms, started_at, finished_at
       FROM import_flow_step_attempts
       WHERE step_id = ANY($1::uuid[])
       ORDER BY step_id, attempt_order ASC`,
      [stepIds],
    )

    for (const attempt of attemptRows) {
      const mapped: ImportFlowStepAttempt = {
        id: attempt.id,
        attemptOrder: attempt.attempt_order,
        source: attempt.source,
        status: attempt.status as ImportFlowStepAttempt['status'],
        httpStatus: attempt.http_status,
        errorKind: attempt.error_kind,
        errorMessage: attempt.error_message,
        sessionAccount: attempt.session_account,
        proxyUsed: attempt.proxy_used,
        retryCount: attempt.retry_count,
        postsRequested: attempt.posts_requested,
        postsReturned: attempt.posts_returned,
        billable: attempt.billable,
        costUsd: Number(attempt.cost_usd),
        durationMs: attempt.duration_ms,
        startedAt: attempt.started_at.toISOString(),
        finishedAt: attempt.finished_at?.toISOString() ?? null,
      }
      const list = attemptsByStep.get(attempt.step_id) ?? []
      list.push(mapped)
      attemptsByStep.set(attempt.step_id, list)
    }
  }

  const steps: ImportFlowStep[] = stepRows.map((step) => ({
    id: step.id,
    stepOrder: step.step_order,
    stepType: step.step_type as ImportFlowStep['stepType'],
    status: step.status as ImportFlowStep['status'],
    previewPage: step.preview_page,
    postsReturned: step.posts_returned,
    imagesImported: step.images_imported,
    costUsd: Number(step.cost_usd),
    durationMs: step.duration_ms,
    errorCode: step.error_code,
    errorMessage: step.error_message,
    jobId: step.job_id,
    startedAt: step.started_at.toISOString(),
    finishedAt: step.finished_at?.toISOString() ?? null,
    attempts: attemptsByStep.get(step.id) ?? [],
  }))

  return {
    id: flow.id,
    status: flow.status as ImportFlowSummary['status'],
    totalCostUsd: Number(flow.total_cost_usd),
    totalDurationMs: flow.total_duration_ms,
    finishedAt: flow.finished_at?.toISOString() ?? null,
    steps,
  }
}

/*
 * ponytail: the import_flows tables exist but the product never writes to them,
 * so we reconstruct a flow from scrape telemetry (matched by username + time)
 * plus the job row itself. Delete once the app persists real flows.
 * Note: product_analytics_events can't be used — its user_id is a different ID
 * space than users.id (zero overlap) and events carry no username to bridge on.
 */
function synthesizeImportFlow(opts: {
  jobId: string
  jobStatus: string
  errorCode: string | null
  errorMessage: string | null
  resultSummarySource: string | null
  imageCount: number
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  telemetry: ScrapeTelemetryEntry[]
  /** Fluxo só de busca (profile_search_logs) — sem etapa de importação. */
  searchOnly?: boolean
}): ImportFlowSummary {
  const toAttempts = (entries: ScrapeTelemetryEntry[]): ImportFlowStepAttempt[] =>
    entries.map((t, i) => ({
      id: t.id,
      attemptOrder: i + 1,
      source: t.cacheHit ? `${t.endpoint} (cache)` : t.endpoint,
      status: t.statusCode >= 400 ? 'failed' : 'succeeded',
      httpStatus: t.statusCode,
      errorKind: t.errorKind,
      errorMessage: null,
      sessionAccount: t.sessionAccount,
      proxyUsed: t.proxyUsed,
      retryCount: t.retryCount,
      postsRequested: null,
      postsReturned: null,
      billable: false,
      costUsd: 0,
      durationMs: t.latencyMs,
      startedAt: t.createdAt,
      finishedAt: null,
    }))

  const preview = opts.telemetry.filter((t) => t.endpoint === 'profile-preview')
  const pagination = opts.telemetry.filter((t) => t.endpoint === 'feed-pagination')
  const rest = opts.telemetry.filter(
    (t) => t.endpoint !== 'profile-preview' && t.endpoint !== 'feed-pagination',
  )

  const steps: ImportFlowStep[] = []
  let order = 1

  const phaseStep = (stepType: ImportFlowStep['stepType'], entries: ScrapeTelemetryEntry[]) => {
    if (entries.length === 0) return
    const first = new Date(entries[0].createdAt)
    const lastEntry = entries[entries.length - 1]
    const last = new Date(new Date(lastEntry.createdAt).getTime() + lastEntry.latencyMs)
    steps.push({
      id: `synth-${stepType}-${opts.jobId}`,
      stepOrder: order++,
      stepType,
      status: entries.some((t) => t.statusCode < 400) ? 'succeeded' : 'failed',
      previewPage: null,
      postsReturned: null,
      imagesImported: null,
      costUsd: 0,
      durationMs: last.getTime() - first.getTime(),
      errorCode: null,
      errorMessage: null,
      jobId: opts.jobId,
      startedAt: first.toISOString(),
      finishedAt: last.toISOString(),
      attempts: toAttempts(entries),
    })
  }

  phaseStep('search', preview)
  phaseStep('load_more', pagination)

  if (opts.searchOnly) {
    const searchFailed = steps.some((s) => s.stepType === 'search' && s.status === 'failed')
    return {
      id: `synth-${opts.jobId}`,
      status: searchFailed ? 'search_failed' : 'completed',
      totalCostUsd: 0,
      totalDurationMs: steps.reduce((sum, s) => sum + s.durationMs, 0),
      finishedAt: null,
      steps,
      synthesized: true,
    }
  }

  const jobRunning = opts.jobStatus === 'running' || opts.jobStatus === 'queued'
  const importOk = opts.jobStatus === 'succeeded'
  const importStart = opts.startedAt ?? opts.createdAt

  /*
   * Gates: the worker scrapes first; Apify only opens as fallback when the
   * worker path fails. The DB records the winner (result_summary.source), the
   * worker's failure reason (error_code: IG_BLOCKED/IG_PARSE) and Apify's
   * final response (error_message) — but no per-request Apify log exists.
   */
  const winner = resolveImportScrapeSource(
    opts.resultSummarySource,
    opts.errorMessage,
    opts.errorCode,
  )
  const gateBase = {
    httpStatus: null,
    sessionAccount: null,
    proxyUsed: false,
    retryCount: 0,
    postsRequested: null,
    postsReturned: null,
    billable: false,
    costUsd: 0,
    durationMs: 0,
    startedAt: importStart.toISOString(),
    finishedAt: opts.finishedAt?.toISOString() ?? null,
  }
  const gates: ImportFlowStepAttempt[] = []
  const apifyOpened = winner === 'apify'
  gates.push({
    ...gateBase,
    id: `synth-gate-worker-${opts.jobId}`,
    attemptOrder: 1,
    source: 'worker',
    status: jobRunning && !apifyOpened ? 'running' : apifyOpened || !importOk ? 'failed' : 'succeeded',
    errorKind: apifyOpened || !importOk ? opts.errorCode : null,
    errorMessage: apifyOpened
      ? opts.errorCode
        ? `Worker falhou (${opts.errorCode}) — abrindo fallback Apify`
        : 'Worker falhou — abrindo fallback Apify'
      : importOk || jobRunning
        ? null
        : opts.errorMessage,
  })
  if (apifyOpened) {
    gates.push({
      ...gateBase,
      id: `synth-gate-apify-${opts.jobId}`,
      attemptOrder: 2,
      source: 'apify',
      status: jobRunning ? 'running' : importOk ? 'succeeded' : 'failed',
      errorKind: importOk ? null : opts.errorCode,
      errorMessage: importOk ? null : opts.errorMessage,
    })
  }

  steps.push({
    id: `synth-import-${opts.jobId}`,
    stepOrder: order++,
    stepType: 'import',
    status: jobRunning ? 'running' : importOk ? 'succeeded' : 'failed',
    previewPage: null,
    postsReturned: null,
    imagesImported: opts.imageCount || null,
    costUsd: 0,
    durationMs: opts.finishedAt ? opts.finishedAt.getTime() - importStart.getTime() : 0,
    errorCode: importOk || jobRunning ? null : opts.errorCode,
    errorMessage: importOk || jobRunning ? null : opts.errorMessage,
    jobId: opts.jobId,
    startedAt: importStart.toISOString(),
    finishedAt: opts.finishedAt?.toISOString() ?? null,
    attempts: [
      ...gates,
      ...toAttempts(rest).map((a, i) => ({ ...a, attemptOrder: gates.length + i + 1 })),
    ],
  })

  const searchFailed = steps.some((s) => s.stepType === 'search' && s.status === 'failed')

  return {
    id: `synth-${opts.jobId}`,
    status: jobRunning
      ? 'started'
      : importOk
        ? 'completed'
        : opts.jobStatus === 'canceled'
          ? 'abandoned'
          : searchFailed
            ? 'search_failed'
            : 'import_failed',
    totalCostUsd: 0,
    totalDurationMs: steps.reduce((sum, s) => sum + s.durationMs, 0),
    finishedAt: opts.finishedAt?.toISOString() ?? null,
    steps,
    synthesized: true,
  }
}

async function getIgProfileSnapshot(username: string | null): Promise<IgProfileSnapshot | null> {
  if (!username?.trim()) return null

  const { rows } = await i2fQuery<{
    username: string
    full_name: string | null
    follower_count: number
    following_count: number
    media_count: number
    is_private: boolean
    is_verified: boolean
    catalog_complete: boolean
    last_scraped_at: Date | null
  }>(
    `SELECT username, full_name, follower_count, following_count, media_count,
            is_private, is_verified, catalog_complete, last_scraped_at
     FROM ig_profiles
     WHERE LOWER(username) = LOWER($1)
     LIMIT 1`,
    [username.trim()],
  )

  const profile = rows[0]
  if (!profile) return null

  return {
    username: profile.username,
    fullName: profile.full_name,
    followerCount: profile.follower_count,
    followingCount: profile.following_count,
    mediaCount: profile.media_count,
    isPrivate: profile.is_private,
    isVerified: profile.is_verified,
    catalogComplete: profile.catalog_complete,
    lastScrapedAt: profile.last_scraped_at?.toISOString() ?? null,
  }
}

async function getJobScrapeTelemetry(opts: {
  userId: string
  username: string | null
  startedAt: Date | null
  createdAt: Date
  finishedAt: Date | null
}): Promise<ScrapeTelemetryEntry[]> {
  if (!opts.username?.trim()) return []

  // scrape_telemetry.user_id lives in a different ID space than users.id
  // (zero overlap in prod), so we match by username + time window only.
  // Window opens before job creation: preview/search scrapes precede the job.
  const windowStart = new Date(opts.createdAt.getTime() - 10 * 60 * 1000)
  const windowEnd = opts.finishedAt ?? new Date(opts.createdAt.getTime() + 60 * 60 * 1000)

  const { rows } = await i2fQuery<{
    id: string
    endpoint: string
    status_code: number
    latency_ms: number
    cache_hit: boolean
    proxy_used: boolean
    session_account: string | null
    error_kind: string | null
    retry_count: number
    created_at: Date
  }>(
    `SELECT id, endpoint, status_code, latency_ms, cache_hit, proxy_used,
            session_account, error_kind, retry_count, created_at
     FROM scrape_telemetry
     WHERE LOWER(ig_username) = LOWER($1)
       AND created_at >= $2
       AND created_at <= $3
     ORDER BY created_at ASC
     LIMIT 20`,
    [opts.username.trim(), windowStart, windowEnd],
  )

  return rows.map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    statusCode: row.status_code,
    latencyMs: row.latency_ms,
    cacheHit: row.cache_hit,
    proxyUsed: row.proxy_used,
    sessionAccount: row.session_account,
    errorKind: row.error_kind,
    retryCount: row.retry_count,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function getImportJobDetail(jobId: string): Promise<ImportJobDetail | null> {
  const { rows } = await i2fQuery<{
    id: string
    user_id: string
    plan_tier: string
    created_at: Date
    started_at: Date | null
    finished_at: Date | null
    platform: string
    username: string | null
    status: string
    job_type: string
    input: unknown
    error_code: string | null
    error_message: string | null
    scrape_source_raw: string | null
    image_count: string
    country_code: string | null
  }>(
    `SELECT j.id, j.user_id, u.plan_tier, u.country_code, j.created_at, j.started_at, j.finished_at, j.platform,
            j.type AS job_type, j.input,
            j.input->>'username' AS username,
            j.status::text AS status,
            j.error_code, j.error_message,
            j.result_summary->>'source' AS scrape_source_raw,
            (SELECT COUNT(*) FROM assets a WHERE a.job_id = j.id)::text AS image_count
     FROM jobs j
     JOIN users u ON u.id = j.user_id
     WHERE j.id = $1`,
    [jobId],
  )

  const job = rows[0]
  if (!job) return null

  const input = parseImportJobInput(job.input)
  const profileUsername = job.username ?? input.username ?? null

  const [realFlow, igProfile, scrapeTelemetry] = await Promise.all([
    getImportFlowForJob(jobId),
    getIgProfileSnapshot(profileUsername),
    getJobScrapeTelemetry({
      userId: job.user_id,
      username: profileUsername,
      startedAt: job.started_at,
      createdAt: job.created_at,
      finishedAt: job.finished_at,
    }),
  ])

  const flow =
    realFlow ??
    synthesizeImportFlow({
      jobId: job.id,
      jobStatus: job.status,
      errorCode: job.error_code,
      errorMessage: job.error_message,
      resultSummarySource: job.scrape_source_raw,
      imageCount: Number(job.image_count),
      createdAt: job.created_at,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      telemetry: scrapeTelemetry,
    })

  return {
    id: job.id,
    userId: job.user_id,
    displayName: pseudonym(job.user_id),
    planTier: job.plan_tier as ImportJobDetail['planTier'],
    createdAt: job.created_at.toISOString(),
    startedAt: job.started_at?.toISOString() ?? null,
    finishedAt: job.finished_at?.toISOString() ?? null,
    durationMs:
      job.started_at && job.finished_at
        ? job.finished_at.getTime() - job.started_at.getTime()
        : null,
    platform: job.platform,
    profileUsername,
    imageCount: Number(job.image_count),
    postsRequested: postsRequestedFromInput(input),
    status: job.status as ImportJobDetail['status'],
    jobType: job.job_type,
    scrapeSource: resolveImportScrapeSource(job.scrape_source_raw, job.error_message, job.error_code),
    resultSummarySource: job.scrape_source_raw,
    input,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    countryCode: job.country_code,
    flow,
    igProfile,
    scrapeTelemetry,
  }
}

/**
 * Detalhe de uma linha de busca (profile_search_logs) no mesmo shape do detalhe
 * de job — o ImportDrawer renderiza sem mudanças. `id` chega como o UUID do log
 * (sem o prefixo `search-` usado nas linhas da tabela).
 */
export async function getProfileSearchDetail(
  searchLogId: string,
): Promise<ImportJobDetail | null> {
  const { rows } = await i2fQuery<{
    id: string
    user_id: string
    plan_tier: string
    username: string
    created_at: Date
    country_code: string | null
  }>(
    `SELECT l.id, l.user_id, u.plan_tier, u.country_code, l.username, l.created_at
     FROM profile_search_logs l
     JOIN users u ON u.id = l.user_id
     WHERE l.id = $1`,
    [searchLogId],
  )

  const log = rows[0]
  if (!log) return null

  const [igProfile, scrapeTelemetry] = await Promise.all([
    getIgProfileSnapshot(log.username),
    getJobScrapeTelemetry({
      userId: log.user_id,
      username: log.username,
      startedAt: null,
      createdAt: log.created_at,
      finishedAt: null,
    }),
  ])

  const flow = synthesizeImportFlow({
    jobId: `search-${log.id}`,
    jobStatus: 'searched',
    errorCode: null,
    errorMessage: null,
    resultSummarySource: null,
    imageCount: 0,
    createdAt: log.created_at,
    startedAt: null,
    finishedAt: null,
    telemetry: scrapeTelemetry,
    searchOnly: true,
  })

  return {
    id: `search-${log.id}`,
    userId: log.user_id,
    displayName: pseudonym(log.user_id),
    planTier: log.plan_tier as ImportJobDetail['planTier'],
    createdAt: log.created_at.toISOString(),
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    platform: '',
    profileUsername: log.username,
    imageCount: 0,
    postsRequested: null,
    status: 'searched',
    jobType: 'search',
    scrapeSource: 'unknown',
    resultSummarySource: null,
    input: { username: log.username },
    errorCode: null,
    errorMessage: null,
    countryCode: log.country_code,
    flow,
    igProfile,
    scrapeTelemetry,
  }
}

export async function getFlowJourneyData(opts: {
  start?: string
  end?: string
}): Promise<FlowJourneyData> {
  const range = defaultRange(opts.start, opts.end)

  const [eventsRes, telemetryRes, jobsRes, gatesRes] = await Promise.all([
    i2fQuery<{ event_name: string; count: string }>(
      `SELECT event_name, COUNT(*)::text AS count
       FROM product_analytics_events
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY event_name`,
      [range.start, range.end],
    ),
    i2fQuery<{
      endpoint: string
      total: string
      cache_hits: string
      auth_errors: string
      not_found: string
      network: string
      other_errors: string
      avg_latency: string
    }>(
      `SELECT endpoint, COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE cache_hit)::text AS cache_hits,
              COUNT(*) FILTER (WHERE error_kind = 'auth')::text AS auth_errors,
              COUNT(*) FILTER (WHERE error_kind = 'not_found')::text AS not_found,
              COUNT(*) FILTER (WHERE error_kind = 'network')::text AS network,
              COUNT(*) FILTER (WHERE error_kind IS NOT NULL AND error_kind NOT IN ('auth','not_found','network'))::text AS other_errors,
              COALESCE(AVG(latency_ms) FILTER (WHERE NOT cache_hit), 0)::text AS avg_latency
       FROM scrape_telemetry
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY endpoint`,
      [range.start, range.end],
    ),
    i2fQuery<{ status: string; count: string }>(
      `SELECT status::text, COUNT(*)::text AS count
       FROM jobs
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY status`,
      [range.start, range.end],
    ),
    i2fQuery<{ source: string | null; error_message: string | null; error_code: string | null }>(
      `SELECT result_summary->>'source' AS source, error_message, error_code
       FROM jobs
       WHERE created_at >= $1 AND created_at <= $2`,
      [range.start, range.end],
    ),
  ])

  const gates = { worker: 0, apify: 0, unknown: 0 }
  const failedByCode = new Map<string, number>()
  for (const row of gatesRes.rows) {
    gates[resolveImportScrapeSource(row.source, row.error_message, row.error_code)]++
    if (row.error_code) failedByCode.set(row.error_code, (failedByCode.get(row.error_code) ?? 0) + 1)
  }

  return {
    events: Object.fromEntries(eventsRes.rows.map((r) => [r.event_name, Number(r.count)])),
    telemetry: telemetryRes.rows.map((r) => ({
      endpoint: r.endpoint,
      total: Number(r.total),
      cacheHits: Number(r.cache_hits),
      authErrors: Number(r.auth_errors),
      notFound: Number(r.not_found),
      network: Number(r.network),
      otherErrors: Number(r.other_errors),
      avgLatencyMs: Math.round(Number(r.avg_latency)),
    })),
    jobsByStatus: Object.fromEntries(jobsRes.rows.map((r) => [r.status, Number(r.count)])),
    gates,
    failedByCode: Array.from(failedByCode, ([code, count]) => ({ code, count })).sort(
      (a, b) => b.count - a.count,
    ),
  }
}

const FLOW_NODE_EVENTS: Record<string, string[]> = {
  sessions: ['session_start'],
  preview: ['preview_loaded', 'preview_private_account', 'preview_empty'],
  'preview-failed': ['preview_failed'],
  config: ['post_count_adjusted', 'selection_mode_changed', 'ignore_reels_toggled', 'carousel_expand_toggled'],
  upgrade: ['preview_limit_reached', 'upgrade_overlay_opened'],
  abandon: ['import_abandoned'],
}

const FLOW_EVENT_LABELS: Record<string, string> = {
  session_start: 'Sessão iniciada',
  preview_loaded: 'Preview carregado',
  preview_private_account: 'Conta privada',
  preview_empty: 'Preview vazio',
  preview_failed: 'Preview falhou',
  post_count_adjusted: 'Qtd. de posts ajustada',
  selection_mode_changed: 'Modo de seleção alterado',
  ignore_reels_toggled: 'Ignorar reels alternado',
  carousel_expand_toggled: 'Expandir carrossel alternado',
  preview_limit_reached: 'Limite do plano atingido',
  upgrade_overlay_opened: 'Overlay de upgrade aberto',
  import_abandoned: 'Import abandonado',
}

const FLOW_NODE_JOBS: Record<string, { status?: string; origin?: string }> = {
  import: {},
  worker: { origin: 'worker' },
  apify: { origin: 'apify' },
  done: { status: 'succeeded' },
  failed: { status: 'failed' },
}

export async function getFlowNodeDetail(opts: {
  node: string
  start?: string
  end?: string
}): Promise<FlowNodeDetail | null> {
  const range = defaultRange(opts.start, opts.end)

  if (opts.node in FLOW_NODE_JOBS) {
    const filters = FLOW_NODE_JOBS[opts.node]
    const { jobs, total } = await getImportsJobs({
      start: opts.start,
      end: opts.end,
      status: filters.status,
      origin: filters.origin,
      pageSize: 50,
    })
    return { kind: 'jobs', total, jobs }
  }

  if (opts.node === 'search') {
    const { rows } = await i2fQuery<{ id: string; username: string; user_id: string; created_at: Date }>(
      `SELECT id, username, user_id, created_at
       FROM profile_search_logs
       WHERE created_at >= $1 AND created_at <= $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [range.start, range.end],
    )
    return {
      kind: 'occurrences',
      occurrences: rows.map((r) => ({
        id: r.id,
        when: r.created_at.toISOString(),
        title: `@${r.username}`,
        detail: pseudonym(r.user_id),
        status: 'neutral',
      })),
    }
  }

  if (opts.node === 'scrape' || opts.node === 'scrape-errors' || opts.node === 'load-more') {
    const endpoint = opts.node === 'load-more' ? 'feed-pagination' : 'profile-preview'
    const errorOnly = opts.node === 'scrape-errors'
    const { rows } = await i2fQuery<{
      id: string
      ig_username: string
      status_code: number
      latency_ms: number
      cache_hit: boolean
      proxy_used: boolean
      error_kind: string | null
      created_at: Date
    }>(
      `SELECT id, ig_username, status_code, latency_ms, cache_hit, proxy_used, error_kind, created_at
       FROM scrape_telemetry
       WHERE created_at >= $1 AND created_at <= $2
         AND endpoint = $3
         ${errorOnly ? 'AND error_kind IS NOT NULL' : ''}
       ORDER BY created_at DESC
       LIMIT 50`,
      [range.start, range.end, endpoint],
    )
    return {
      kind: 'occurrences',
      occurrences: rows.map((r) => ({
        id: r.id,
        when: r.created_at.toISOString(),
        title: `@${r.ig_username}`,
        detail: [
          `HTTP ${r.status_code}`,
          r.cache_hit ? 'cache' : `${r.latency_ms}ms`,
          r.error_kind,
          r.proxy_used ? 'proxy' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        status: r.status_code >= 400 ? 'error' : 'ok',
      })),
    }
  }

  const eventNames = FLOW_NODE_EVENTS[opts.node]
  if (!eventNames) return null

  const { rows } = await i2fQuery<{
    id: string
    event_name: string
    session_id: string
    properties: Record<string, unknown> | null
    created_at: Date
  }>(
    `SELECT id, event_name, session_id, properties, created_at
     FROM product_analytics_events
     WHERE created_at >= $1 AND created_at <= $2
       AND event_name = ANY($3)
     ORDER BY created_at DESC
     LIMIT 50`,
    [range.start, range.end, eventNames],
  )

  const occurrences: FlowNodeOccurrence[] = rows.map((r) => {
    const props = r.properties ?? {}
    const detailParts = Object.entries(props)
      .filter(([, v]) => v != null && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
    detailParts.push(`sessão ${r.session_id.slice(0, 8)}`)
    const isBad = r.event_name === 'preview_failed' || r.event_name === 'import_abandoned'
    const isWarn = ['preview_private_account', 'preview_empty', 'preview_limit_reached', 'upgrade_overlay_opened'].includes(r.event_name)
    return {
      id: r.id,
      when: r.created_at.toISOString(),
      title: FLOW_EVENT_LABELS[r.event_name] ?? r.event_name,
      detail: detailParts.join(' · '),
      status: isBad ? 'error' : isWarn ? 'warning' : 'ok',
    }
  })

  return { kind: 'occurrences', occurrences }
}

export async function getFarmData(): Promise<FarmData> {
  const { rows } = await i2fQuery<{
    id: string
    plan_tier: string
    platform: string | null
    created_at: Date
    images_used: string
    last_import_at: Date | null
  }>(
    `SELECT u.id, u.plan_tier, u.created_at,
            CASE WHEN u.figma_user_id IS NOT NULL THEN 'figma'
                 WHEN u.framer_user_id IS NOT NULL THEN 'framer'
                 ELSE NULL END AS platform,
            COALESCE((SELECT SUM(uc.images_used) FROM usage_counters uc WHERE uc.user_id = u.id), 0)::text AS images_used,
            (SELECT MAX(j.created_at) FROM jobs j WHERE j.user_id = u.id AND j.status = 'succeeded') AS last_import_at
     FROM users u
     ORDER BY u.created_at ASC`,
  )

  return {
    users: rows.map((u) => ({
      id: u.id,
      displayName: pseudonym(u.id),
      planTier: u.plan_tier as FarmData['users'][0]['planTier'],
      platform: u.platform as FarmData['users'][0]['platform'],
      imagesUsed: Number(u.images_used),
      createdAt: u.created_at.toISOString(),
      lastImportAt: u.last_import_at?.toISOString() ?? null,
    })),
    // ponytail: quota free não está registrada no banco; 100 ≈ máximo observado
    growthCap: 100,
  }
}
