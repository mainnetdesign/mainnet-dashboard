import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { fetchAllTimeEntries } from '@/lib/clockify'
import { fetchAllTransactions } from '@/lib/notion'
import { buildDashboardData } from '@/lib/calculations'

const CACHE_TTL = 60 * 15 // 15 minutes

const getCachedDashboard = unstable_cache(
  async (start: string, end: string) => {
    const [entries, transactions] = await Promise.all([
      fetchAllTimeEntries(start, end),
      fetchAllTransactions(),
    ])
    return buildDashboardData(entries, transactions, start, end)
  },
  ['dashboard-data'],
  { revalidate: CACHE_TTL }
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const sixMonthsAgo = (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); d.setDate(1); return d.toISOString().split('T')[0] })()
    const start = searchParams.get('start') ?? sixMonthsAgo
    const end = searchParams.get('end') ?? new Date().toISOString().split('T')[0]
    const bust = searchParams.get('bust') === '1' // ?bust=1 force refresh

    if (bust) {
      // Skip cache — fetch fresh data
      const [entries, transactions] = await Promise.all([
        fetchAllTimeEntries(start, end),
        fetchAllTransactions(),
      ])
      const data = buildDashboardData(entries, transactions, start, end)
      return NextResponse.json(data)
    }

    const data = await getCachedDashboard(start, end)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
