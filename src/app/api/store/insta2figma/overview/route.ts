import { NextRequest, NextResponse } from 'next/server'
import { getOverview } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getOverview(
      searchParams.get('start') ?? undefined,
      searchParams.get('end') ?? undefined,
    )
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/overview]', err)
    return NextResponse.json({ error: 'Falha ao carregar visão geral' }, { status: 500 })
  }
}
