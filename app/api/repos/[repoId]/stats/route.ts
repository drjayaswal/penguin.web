import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { commits, githubInstallations, installationRepos } from '@/db/schema'
import { and, eq, gte, or } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { repoId: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const targetId = parseInt(params.repoId, 10)
  if (Number.isNaN(targetId)) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const [repoRecord] = await db
    .select({ id: installationRepos.id })
    .from(installationRepos)
    .innerJoin(githubInstallations, eq(installationRepos.installationId, githubInstallations.id))
    .where(
      and(
        eq(githubInstallations.userId, user.user.id),
        or(eq(installationRepos.repoId, targetId), eq(installationRepos.id, targetId)),
      ),
    )

  if (!repoRecord) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const rows = await db
    .select({
      authorLogin: commits.authorLogin,
      authorName: commits.authorName,
      authorEmail: commits.authorEmail,
      committedAt: commits.committedAt,
    })
    .from(commits)
    .where(
      and(
        eq(commits.repoId, repoRecord.id),
        gte(commits.committedAt, threeYearsAgo),
      ),
    )

  const byDayAuthor: Record<string, Record<string, number>> = {}

  for (const row of rows) {
    const author = row.authorLogin
      ? `@${row.authorLogin}`
      : row.authorName || row.authorEmail || 'Unknown'
    const d = new Date(row.committedAt)
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

    if (!byDayAuthor[dateKey]) byDayAuthor[dateKey] = {}
    byDayAuthor[dateKey][author] = (byDayAuthor[dateKey][author] ?? 0) + 1
  }

  const entries: { date: string; author: string; count: number }[] = []
  for (const [date, authorMap] of Object.entries(byDayAuthor)) {
    for (const [author, count] of Object.entries(authorMap)) {
      entries.push({ date, author, count })
    }
  }

  const authors = Array.from(
    new Set(rows.map((r) =>
      r.authorLogin ? `@${r.authorLogin}` : r.authorName || r.authorEmail || 'Unknown'
    ))
  ).sort()

  return NextResponse.json({ entries, authors })
}
