'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOutIcon, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CONFIRM_WINDOW_MS = 5000

export function LogoutButton() {
  const router = useRouter()
  const [armed, setArmed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimer()
  }, [])

  async function signOut() {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      document.cookie = 'penguin_session=; path=/; max-age=0'
      router.push('/')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
      setArmed(false)
    }
  }

  function handleClick() {
    if (isLoggingOut) return

    if (armed) {
      clearTimer()
      setArmed(false)
      return
    }

    setArmed(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setArmed(false)
      void signOut()
    }, CONFIRM_WINDOW_MS)
  }

  return (
    <button
      type="button"
      aria-label={armed ? 'Cancel sign out' : 'Sign out'}
      onClick={handleClick}
      disabled={isLoggingOut}
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg${
        armed
          ? 'bg-red-600 text-white'
          : 'bg-white/10 hover:bg-white/20 hover:text-white text-white/80'
      }`}
    >
      {armed ? <Square className="w-5 h-5 fill-white" /> : <LogOutIcon className="w-5 h-5" />}

      {armed && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
          viewBox="0 0 40 40"
        >
          <rect
            x="1"
            y="1"
            width="38"
            height="38"
            rx="11"
            ry="11"
            pathLength={100}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="100"
            strokeDashoffset="0"
            style={{
              animation: `logout-deplete ${CONFIRM_WINDOW_MS}ms linear forwards`,
            }}
          />
        </svg>
      )}

      <style>{`
        @keyframes logout-deplete {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 100; }
        }
      `}</style>
    </button>
  )
}