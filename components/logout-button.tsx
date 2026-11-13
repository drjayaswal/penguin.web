'use client'

import { useEffect, useState } from 'react'
import { LogOutIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'

export function LogoutButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const timer = setTimeout(() => setAnimating(true), 10)
      return () => clearTimeout(timer)
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  async function handleConfirmLogout() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      document.cookie = 'penguin_session=; path=/; max-age=0'
      router.push('/')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="normal"
        onClick={() => setIsOpen(true)}
        className="w-full flex justify-center items-center sm:w-auto hover:bg-transparent hover:shadow-none"
      >
        <LogOutIcon className="w-6 h-6" />
      </Button>

      {mounted && (
        <div
          onClick={() => setIsOpen(false)}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity duration-200 ${
            animating ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm bg-white/85 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl p-6 flex flex-col gap-4 transform transition-all duration-200 ease-out ${
              animating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2 opacity-0'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-red-50/80 text-red-600 border-red-200">
                  <LogOutIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 leading-tight">
                    Sign out
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Leave your current session
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-black/20 rounded-xl p-3 bg-white/50 backdrop-blur-xs text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to sign out? You will need to authenticate with GitHub again to access your connected repositories.
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-medium border border-white/40 bg-white/70 backdrop-blur-xs text-neutral-700 hover:bg-white/90 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant='normal'
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
              >
                <LogOutIcon className="w-3.5 h-3.5" />
                {isLoggingOut ? 'Leaving...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
