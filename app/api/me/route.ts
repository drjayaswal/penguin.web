import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    id: user.user.id,
    login: user.user.login,
    name: user.user.name,
    avatarUrl: user.user.avatarUrl,
  })
}