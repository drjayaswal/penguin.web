import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  // Only the signed-in user can connect repositories.
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.redirect(`${env.APP_URL}/`)
  }

  const state = crypto.randomBytes(16).toString('hex')

  const url = new URL(`https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`)
  url.searchParams.set('state', state)

  const res = NextResponse.redirect(url)
  res.cookies.set('gh_install_state', state, {
    httpOnly: true,
    secure: !env.APP_URL.startsWith('http://localhost'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}