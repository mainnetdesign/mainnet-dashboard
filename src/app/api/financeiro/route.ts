import { NextResponse } from 'next/server'
import cache from '@/config/nubank-cache.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(cache)
}
