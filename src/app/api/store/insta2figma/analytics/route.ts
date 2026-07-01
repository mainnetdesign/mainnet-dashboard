import { NextRequest, NextResponse } from 'next/server'
import { getAnalytics } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getAnalytics({
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      platform: searchParams.get('platform') ?? undefined,
      plan: searchParams.get('plan') ?? undefined,
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/analytics]', err)
    return NextResponse.json({ error: 'Falha ao carregar métricas' }, { status: 500 })
  }
}
