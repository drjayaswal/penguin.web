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
          error={error ? errorMessage(error) : null}
          connectAction={
            <form action="/api/github/install" method="GET">
              <Button
                type="submit"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white/5 border-0 hover:bg-white/10 backdrop-blur-md text-white transition-all duration-200 cursor-pointer shadow-sm text-sm font-medium"
              >
                <span className="text-white">Connect</span>
              </Button>
            </form>
          }
        />
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4">
        <div className="mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center bg-white/10 hover:bg-white/15 rounded-2xl backdrop-blur-md p-1 gap-2.5 min-w-0 pointer-events-auto transition-colors shadow-lg">
            {user.user.avatarUrl && (
              <img
                src={user.user.avatarUrl}
                alt={user.user.name || user.user.login}
                title={user.user.name || user.user.login}
                className="w-9 h-9 shrink-0 rounded-full object-cover"
              />
            )}
          </div>

          <div className="pointer-events-auto">
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
