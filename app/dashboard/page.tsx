import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { LogoutButton } from '@/components/logout-button'
import { GitBranchIcon } from 'lucide-react'

export default async function DashboardPage({
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
    <main className="mx-auto w-full max-w-2xl px-6 py-12 flex flex-col gap-10">
      {error && (
        <div className="p-3 mb-4 border border-red-700 bg-red-50 text-red-700 text-sm rounded">
          {errorMessage(error)}
        </div>
      )}
      <header className="flex items-center justify-between gap-4 border-b border-dashed border-black/25 pb-4">
        <div className="flex items-center gap-3">
          <img
            src={user.user.avatarUrl ?? ''}
            alt=""
            className="w-9 h-9 rounded-full"
          />
          <div className="leading-tight">
            <p className="text-sm font-medium">{user.user.name || user.user.login}</p>
            <p className="text-xs text-neutral-500">@{user.user.login}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      <form action="/api/github/install" method="GET">
        <button
          type="submit"
          className="flex gap-2 w-full justify-center items-center sm:w-auto px-4 py-2 rounded-xl font-medium bg-blue-600/10 text-blue-600 hover:text-white text-sm hover:bg-blue-600 transition-all duration-200"
        >
          <GitBranchIcon className="w-4 h-4" />
          Connect Repository
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wide text-neutral-500">Repositories</h2>

        {repos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No repositories connected yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-200 border-y border-neutral-200">
            {repos.map((repo) => (
              <li key={repo.repoId} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate">{repo.fullName}</span>
                  {repo.isPrivate && (
                    <span className="text-[11px] text-neutral-500 border border-neutral-300 rounded px-1.5 py-0.5">
                      private
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
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