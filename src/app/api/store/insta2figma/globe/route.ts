import { NextResponse } from 'next/server'
import { getGlobeData } from '@/lib/insta2figma/queries'

export async function GET() {
  try {
    return NextResponse.json(await getGlobeData())
  } catch (err) {
    console.error('[store/insta2figma/globe]', err)
    return NextResponse.json({ error: 'Falha ao carregar dados do globo' }, { status: 500 })
  }
}
