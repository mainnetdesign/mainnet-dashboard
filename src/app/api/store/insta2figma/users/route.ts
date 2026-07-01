import { NextRequest, NextResponse } from 'next/server'
import { getUsersList } from '@/lib/insta2figma/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const data = await getUsersList({
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      plan: searchParams.get('plan') ?? undefined,
      page: Number(searchParams.get('page') ?? 1),
      pageSize: Number(searchParams.get('pageSize') ?? 15),
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[store/insta2figma/users]', err)
    return NextResponse.json({ error: 'Falha ao carregar usuários' }, { status: 500 })
  }
}
