import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/logout-button'
import { GitBranchIcon, GlobeIcon, LockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (!user) redirect('/')

  const error = searchParams?.error ?? null

  let repos: Array<{ repoId: number; fullName: string; isPrivate: boolean }> = []
  try {
    const base = process.env.APP_URL ?? ''
    const res = await fetch(`${base}/api/repos`, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      repos = data.repos ?? []
    }
  } catch {
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <main className="mx-auto w-full max-w-2xl px-6 pt-24 pb-28 flex flex-col gap-8">
        {error && (
          <div className="p-3 border border-red-700 bg-red-50 text-red-700 text-sm rounded">
            {errorMessage(error)}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-dashed border-black/25">
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

        <section className="flex flex-col gap-3">
          {repos.length === 0 ? (
            <p className="text-sm text-neutral-600 py-4">
              No repositories connected yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {repos.map((repo) => (
                <li
                  key={repo.repoId}
                >
                  <Link
                    href={`https://github.com/${repo.fullName}`}
                    className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-black hover:text-blue-600 bg-white border border-gray-200/75 outline-0 ring-0 shadow-md transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.isPrivate ? (
                        <LockIcon className="h-4 w-4 shrink-0 text-neutral-500" aria-label="Private repository" />
                      ) : (
                        <GlobeIcon className="h-4 w-4 shrink-0 text-neutral-500" aria-label="Public repository" />
                      )}
                      <span className="text-sm font-medium truncate">{repo.fullName}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="fixed bottom-1 left-1 right-1 z-20 bg-bg/95 backdrop-blur-xs">
        <div className="mx-auto w-full max-w-2xl px-6 py-4 flex items-center justify-between gap-4">
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
