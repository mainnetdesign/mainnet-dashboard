import { NextRequest, NextResponse } from 'next/server'
import { getImportsJobs } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getImportsJobs({
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      platform: searchParams.get('platform') ?? undefined,
      plan: searchParams.get('plan') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      origin: searchParams.get('origin') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : undefined,
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/imports/jobs]', err)
    return NextResponse.json({ error: 'Falha ao carregar importações' }, { status: 500 })
  }
}
