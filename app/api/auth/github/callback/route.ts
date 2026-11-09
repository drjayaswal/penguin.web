import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { db } from '@/db/index'
import { users, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createSession, sessionCookieOptions } from '@/lib/auth'

export const runtime = 'nodejs'

async function githubOAuthToken(code: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'penguin',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.APP_URL}/api/auth/github/callback`,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub token exchange failed: ${res.status} ${text}`)
  }
  return (await res.json()) as { access_token?: string; error?: string }
}

async function githubUser(accessToken: string) {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'penguin',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub /user failed: ${res.status} ${text}`)
  }
  return (await res.json()) as {
    id: number
    login: string
    name: string | null
    avatar_url: string
  }
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${env.APP_URL}/?error=missing_params`)
  }

  const cookieHeader = req.headers.get('cookie') ?? ''
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)gh_state=([^;]+)/)
  const storedState = stateCookieMatch ? stateCookieMatch[1] : null
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${env.APP_URL}/?error=invalid_state`)
  }

  try {
    const tokenData = await githubOAuthToken(code)
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.redirect(`${env.APP_URL}/?error=token_exchange_failed`)
    }

    const ghUser = await githubUser(tokenData.access_token)

    const [existing] = await db.select().from(users).where(eq(users.githubId, ghUser.id))
    let dbUser = existing
    if (!dbUser) {
      const [created] = await db
        .insert(users)
        .values({
          githubId: ghUser.id,
          login: ghUser.login,
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
        })
        .returning()
      dbUser = created
    }

    const sessionToken = await createSession(dbUser.id)

    const res = NextResponse.redirect(`${env.APP_URL}/settings`)
    res.cookies.set('penguin_session', sessionToken, sessionCookieOptions())
    res.cookies.set('gh_state', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
    return res
  } catch (err) {
    return NextResponse.redirect(`${env.APP_URL}/?error=callback_failed`)
  }
}