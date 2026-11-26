import Image from 'next/image'
import Link from 'next/link'
import { GithubLogo } from './github-logo'

const columns = [
  { title: 'Product', links: [{ href: '/repos', label: 'Repositories' }, { href: '/workflows', label: 'Workflows' }, { href: '/whats-new', label: "What's new" }] },
  { title: 'Resources', links: [{ href: '/security', label: 'Security' }, { href: '/security#access', label: 'Repository access' }, { href: '/security#credentials', label: 'Credentials' }] },
  { title: 'Workspace', links: [{ href: '/settings', label: 'Open Penguin' }, { href: '/api/auth/github', label: 'Connect GitHub' }] },
]

export function SiteFooter({ home = false }: { home?: boolean }) {
  return (
    <footer className={`overflow-hidden bg-paper pt-25 ${home ? 'relative' : ''}`}>
      <h2 className="mx-5 mb-16.25 text-center font-editorial text-footer-heading font-normal tracking-title md:mb-25">Ready for a better workday?</h2>
      <div className="relative px-5 pb-25 pt-10.5 text-center">
        <div aria-hidden="true" className="absolute left-curve top-0 z-0 h-curve w-curve rounded-t-curve bg-paper shadow-curve" />
        <a href="/api/auth/github" className="relative inline-flex min-h-13 min-w-connect items-center justify-center gap-2.75 rounded-action bg-action px-6.25 text-base font-mediumplus tracking-action text-white shadow-action hover:-translate-y-px hover:bg-action-hover hover:shadow-action-hover active:translate-y-0">
          <GithubLogo /> Connect with GitHub
        </a>
        <p className="relative mt-4.5 text-sm text-footer-note">Your repositories. Your workspace.</p>
      </div>
      <div className="relative mx-auto flex w-footer flex-wrap justify-between gap-7.5 pb-15 pt-8.75 md:flex-nowrap md:gap-10">
        {columns.map(column => (
          <div key={column.title} className="min-w-footer-column md:min-w-0">
            <h3 className="mb-3.25 text-sm font-semibold leading-editorial">{column.title}</h3>
            {column.links.map(link => <Link key={link.href} href={link.href} className="my-2.5 block text-sm font-normal leading-editorial text-footer-link hover:text-black">{link.label}</Link>)}
          </div>
        ))}
      </div>
      <div className="relative mx-auto flex w-footer flex-wrap items-center justify-between gap-2.5 pb-7.5 pt-5 text-sm leading-editorial md:flex-nowrap md:gap-10">
        <span>Copyright © 2026 Penguin</span>
        <Link href="/" className="ml-auto inline-flex items-center gap-2.25 self-center text-lg font-medium leading-normalfont md:text-xl">
          <Image src="/Penguin.png" alt="" width={30} height={30} className="object-contain invert" />
          <span className="text-ink">Penguin</span>
        </Link>
      </div>
    </footer>
  )
}
