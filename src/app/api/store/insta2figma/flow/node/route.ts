import { NextRequest, NextResponse } from 'next/server'
import { getFlowNodeDetail } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const node = searchParams.get('node')
    if (!node) {
      return NextResponse.json({ error: 'Parâmetro node é obrigatório' }, { status: 400 })
    }
    const data = await getFlowNodeDetail({
      node,
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
    })
    if (!data) {
      return NextResponse.json({ error: 'Etapa desconhecida' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/flow/node]', err)
    return NextResponse.json({ error: 'Falha ao carregar detalhes da etapa' }, { status: 500 })
  }
}
