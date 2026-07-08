import { NextResponse } from 'next/server'
import { getImportJobDetail, getProfileSearchDetail } from '@/lib/insta2figma/queries'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    // Linhas de busca (pré-job) usam o prefixo `search-<profile_search_logs.id>`.
    const data = id.startsWith('search-')
      ? await getProfileSearchDetail(id.slice('search-'.length))
      : await getImportJobDetail(id)
    if (!data) {
      return NextResponse.json({ error: 'Importação não encontrada' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/imports/jobs/id]', err)
    return NextResponse.json({ error: 'Falha ao carregar importação' }, { status: 500 })
  }
}
