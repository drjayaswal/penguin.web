import crypto from 'crypto'
import { db } from '@/db/index'
import { sessions, users } from '@/db/schema'
import { and, eq, gt } from 'drizzle-orm'
import { env, isLocalhost } from '@/lib/env'

export const SESSION_COOKIE = 'penguin_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/** Create a session row for a user and return the raw session token. */
export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken()
  await db.insert(sessions).values({
    id: token,
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  })
  return token
}

/** Delete a session row by raw token. */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, token))
}

/**
 * Resolve the signed-in user from a Cookie header string.
 * Returns { user, session } or null when there is no valid session.
 * Used by all protected routes (requireUser).
 */
export async function requireUser(cookie: string): Promise<{ user: typeof users.$inferSelect; session: typeof sessions.$inferSelect } | null> {
  const match = cookie.match(/(?:^|;\s*)penguin_session=([^;]+)/)
  if (!match) return null

  const token = match[1]
  const tokenHash = hashToken(token)

  const [sessionRow] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))

  if (!sessionRow) return null

  const [user] = await db.select().from(users).where(eq(users.id, sessionRow.userId))
  if (!user) return null

  return { user, session: sessionRow }
}

/** Build Set-Cookie options shared across the app. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: !isLocalhost(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  }
}