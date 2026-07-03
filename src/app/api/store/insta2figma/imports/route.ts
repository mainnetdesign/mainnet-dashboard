import { NextRequest, NextResponse } from 'next/server'
import { getImports } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getImports(
      searchParams.get('start') ?? undefined,
      searchParams.get('end') ?? undefined,
    )
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/imports]', err)
    return NextResponse.json({ error: 'Falha ao carregar importações' }, { status: 500 })
  }
}
