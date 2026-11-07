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
  if (user) redirect('/dashboard')

  const error = searchParams.error ?? null

  return (
    <div className="fixed border border-black border-dashed m-1 inset-0 overflow-hidden flex flex-col items-center justify-between">
      <div className="w-full flex flex-col items-center">
        {error && (
          <p className="text-sm text-red-700">{errorMessage(error)}</p>
        )}
      </div>

      <div className="w-full flex flex-col items-center">
        <form action="/api/auth/github" method="GET" className="flex flex-col items-center">
          <button 
            type="submit"
            className="overflow-hidden transition-transform translate-y-1 active:translate-y-3"
            aria-label="Sign in with GitHub"
          >
            <Image 
              src="/penguin.png" 
              alt="Penguin logo" 
              className="w-28 invert h-auto object-contain"
              width={120} 
              height={50} 
              priority
            />
          </button>
        </form>
      </div>
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