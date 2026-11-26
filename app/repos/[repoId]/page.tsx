import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { db } from '@/db/index'
import { commits, githubInstallations, installationRepos } from '@/db/schema'
import { and, desc, eq, or } from 'drizzle-orm'
import { RepoDetailClient } from '@/components/repos/repo-detail-client'
import { UserLogoutPill } from '@/components/user-logout-pill'

export const dynamic = 'force-dynamic'

export default async function RepoDetailPage({
  params,
}: {
  params: { repoId: string }
}) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (!user) redirect('/')

  const targetId = parseInt(params.repoId, 10)
  if (Number.isNaN(targetId)) redirect('/settings')

  const [repoRecord] = await db
    .select({
      id: installationRepos.id,
      repoId: installationRepos.repoId,
      fullName: installationRepos.fullName,
      isPrivate: installationRepos.isPrivate,
    })
    .from(installationRepos)
    .innerJoin(githubInstallations, eq(installationRepos.installationId, githubInstallations.id))
    .where(
      and(
        eq(githubInstallations.userId, user.user.id),
        or(eq(installationRepos.repoId, targetId), eq(installationRepos.id, targetId)),
      ),
    )

  if (!repoRecord) redirect('/settings')

  const initialCommitsRaw = await db
    .select({
      id: commits.id,
      sha: commits.sha,
      message: commits.message,
      authorName: commits.authorName,
      authorEmail: commits.authorEmail,
      authorLogin: commits.authorLogin,
      committedAt: commits.committedAt,
      parentShas: commits.parentShas,
    })
    .from(commits)
    .where(eq(commits.repoId, repoRecord.id))
    .orderBy(desc(commits.committedAt), desc(commits.id))
    .limit(50)

  const initialCommits = initialCommitsRaw.map((c) => ({
    ...c,
    committedAt: c.committedAt.toISOString(),
  }))

  const needsSync = initialCommits.length === 0

  return (
    <div className="min-h-screen bg-white">
      <div>
        <RepoDetailClient
          repo={repoRecord}
          initialCommits={initialCommits}
          needsSync={needsSync}
        />
      </div>
      <UserLogoutPill
        avatarUrl={user.user.avatarUrl}
        name={user.user.name}
        login={user.user.login}
      />
    </div>
  )
}
