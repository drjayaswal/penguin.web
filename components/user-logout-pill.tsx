"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon, RefreshCwIcon } from "lucide-react"

export function UserLogoutPill({
  avatarUrl,
  name,
  login,
}: {
  avatarUrl?: string | null
  name?: string | null
  login?: string | null
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleSignOut() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      document.cookie = "penguin_session=; path=/; max-age=0"
      router.push("/")
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-30 pointer-events-auto">
      <div className="flex items-center bg-white text-black shadow-2xl p-1.5 transition-all duration-300 ease-out border-0 outline-none ring-0">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-full transition-colors cursor-pointer border-0 outline-none ring-0 p-0.5"
          aria-expanded={isOpen}
          aria-label="Toggle user options"
          title={name || login || "User profile"}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || login || "User"}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-semibold">
              {(name || login || "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-neutral-800 pr-1.5 max-w-[120px] truncate hidden sm:inline">
            {name || login}
          </span>
        </button>

        <div
          className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${ isOpen ? "max-w-[140px] opacity-100 ml-1.5 mr-1" : "max-w-0 opacity-0 ml-0 mr-0 pointer-events-none" }`}
        >
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-red-600 transition-colors text-xs font-medium cursor-pointer shadow-sm border-0 outline-none ring-0 whitespace-nowrap disabled:opacity-50"
          >
            {isLoggingOut ? (
              <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOutIcon className="w-3.5 h-3.5" />
            )}
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  )
}
