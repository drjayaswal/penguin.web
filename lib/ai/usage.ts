import { db } from '@/db/index'
import { aiUsage } from '@/db/schema'
import { env } from '@/lib/env'
import { and, eq, sql } from 'drizzle-orm'

export function getUtcDayString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function getUtcResetIso(now: Date = new Date()): string {
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  )
  return nextMidnight.toISOString()
}

export async function getUserTodayUsage(userId: number, now: Date = new Date()): Promise<{
  used: number
  limit: number
  resetsAt: string
  day: string
}> {
  const day = getUtcDayString(now)
  const resetsAt = getUtcResetIso(now)
  const limit = env.AI_DEFAULT_DAILY_LIMIT

  const [row] = await db
    .select({ count: aiUsage.count })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)))

  return {
    used: row?.count ?? 0,
    limit,
    resetsAt,
    day,
  }
}

export async function consumeDailyUsageSlot(
  userId: number,
  day: string,
  limit: number,
): Promise<number | null> {
  if (limit <= 0) return null
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO ai_usage (user_id, day, count)
    VALUES (${userId}, ${day}::date, 1)
    ON CONFLICT (user_id, day) DO UPDATE
    SET count = ai_usage.count + 1
    WHERE ai_usage.count < ${limit}
    RETURNING count
  `)
  const row = result.rows?.[0]
  if (!row) return null
  return Number(row.count)
}

export async function refundDailyUsageSlot(userId: number, day: string): Promise<void> {
  await db.execute(sql`
    UPDATE ai_usage
    SET count = GREATEST(count - 1, 0)
    WHERE user_id = ${userId} AND day = ${day}::date
  `)
}

