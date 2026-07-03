import { NextRequest, NextResponse } from 'next/server'
import { getFlowJourneyData } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getFlowJourneyData({
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/flow]', err)
    return NextResponse.json({ error: 'Falha ao carregar fluxo' }, { status: 500 })
  }
}
