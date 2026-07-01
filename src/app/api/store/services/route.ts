import { NextResponse } from 'next/server'
import { getServicesHub } from '@/lib/insta2figma/queries'

export async function GET() {
  try {
    const data = await getServicesHub()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/services]', err)
    return NextResponse.json({ error: 'Falha ao carregar serviços' }, { status: 500 })
  }
}
