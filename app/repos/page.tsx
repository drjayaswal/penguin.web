import { GithubLogo } from '@/components/github-logo'
import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'
import { GitBranch, GitCommitHorizontal, Workflow } from 'lucide-react'
import Link from 'next/link'

const features = [
  { title: 'Repositories', text: 'Connect the GitHub repositories you work with and explore them from one workspace.', Icon: GitBranch, href: '/settings', color: 'bg-repo-gold' },
  { title: 'Commit history', text: 'Follow recent changes, inspect file details, and understand the context of each commit.', Icon: GitCommitHorizontal, href: '/settings', color: 'bg-repo-green' },
  { title: 'Visual workflows', text: 'Map your process on an interactive canvas. Add, connect, and arrange your workflow nodes.', Icon: Workflow, href: '/workflows', color: 'bg-repo-gray' },
]

export default async function ReposPage() {
  const user = await requireUser(cookies().toString())
  return (
    <main>
      <Navbar user={user} />
      <div className="h-31.25" />
      <section className="px-5 pb-16.25 text-center">
        <h1 className="mx-auto mb-10 font-editorial text-repos-heading font-normal tracking-repos">All your repos,<br />working together.</h1>
        <p className="mx-auto mb-10 max-w-screen-sm text-lg leading-intro text-repo-copy md:text-23 md:leading-intro">Penguin brings your repositories, commits, and workflows into one place, so you can keep up with every change.</p>
        <a href={user ? '/settings' : '/api/auth/github'} className="inline-flex min-h-13 items-center justify-center gap-2.75 rounded-action bg-action px-6.25 text-15 font-mediumplus tracking-action text-white shadow-action hover:-translate-y-px hover:bg-action-hover hover:shadow-action-hover active:translate-y-0">
          {!user && <GithubLogo />}{user ? 'Open your repositories' : 'Connect GitHub'}
        </a>
      </section>
      <section className="mx-auto w-repos">
        <h2 className="mb-7.5 font-editorial text-34 font-semibold leading-normalfont">Inside your workspace</h2>
        <div className="grid grid-cols-1 gap-6.25 md:grid-cols-3">
          {features.map(({ title, text, Icon, href, color }) => (
            <Link key={title} href={user ? href : '/api/auth/github'} className="group">
              <div className={`flex h-repo-art flex-col items-center justify-center gap-6.25 rounded-art transition-transform duration-300 ease-in-out group-hover:-translate-y-1 ${color}`}>
                <Icon size={64} strokeWidth={1} />
              </div>
              <h3 className="mb-2 mt-5 text-22">{title}</h3>
              <p className="leading-copy text-repo-detail">{text}</p>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
