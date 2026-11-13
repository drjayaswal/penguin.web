import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (user) redirect('/settings')

  const error = searchParams.error ?? null

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      {error && (
        <div className="absolute top-24 left-0 right-0 flex justify-center px-4 pointer-events-none">
          <p className="text-sm text-red-700 bg-red-50 border border-red-700 px-3 py-1.5 rounded">
            {errorMessage(error)}
          </p>
        </div>
      )}

      <form action="/api/auth/github" method="GET" className="pointer-events-auto">
        <button
          type="submit"
          aria-label="Connect with GitHub"
          className='mt-40 text-white font-medium hover:scale-105 transition-all duration-200'
        >
          Connect
        </button>
      </form>
    </div>
  )
}

function errorMessage(error: string) {
  switch (error) {
    case 'invalid_state':
      return 'Invalid security state. Please try signing in again.'
    case 'missing_params':
      return 'GitHub sign-in was cancelled or missing parameters.'
    case 'token_exchange_failed':
    case 'callback_failed':
      return 'GitHub sign-in failed. Please try again.'
    default:
      return null
  }
}