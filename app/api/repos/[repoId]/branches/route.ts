import { NextResponse } from 'next/server'
import { db } from '@/db/index'
import { requireUser } from '@/lib/auth'
import { githubInstallations, installationRepos } from '@/db/schema'
import { and, eq, or } from 'drizzle-orm'
import { getInstallationAccessToken, GitHubApiError } from '@/lib/github'

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

  let token: string
  try {
    token = await getInstallationAccessToken(repoRecord.installationId)
  } catch (err: any) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to authenticate with GitHub' }, { status: 502 })
  }

  let page = 1
  const allBranches: { name: string; sha: string; isDefault: boolean }[] = []
  let defaultBranch = 'main'

  try {
    const repoRes = await fetch(`https://api.github.com/repos/${repoRecord.fullName}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'penguin',
      },
      cache: 'no-store',
    })
    if (repoRes.ok) {
      const repoData = await repoRes.json()
      defaultBranch = repoData.default_branch ?? 'main'
    }
  } catch {
  }

  while (true) {
    const url = `https://api.github.com/repos/${repoRecord.fullName}/branches?per_page=100&page=${page}`
    let res: Response
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'penguin',
        },
        cache: 'no-store',
      })
    } catch {
      break
    }

    if (!res.ok) break

    const data = await res.json().catch(() => [])
    if (!Array.isArray(data) || data.length === 0) break

    for (const branch of data) {
      allBranches.push({
        name: branch.name,
        sha: branch.commit?.sha ?? '',
        isDefault: branch.name === defaultBranch,
      })
    }

    if (data.length < 100) break
    page++
  }

  return NextResponse.json({ branches: allBranches, defaultBranch })
}
