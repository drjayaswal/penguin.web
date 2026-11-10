import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { githubInstallations, installationRepos, commits } from '@/db/schema'
import { and, desc, eq, lt, or } from 'drizzle-orm'

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
    .select({
      id: installationRepos.id,
    })
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

  const url = new URL(req.url)
  const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const limit = Math.min(Math.max(1, Number.isNaN(limitParam) ? 50 : limitParam), 100)
  const cursor = url.searchParams.get('cursor')

  const conditions = [eq(commits.repoId, repoRecord.id)]

  if (cursor) {
    if (cursor.includes('_')) {
      const [datePart, idPart] = cursor.split('_')
      const cursorDate = new Date(datePart)
      const cursorId = parseInt(idPart, 10)
      if (!Number.isNaN(cursorDate.getTime()) && !Number.isNaN(cursorId)) {
        conditions.push(
          or(
            lt(commits.committedAt, cursorDate),
            and(eq(commits.committedAt, cursorDate), lt(commits.id, cursorId)),
          )!,
        )
      }
    } else {
      const cursorDate = new Date(cursor)
      if (!Number.isNaN(cursorDate.getTime())) {
        conditions.push(lt(commits.committedAt, cursorDate))
      }
    }
  }

  const rows = await db
    .select({
      id: commits.id,
      repoId: commits.repoId,
      sha: commits.sha,
      message: commits.message,
      authorName: commits.authorName,
      authorEmail: commits.authorEmail,
      authorLogin: commits.authorLogin,
      committedAt: commits.committedAt,
      parentShas: commits.parentShas,
      createdAt: commits.createdAt,
    })
    .from(commits)
    .where(and(...conditions))
    .orderBy(desc(commits.committedAt), desc(commits.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  const nextCursor =
    hasMore && items.length > 0
      ? `${items[items.length - 1].committedAt.toISOString()}_${items[items.length - 1].id}`
      : null

  return NextResponse.json({
    commits: items,
    nextCursor,
  })
}

