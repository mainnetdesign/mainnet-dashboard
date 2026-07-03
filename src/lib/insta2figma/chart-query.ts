// Chart builder — server-side aggregation.
// Everything here is a hardcoded whitelist keyed by catalog ids. User input
// selects an id; it never becomes SQL text. Values ($1/$2) are the date range.

import { i2fQuery } from '@/lib/insta2figma/db'
import { MEASURES } from '@/lib/charts/catalog'

type MeasureSql = {
  table: string
  dateCol: string // for the range filter + time bucket
  valueExpr: string // e.g. COUNT(*) or SUM(images_used)
}

// dimId -> SQL expression producing the group key, per measure table.
const DIM_EXPR: Record<string, string> = {
  platform: 'platform',
  plan_tier: 'plan_tier',
  job_status: 'status::text',
  event_name: 'event_name',
  verified: "CASE WHEN email_verified THEN 'Verificado' ELSE 'Não verificado' END",
  // computed dimension: only valid on the users table (correlated subquery)
  has_import:
    "CASE WHEN EXISTS (SELECT 1 FROM jobs j WHERE j.user_id = users.id) THEN 'Fez import' ELSE 'Não fez import' END",
}

const MEASURE_SQL: Record<string, MeasureSql> = {
  jobs: { table: 'jobs', dateCol: 'created_at', valueExpr: 'COUNT(*)' },
  images: {
    table: 'usage_counters',
    dateCol: 'period_start',
    valueExpr: 'COALESCE(SUM(images_used),0)',
  },
  users: { table: 'users', dateCol: 'created_at', valueExpr: 'COUNT(*)' },
  events: {
    table: 'product_analytics_events',
    dateCol: 'created_at',
    valueExpr: 'COUNT(*)',
  },
}

export type ChartPoint = { key: string; value: number }

export async function runMeasure(
  measureId: string,
  dimension: string,
  start: string,
  end: string,
): Promise<ChartPoint[]> {
  const m = MEASURE_SQL[measureId]
  const meta = MEASURES[measureId]
  if (!m || !meta) throw new Error(`unknown measure: ${measureId}`)
  if (dimension !== 'time' && !meta.dimensions.includes(dimension)) {
    throw new Error(`dimension ${dimension} not allowed for ${measureId}`)
  }

  const keyExpr =
    dimension === 'time'
      ? `to_char(date_trunc('day', ${m.dateCol}), 'YYYY-MM-DD')`
      : `COALESCE(${DIM_EXPR[dimension]}::text, '—')`

  const sql = `
    SELECT ${keyExpr} AS key, ${m.valueExpr}::float8 AS value
    FROM ${m.table}
    WHERE ${m.dateCol} BETWEEN $1 AND $2
    GROUP BY 1
    ORDER BY 1
  `
  const { rows } = await i2fQuery<{ key: string; value: number }>(sql, [start, end])
  return rows.map((r) => ({ key: r.key, value: Number(r.value) }))
}

// Runs each series measure and merges into rows keyed by the dimension value.
export async function runChart(
  measures: string[],
  dimension: string,
  start: string,
  end: string,
) {
  const results = await Promise.all(
    measures.map((id) => runMeasure(id, dimension, start, end)),
  )
  const keys = new Set<string>()
  results.forEach((pts) => pts.forEach((p) => keys.add(p.key)))
  const sortedKeys = [...keys].sort()

  const rows = sortedKeys.map((key) => {
    const row: Record<string, string | number> = { key }
    measures.forEach((id, i) => {
      row[id] = results[i].find((p) => p.key === key)?.value ?? 0
    })
    return row
  })
  return rows
}
