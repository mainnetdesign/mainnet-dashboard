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
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  AnalyticsData,
  EarningsData,
  OverviewDailyPoint,
  OverviewData,
  OverviewUserDayPoint,
  ServicesHubData,
  UserDetail,
  UsersListData,
  UsersSeries,
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
  const { rows } = await i2fQuery<{ plan_tier: string; count: string }>(
    `SELECT plan_tier, COUNT(*)::text AS count FROM users WHERE plan_tier IN ('pro','max') GROUP BY plan_tier`,
  )
  let total = 0
  for (const r of rows) {
    const tier = r.plan_tier as 'pro' | 'max'
    if (tier in PLAN_PRICING_USD) {
      total += PLAN_PRICING_USD[tier] * Number(r.count)
    }
  }
  return total
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
  const { rows } = await i2fQuery<{ plan_tier: string; count: string }>(
    `SELECT u.plan_tier, COUNT(*)::text AS count
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= $1 AND s.created_at <= $2
     GROUP BY u.plan_tier`,
    [start, end],
  )
  let total = 0
  for (const r of rows) {
    const tier = r.plan_tier as 'pro' | 'max' | 'free'
    if (tier === 'pro') total += PLAN_PRICING_USD.pro * Number(r.count)
    if (tier === 'max') total += PLAN_PRICING_USD.max * Number(r.count)
  }
  return total
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
  const { rows } = await i2fQuery<{ day: string; plan_tier: string; count: string }>(
    `SELECT to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
            u.plan_tier,
            COUNT(*)::text AS count
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= $1 AND s.created_at <= $2
     GROUP BY 1, u.plan_tier`,
    [start, end],
  )
  const map = new Map<string, number>()
  for (const r of rows) {
    const tier = r.plan_tier as 'pro' | 'max'
    const amount =
      tier === 'max' ? PLAN_PRICING_USD.max : tier === 'pro' ? PLAN_PRICING_USD.pro : 0
    map.set(r.day, (map.get(r.day) ?? 0) + amount * Number(r.count))
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

export async function getOverview(start?: string, end?: string): Promise<OverviewData> {
  const range = defaultRange(start, end)
  const counts = await userCounts()

  const [earningsNow, earningsPrev, imagesNow, imagesPrev, jobsNow, usersNew, usersNewPrev, series] =
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
  const mrr = await mrrUSD()
  const monthlyCost = monthlyCostsTotalUSD()

  const { rows: chartRows } = await i2fQuery<{ month: string; subs: string }>(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
            COUNT(*)::text AS subs
     FROM subscriptions
     WHERE created_at >= NOW() - INTERVAL '6 months'
     GROUP BY 1 ORDER BY 1`,
  )

  const chart = chartRows.map((r) => {
    const revenue = Number(r.subs) * PLAN_PRICING_USD.pro
    return {
      month: r.month,
      revenue,
      costs: monthlyCost,
      net: revenue - monthlyCost,
    }
  })

  if (chart.length === 0) {
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = d.toISOString().slice(0, 7)
      chart.push({
        month,
        revenue: i === 0 ? mrr : 0,
        costs: monthlyCost,
        net: (i === 0 ? mrr : 0) - monthlyCost,
      })
    }
  }

  const range = defaultRange(start, end)
  const { rows: txRows } = await i2fQuery<{
    id: string
    date: Date
    type: string
    user_id: string
    amount: string
    status: string
  }>(
    `SELECT s.id, s.created_at AS date, 'subscription' AS type,
            s.user_id,
            CASE WHEN u.plan_tier = 'max' THEN '${PLAN_PRICING_USD.max}' ELSE '${PLAN_PRICING_USD.pro}' END AS amount,
            s.status
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= $1 AND s.created_at <= $2
     ORDER BY s.created_at DESC`,
    [range.start, range.end],
  )

  return {
    revenueUSD: mrr,
    costsUSD: monthlyCost,
    netUSD: mrr - monthlyCost,
    revenueDeltaPct: 5,
    chart,
    transactions: txRows.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      type: t.type,
      displayName: pseudonym(t.user_id),
      amountUSD: Number(t.amount),
      earningsUSD: Number(t.amount),
      status: t.status,
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
      label: 'Subscribed',
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
