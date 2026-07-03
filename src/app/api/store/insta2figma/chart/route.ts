import { NextRequest, NextResponse } from 'next/server'
import { runChart } from '@/lib/insta2figma/chart-query'
import { sameUnit } from '@/lib/charts/catalog'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const measures = (searchParams.get('measures') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const dimension = searchParams.get('dimension') ?? 'time'
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (measures.length === 0) {
      return NextResponse.json({ error: 'measures obrigatório' }, { status: 400 })
    }
    if (!sameUnit(measures)) {
      return NextResponse.json(
        { error: 'medidas com unidades diferentes no mesmo gráfico' },
        { status: 400 },
      )
    }

    const rangeEnd = end ? `${end}T23:59:59.999Z` : new Date().toISOString()
    const rangeStart = start
      ? `${start}T00:00:00.000Z`
      : new Date(Date.now() - 30 * 864e5).toISOString()

    const rows = await runChart(measures, dimension, rangeStart, rangeEnd)
    return NextResponse.json({ rows })
  } catch (err) {
    console.error('[store/insta2figma/chart]', err)
    return NextResponse.json({ error: 'Falha ao carregar gráfico' }, { status: 500 })
  }
}
