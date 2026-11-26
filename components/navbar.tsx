"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

export function Navbar({
  isCentered = false,
  user = null,
}: {
  isCentered?: boolean
  user?: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const containerClass = isCentered
    ? "fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
    : "fixed top-0 left-0 right-0 z-50 pt-3 sm:pt-4 px-3 sm:px-6 flex justify-center pointer-events-none"

  const isHome = pathname === "/"
  const isWhatsNew = pathname === "/whats-new"
  const isSecurity = pathname === "/security"
  const isWorkflows = pathname.startsWith("/workflows")
  const isSettings = pathname.startsWith("/settings")
  const isRepos = pathname.startsWith("/repos")

  return (
    <header className={containerClass}>
      <nav className="pointer-events-auto px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white text-black shadow-none hover:shadow-lg flex items-center border-0 outline-none ring-0 transition-all duration-300 ease-out">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-1.5 py-1 transition-colors cursor-pointer border-0 outline-none ring-0"
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          <div className="w-6 h-6 overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/Penguin.png"
              alt="Penguin"
              width={100}
              height={100}
              className="object-contain invert"
              priority
            />
          </div>
          <span className="text-sm font-semibold tracking-tight pr-1">Penguin</span>
        </button>

        <div
          className={`grid transition-[grid-template-columns,opacity] duration-500 ease-out ${isOpen ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0 pointer-events-none"
            }`}
          aria-hidden={!isOpen}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center pl-2">
              <div className="flex items-center gap-3 sm:gap-5 text-xs font-medium text-black/75 whitespace-nowrap px-1">
                {!isHome && (
                  <Link href="/" className="hover:text-black cursor-pointer transition-colors">
                    Home
                  </Link>
                )}
                {!isWhatsNew && (
                  <Link href="/whats-new" className="hover:text-black cursor-pointer transition-colors">
                    What&apos;s New
                  </Link>
                )}
                {user && !isSettings && !isRepos && (
                  <Link href="/settings" className="hover:text-black cursor-pointer transition-colors">
                    Repositories
                  </Link>
                )}
                {user && !isWorkflows && (
                  <Link href="/workflows" className="hover:text-black cursor-pointer transition-colors">
                    Workflows
                  </Link>
                )}
                {!isSecurity && (
                  <Link href="/security" className="hover:text-black cursor-pointer transition-colors">
                    Security
                  </Link>
                )}
              </div>

              {isHome &&
                <div className="flex items-center px-3 whitespace-nowrap">
                  <form action="/api/auth/github" method="GET">
                    <button
                      type="submit"
                      aria-label="Connect with GitHub"
                      className="flex items-center gap-1.5 font-medium text-xs"
                    >
                      <span>Connect</span>
                    </button>
                  </form>
                </div>
              }
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
