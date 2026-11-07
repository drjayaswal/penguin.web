import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = new URL(req.url)
  if (url.pathname === '/dashboard' && !req.cookies.has('penguin_session')) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard'],
}