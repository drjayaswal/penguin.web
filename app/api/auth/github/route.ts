import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const state = crypto.randomBytes(16).toString('hex')

  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'read:user')
  url.searchParams.set('redirect_uri', `${env.APP_URL}/api/auth/github/callback`)

  const res = NextResponse.redirect(url)
  res.cookies.set('gh_state', state, {
    httpOnly: true,
    secure: !env.APP_URL.startsWith('http://localhost'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}