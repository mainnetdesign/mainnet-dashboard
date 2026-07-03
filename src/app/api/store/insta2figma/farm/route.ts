import { NextResponse } from 'next/server'
import { getFarmData } from '@/lib/insta2figma/queries'

export async function GET() {
  try {
    return NextResponse.json(await getFarmData())
  } catch (err) {
    console.error('[store/insta2figma/farm]', err)
    return NextResponse.json({ error: 'Falha ao carregar a fazenda' }, { status: 500 })
  }
}
