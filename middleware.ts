import { NextResponse, NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = new URL(req.url)

  if (url.pathname.startsWith('/dashboard')) {
    const targetUrl = new URL(url.pathname.replace(/^\/dashboard/, '/settings') || '/settings', req.url)
    targetUrl.search = url.search
    return NextResponse.redirect(targetUrl)
  }

  if (
    (url.pathname.startsWith('/settings') || url.pathname.startsWith('/workflows')) &&
    !req.cookies.has('penguin_session')
  ) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/settings/:path*', '/settings', '/workflows/:path*', '/workflows'],
}
