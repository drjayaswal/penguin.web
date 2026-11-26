import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'
import { GitBranch, Workflow, FileText } from 'lucide-react'

const releases = [
  { date: 'November 2026', title: 'A clearer view of your workflows', Icon: Workflow, text: 'Build and explore interactive flow graphs for your branches and pipelines. Drag, connect, and inspect node details directly on the canvas.' },
  { date: 'November 2026', title: 'The context behind every commit', Icon: FileText, text: 'Connect your preferred AI provider to generate concise change summaries, identify risks, and follow the work without switching tools.' },
  { date: 'October 2026', title: 'Your repositories, together', Icon: GitBranch, text: 'Choose which organizations and repositories Penguin can access through the GitHub App, then sync their latest commits into your workspace.' },
]
export default async function WhatsNewPage() {
  const user = await requireUser(cookies().toString())
  return (
    <main>
      <Navbar user={user} />
      <header className="px-6 pb-16.25 pt-32.5 text-center md:pt-25">
        <h1 className="my-6 font-editorial text-updates-heading font-medium tracking-word">What’s new<br />in Penguin.</h1>
        <p className="text-19 text-muted">The latest improvements to your repositories and workflows.</p>
      </header>
      <div className="mx-auto mb-17.5 w-updates">
        {releases.map(({ date, title, Icon, text }) => (
          <article key={title} className="grid grid-cols-1 gap-4 py-9.5 md:grid-cols-update md:gap-10">
            <div className="flex items-center gap-3 self-start pt-1.75 text-sm leading-normal text-muted-light">
              <Icon size={22} strokeWidth={1.5} /><span>{date}</span>
            </div>
            <div>
              <h2 className="mb-3.75 text-28 font-medium tracking-subtitle">{title}</h2>
              <p className="text-17 leading-editorial text-muted">{text}</p>
            </div>
          </article>
        ))}
      </div>
      <SiteFooter />
    </main>
  )
}
