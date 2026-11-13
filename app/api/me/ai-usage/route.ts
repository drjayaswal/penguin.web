import { NextResponse } from 'next/server'
import { getUserTodayUsage } from '@/lib/ai/usage'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const usage = await getUserTodayUsage(user.user.id)
  return NextResponse.json({
    used: usage.used,
    limit: usage.limit,
    resetsAt: usage.resetsAt,
  })
}

