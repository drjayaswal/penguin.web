import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { db } from '@/db/index'
import { sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sessionCookieOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)penguin_session=([^;]+)/)
  if (match) {
    await db.delete(sessions).where(eq(sessions.id, match[1]))
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('penguin_session', '', {
    httpOnly: true,
    secure: !env.APP_URL.startsWith('http://localhost'),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}