import { NextRequest, NextResponse } from 'next/server'
import { fetchAllTimeEntries } from '@/lib/clockify'
import { fetchAllTransactions } from '@/lib/notion'
import { buildDashboardData } from '@/lib/calculations'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const start = searchParams.get('start') ?? '2025-06-01'
    const end = searchParams.get('end') ?? new Date().toISOString().split('T')[0]

    const [entries, transactions] = await Promise.all([
      fetchAllTimeEntries(start, end),
      fetchAllTransactions(),
    ])

    const data = buildDashboardData(entries, transactions, start, end)
    return NextResponse.json(data)
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
