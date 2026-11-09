'use client'

import { LogOutIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'

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
      <Button
        type="submit"
        variant="destructive"
        className="w-full flex justify-center items-center gap-2 sm:w-auto"
      >
        <LogOutIcon className="w-4 h-4" />
        Leave
      </Button>
    </form>
  )
}