import { NextResponse } from 'next/server'
import { getUserDetail } from '@/lib/insta2figma/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const data = await getUserDetail(id)
    if (!data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/users/id]', err)
    return NextResponse.json({ error: 'Falha ao carregar usuário' }, { status: 500 })
  }
}
