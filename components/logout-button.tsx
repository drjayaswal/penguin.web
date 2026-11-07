'use client'

import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/auth/logout', { method: 'POST' })
    document.cookie = 'penguin_session=; path=/; max-age=0'
    router.push('/')
    router.refresh()
  }

  return (
    <form
      action="/api/auth/logout"
      method="POST"
      onSubmit={handleLogout}
      className="flex items-center gap-2"
    >
      <button
        type="submit"
        className="w-full flex justify-center items-center gap-2 sm:w-auto px-4 py-2 rounded-2xl font-medium bg-red-600/10 text-red-600 hover:text-white text-sm hover:bg-red-600 transition-all duration-200"
      >
        <LogOutIcon className="w-4 h-4" />
        Leave
      </button>
    </form>
  )
}