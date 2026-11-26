'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export function Navbar({ user = null }: { isCentered?: boolean; user?: any }) {
  const pathname = usePathname()
  const links = [
    { href: '/whats-new', label: "What's New" },
    { href: '/repos', label: 'Repos' },
    { href: '/security', label: 'Security' },
  ]

  return (
    <header className="pointer-events-none fixed inset-x-0 top-7 z-50 px-3 md:px-5">
      <nav className="pointer-events-auto relative mx-auto flex min-h-13 w-max max-w-full items-center gap-4 rounded-nav bg-neutral-50 px-4 py-3.5 shadow-nav md:gap-5.75 md:px-5 md:py-3.25" aria-label="Main navigation">
        <Link href={user ? '/settings' : '/'} className="inline-flex items-center" aria-label="Penguin home">
          <Image src="/Penguin.png" alt="" width={25} height={25} className="h-6.25 w-6.25 object-contain invert" priority />
        </Link>
        <div className="flex flex-1 items-center justify-center gap-3.25 md:gap-4.75">
          {links.map(link => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}
              className={`font-rounded text-sm font-medium not-italic tracking-tight hover:text-nav-active md:text-base ${pathname === link.href ? 'text-nav-active' : 'text-black/50'}`}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}
