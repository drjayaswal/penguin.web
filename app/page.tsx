import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import Image from 'next/image'

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
    <div className="fixed left-1/2 min-h-screen overflow-hidden flex flex-col items-center justify-end">
      {error && (
        <div className="absolute top-24 left-0 right-0 flex justify-center px-4">
          <p className="text-sm text-red-700 bg-red-50 border border-red-700 px-3 py-1.5 rounded">
            {errorMessage(error)}
          </p>
        </div>
      )}

      <form action="/api/auth/github" method="GET" className="flex flex-col items-center">
        <button
          type="submit"
          className="relative overflow-hidden group transition-transform translate-y-1 active:translate-y-3 cursor-pointer"
          aria-label="Sign in with GitHub"
        >
          <Image
            src="/Penguin.png"
            alt="Penguin logo"
            className="w-28 invert h-auto object-contain"
            width={120}
            height={50}
            priority
          />
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
