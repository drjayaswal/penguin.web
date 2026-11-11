import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import {
  commitFiles,
  commits,
  githubInstallations,
  installationRepos,
} from '@/db/schema'
import { and, asc, eq, or } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: { repoId: string; sha: string } },
): Promise<Response> {
  const user = await requireUser(req.headers.get('cookie') ?? '')
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!/^\d+$/.test(params.repoId)) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const targetId = parseInt(params.repoId, 10)
  if (Number.isNaN(targetId) || targetId <= 0 || targetId > 2147483647) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const sha = (params.sha ?? '').trim()
  if (!sha) {
    return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
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

  const [commitRecord] = await db
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
    .where(and(eq(commits.repoId, repoRecord.id), eq(commits.sha, sha)))

  if (!commitRecord) {
    return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
  }

  const files = await db
    .select({
      id: commitFiles.id,
      filename: commitFiles.filename,
      status: commitFiles.status,
      additions: commitFiles.additions,
      deletions: commitFiles.deletions,
      patch: commitFiles.patch,
      previousFilename: commitFiles.previousFilename,
    })
    .from(commitFiles)
    .where(eq(commitFiles.commitId, commitRecord.id))
    .orderBy(asc(commitFiles.id))

  return NextResponse.json({
    commit: commitRecord,
    files,
  })
}

