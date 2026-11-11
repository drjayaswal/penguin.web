import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/logout-button'
import { GitBranchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RepoCommitsList } from '@/components/repo-commits-card'
import { db } from '@/db/index'
import { commits, githubInstallations, installationRepos } from '@/db/schema'
import { asc, desc, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (!user) redirect('/')

  const error = searchParams?.error ?? null

  const repos = await db
    .select({
      id: installationRepos.id,
      repoId: installationRepos.repoId,
      fullName: installationRepos.fullName,
      isPrivate: installationRepos.isPrivate,
    })
    .from(installationRepos)
    .innerJoin(githubInstallations, eq(installationRepos.installationId, githubInstallations.id))
    .where(eq(githubInstallations.userId, user.user.id))
    .orderBy(asc(installationRepos.fullName))

  const reposWithCommits = await Promise.all(
    repos.map(async (repo) => {
      let initialCommits: any[] = []
      try {
        initialCommits = await db
          .select({
            id: commits.id,
            sha: commits.sha,
            message: commits.message,
            authorName: commits.authorName,
            authorEmail: commits.authorEmail,
            authorLogin: commits.authorLogin,
            committedAt: commits.committedAt,
          })
          .from(commits)
          .where(eq(commits.repoId, repo.id))
          .orderBy(desc(commits.committedAt), desc(commits.id))
          .limit(50)
      } catch {
      }

      return {
        ...repo,
        initialCommits: initialCommits.map((c) => ({
          ...c,
          committedAt: c.committedAt.toISOString(),
        })),
      }
    }),
  )

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <main className="w-full flex-1">
        <RepoCommitsList
          repos={reposWithCommits}
          header={
            <>
              {error && (
                <div className="p-3 border border-red-700 bg-red-50 text-red-700 text-sm rounded">
                  {errorMessage(error)}
                </div>
              )}

              <div className="flex items-center justify-between pb-4 border-b border-dashed border-black/25">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Repositories</h1>
                  <p className="text-xs text-neutral-600">Connected repositories and GitHub access</p>
                </div>
                <form action="/api/github/install" method="GET">
                  <Button
                    type="submit"
                    variant="normal"
                    className="flex gap-2 items-center px-4 py-2"
                  >
                    <GitBranchIcon className="w-4 h-4" />
                    Connect Repository
                  </Button>
                </form>
              </div>
            </>
          }
        />
      </main>

      <footer className="fixed bottom-1 left-1 right-1 z-20 bg-bg/95 backdrop-blur-xs">
        <div className="mx-auto w-full w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user.user.avatarUrl && (
              <img
                src={user.user.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full border border-black/10"
              />
            )}
            <div className="leading-tight">
              <p className="text-sm font-medium">{user.user.name || user.user.login}</p>
              <p className="text-xs text-neutral-600">@{user.user.login}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </footer>
    </div>
  )
}

function errorMessage(error: string) {
  switch (error) {
    case 'no_installation':
      return 'No installation was provided by GitHub.'
    case 'invalid_state':
      return 'Invalid security state. Please try connecting again.'
    case 'invalid_installation':
      return 'Invalid installation ID.'
    case 'install_failed':
      return 'Repository installation failed. Please try again.'
    default:
      return error
  }
}
