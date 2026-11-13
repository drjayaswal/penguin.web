import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import {
  CommitFileStatus,
  commitFiles,
  commits,
  githubInstallations,
  installationRepos,
} from '@/db/schema'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import {
  fetchCommitFiles,
  getInstallationAccessToken,
  GitHubApiError,
  GitHubCommitFile,
} from '@/lib/github'

export const runtime = 'nodejs'

function normalizeFileStatus(status?: string): CommitFileStatus {
  if (
    status === 'A' ||
    status === 'M' ||
    status === 'D' ||
    status === 'E'
  ) {
    return status
  }
  return 'E'
}

export async function POST(
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

  const [commitRecord] = await db
    .select({
      id: commits.id,
      repoId: commits.repoId,
      sha: commits.sha,
    })
    .from(commits)
    .where(and(eq(commits.repoId, repoRecord.id), eq(commits.sha, sha)))

  if (!commitRecord) {
    return NextResponse.json({ error: 'Commit not found' }, { status: 404 })
  }

  const existingFiles = await db
    .select({
      id: commitFiles.id,
      filename: commitFiles.filename,
      status: commitFiles.status,
      additions: commitFiles.additions,
      deletions: commitFiles.deletions,
      patch: commitFiles.patch,
      previousFilename: commitFiles.previousFilename,
      createdAt: commitFiles.createdAt,
    })
    .from(commitFiles)
    .where(eq(commitFiles.commitId, commitRecord.id))
    .orderBy(asc(commitFiles.id))

  if (existingFiles.length > 0) {
    console.log(
      `[commit/fetch] cache hit repo=${repoRecord.fullName} sha=${commitRecord.sha} files=${existingFiles.length}`,
    )
    return NextResponse.json({
      fetched: 0,
      inserted: 0,
      cached: true,
      files: existingFiles,
    })
  }

  let installationToken: string
  try {
    installationToken = await getInstallationAccessToken(repoRecord.installationId)
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502
      return NextResponse.json({ error: err.message }, { status })
    }
    return NextResponse.json({ error: 'Failed to authenticate with GitHub' }, { status: 502 })
  }

  let rawFiles: GitHubCommitFile[]
  try {
    console.log(`[commit/fetch] fetching from GitHub repo=${repoRecord.fullName} sha=${commitRecord.sha}`)
    rawFiles = await fetchCommitFiles(repoRecord.fullName, commitRecord.sha, installationToken)
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502
      return NextResponse.json({ error: err.message }, { status })
    }
    return NextResponse.json({ error: 'Failed to fetch commit files from GitHub' }, { status: 502 })
  }

  const seenFilenames = new Set<string>()
  const rowsToUpsert: Array<{
    commitId: number
    filename: string
    status: CommitFileStatus
    additions: number
    deletions: number
    patch: string | null
    previousFilename: string | null
  }> = []

  for (const item of rawFiles) {
    if (!item.filename || seenFilenames.has(item.filename)) continue
    seenFilenames.add(item.filename)
    rowsToUpsert.push({
      commitId: commitRecord.id,
      filename: item.filename,
      status: normalizeFileStatus(item.status),
      additions: typeof item.additions === 'number' && Number.isFinite(item.additions) ? item.additions : 0,
      deletions: typeof item.deletions === 'number' && Number.isFinite(item.deletions) ? item.deletions : 0,
      patch: typeof item.patch === 'string' ? item.patch.replace(/\0/g, '') : null,
      previousFilename:
        typeof item.previous_filename === 'string' && item.previous_filename.length > 0
          ? item.previous_filename
          : null,
    })
  }

  let inserted = 0
  const storedFiles: Array<{
    id: number
    filename: string
    status: CommitFileStatus
    additions: number
    deletions: number
    patch: string | null
    previousFilename: string | null
    createdAt: Date
  }> = []

  const batchSize = 100
  for (let i = 0; i < rowsToUpsert.length; i += batchSize) {
    const batch = rowsToUpsert.slice(i, i + batchSize)
    const res = await db
      .insert(commitFiles)
      .values(batch)
      .onConflictDoUpdate({
        target: [commitFiles.commitId, commitFiles.filename],
        set: {
          status: sql`excluded.status`,
          additions: sql`excluded.additions`,
          deletions: sql`excluded.deletions`,
          patch: sql`excluded.patch`,
          previousFilename: sql`excluded.previous_filename`,
        },
      })
      .returning({
        id: commitFiles.id,
        filename: commitFiles.filename,
        status: commitFiles.status,
        additions: commitFiles.additions,
        deletions: commitFiles.deletions,
        patch: commitFiles.patch,
        previousFilename: commitFiles.previousFilename,
        createdAt: commitFiles.createdAt,
      })
    inserted += res.length
    storedFiles.push(...res)
  }

  return NextResponse.json({
    fetched: rawFiles.length,
    inserted,
    cached: false,
    files: storedFiles,
  })
}

