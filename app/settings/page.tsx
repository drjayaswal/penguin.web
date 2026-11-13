import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/logout-button'
import { GitBranchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RepoCommitsList } from '@/components/repo-commits-card'
import { db } from '@/db/index'
import { commits, githubInstallations, installationRepos, userAiSettings } from '@/db/schema'
import { AI_PROVIDERS } from '@/lib/ai/providers'
import { getUserTodayUsage } from '@/lib/ai/usage'
import { env } from '@/lib/env'
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

  const [aiSettingsRow] = await db
    .select({
      provider: userAiSettings.provider,
      model: userAiSettings.model,
      apiKeyLast4: userAiSettings.apiKeyLast4,
    })
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, user.user.id))

  const todayUsage = await getUserTodayUsage(user.user.id)
  const defaultProviderId = env.DEFAULT_PROVIDER
  const defaultProviderLabel = AI_PROVIDERS[defaultProviderId].label

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <main className="w-full flex-1">
        <RepoCommitsList
          repos={reposWithCommits}
          aiConfig={{
            initialSettings: aiSettingsRow
              ? {
                configured: true,
                provider: aiSettingsRow.provider,
                model: aiSettingsRow.model,
                last4: aiSettingsRow.apiKeyLast4,
              }
              : {
                configured: false,
                provider: null,
                model: null,
                last4: null,
              },
            initialUsage: {
              used: todayUsage.used,
              limit: todayUsage.limit,
              resetsAt: todayUsage.resetsAt,
            },
            defaultProviderId,
            defaultProviderLabel,
            defaultModel: env.DEFAULT_AI_MODEL,
          }}
          header={
            <>
              {error && (
                <div className="p-3 border border-red-700 bg-red-50 text-red-700 text-sm rounded">
                  {errorMessage(error)}
                </div>
              )}

              <div className="flex items-center justify-between pb-4 border-b border-dashed border-white/50">
                <div>
                  <h1 className="text-3xl font-semibold text-white tracking-tight">Repositories</h1>
                  <p className="text-xs text-white/75">Connected repositories and GitHub access</p>
                </div>
                <form action="/api/github/install" method="GET">
                  <Button
                    type="submit"
                    variant="normal"
                    className="flex gap-2 items-center px-4 py-2"
                  >
                    <GitBranchIcon className="w-4 h-4" />
                    <span className="hidden min-[1000px]:block text-white">Connect</span>
                    <span className="min-[1000px]:hidden text-white">Repository</span>
                  </Button>
                </form>
              </div>
            </>
          }
        />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center bg-white/15 rounded-tr-[20px] backdrop-blur-md border-t border-r border-white/20 p-4 gap-3 min-w-0 pointer-events-auto max-[449px]:flex-1 max-[449px]:justify-start">
            {user.user.avatarUrl && (
              <img
                src={user.user.avatarUrl}
                alt={user.user.name || user.user.login}
                title={user.user.name || user.user.login}
                className="w-9 h-9 shrink-0 rounded-full border border-black/10"
              />
            )}
            <div className="leading-tight text-white min-w-0">
              <p className="text-sm font-medium truncate">{user.user.name || user.user.login}</p>
              <p className="text-xs text-white/75 truncate">@{user.user.login}</p>
            </div>
          </div>
          <div className="pointer-events-auto max-[449px]:flex-1 max-[449px]:flex max-[449px]:justify-center">
            <LogoutButton />
          </div>
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
