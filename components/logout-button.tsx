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
        variant="destructive"
        onClick={() => setIsOpen(true)}
        className="w-full flex justify-center items-center gap-2 sm:w-auto"
      >
        <LogOutIcon className="w-4 h-4" />
        Leave
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
            className={`w-full max-w-sm bg-white rounded-2xl border border-black/15 shadow-2xl p-6 flex flex-col gap-4 transform transition-all duration-200 ease-out ${
              animating ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-2 opacity-0'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-red-50 text-red-600 border-red-200">
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
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-dashed border-black/20 rounded-xl p-3 bg-neutral-50/60 text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to sign out? You will need to authenticate with GitHub again to access your connected repositories.
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-medium border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2 px-4 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOutIcon className="w-3.5 h-3.5" />
                {isLoggingOut ? 'Leaving...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
