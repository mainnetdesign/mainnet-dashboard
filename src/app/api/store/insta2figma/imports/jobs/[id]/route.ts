import { NextResponse } from 'next/server'
import { getImportJobDetail } from '@/lib/insta2figma/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const data = await getImportJobDetail(id)
    if (!data) {
      return NextResponse.json({ error: 'Importação não encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/imports/jobs/id]', err)
    return NextResponse.json({ error: 'Falha ao carregar importação' }, { status: 500 })
  }
}
