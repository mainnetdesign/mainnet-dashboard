import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

// Senha de acesso ao dashboard
// Para alterar: mude o valor abaixo e faça deploy
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? 'mainnet2025'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check auth cookie
  const token = req.cookies.get('dashboard-auth')?.value

  if (token !== DASHBOARD_PASSWORD) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
