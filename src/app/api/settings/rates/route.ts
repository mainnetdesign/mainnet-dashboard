import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const OVERRIDE_PATH = path.join(process.cwd(), 'src/config/rates-override.json')

function readOverrides(): Record<string, { monthlySalary?: number; hourlyRate?: number }> {
  try {
    return JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export async function GET() {
  return NextResponse.json(readOverrides())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(body, null, 2))
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
