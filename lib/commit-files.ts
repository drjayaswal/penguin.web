import { db } from '@/db/index'
import { CommitFileStatus, commitFiles } from '@/db/schema'
import { fetchCommitFiles, getInstallationAccessToken, GitHubCommitFile } from '@/lib/github'
import { asc, eq, sql } from 'drizzle-orm'

export interface StoredCommitFile {
  id: number
  filename: string
  status: CommitFileStatus
  additions: number
  deletions: number
  patch: string | null
  previousFilename: string | null
  createdAt: Date
}

function normalizeFileStatus(status?: string): CommitFileStatus {
  if (
    status === 'A' ||
    status === 'M' ||
    status === 'D' ||
    status === 'E'
  ) {
    return status
  }
  return 'O'
}

export async function ensureCommitFiles(params: {
  commitId: number
  sha: string
  repoFullName: string
  installationId: number
}): Promise<StoredCommitFile[]> {
  const existing = await db
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
    .where(eq(commitFiles.commitId, params.commitId))
    .orderBy(asc(commitFiles.id))

  if (existing.length > 0) {
    return existing
  }

  const installationToken = await getInstallationAccessToken(params.installationId)
  const rawFiles: GitHubCommitFile[] = await fetchCommitFiles(
    params.repoFullName,
    params.sha,
    installationToken,
  )

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
      commitId: params.commitId,
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

  const storedFiles: StoredCommitFile[] = []
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
    storedFiles.push(...res)
  }

  return storedFiles
}

