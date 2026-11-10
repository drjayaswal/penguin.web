import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { githubInstallations, installationRepos, commits } from '@/db/schema'
import { and, eq, or } from 'drizzle-orm'
import {
  getInstallationAccessToken,
  fetchAllRepoCommits,
  GitHubApiError,
  GitHubCommitItem,
} from '@/lib/github'

export const runtime = 'nodejs'

export async function POST(
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
      repoId: installationRepos.repoId,
      fullName: installationRepos.fullName,
      installationId: githubInstallations.installationId,
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

  let installationToken: string
  try {
    installationToken = await getInstallationAccessToken(repoRecord.installationId)
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to authenticate with GitHub' }, { status: 502 })
  }

  let allCommits: GitHubCommitItem[]
  try {
    allCommits = await fetchAllRepoCommits(repoRecord.fullName, installationToken)
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to fetch commits from GitHub' }, { status: 502 })
  }

  const commitRows = allCommits.map((item) => {
    const dateStr = item.commit?.committer?.date || item.commit?.author?.date
    const committedAt = dateStr ? new Date(dateStr) : new Date()
    const parentShas = (item.parents ?? []).map((p) => p.sha).filter(Boolean)
    return {
      repoId: repoRecord.id,
      sha: item.sha,
      message: item.commit?.message ?? '',
      authorName: item.commit?.author?.name ?? null,
      authorEmail: item.commit?.author?.email ?? null,
      authorLogin: item.author?.login ?? null,
      committedAt,
      parentShas,
    }
  })

  const seen = new Set<string>()
  const uniqueRows: typeof commitRows = []
  for (const row of commitRows) {
    if (!seen.has(row.sha)) {
      seen.add(row.sha)
      uniqueRows.push(row)
    }
  }

  let inserted = 0
  const batchSize = 100
  for (let i = 0; i < uniqueRows.length; i += batchSize) {
    const batch = uniqueRows.slice(i, i + batchSize)
    const res = await db
      .insert(commits)
      .values(batch)
      .onConflictDoNothing({ target: [commits.repoId, commits.sha] })
      .returning({ id: commits.id })
    inserted += res.length
  }

  return NextResponse.json({
    fetched: allCommits.length,
    inserted,
  })
}

