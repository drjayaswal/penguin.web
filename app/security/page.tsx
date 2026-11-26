import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { SiteFooter } from '@/components/site-footer'

export default async function SecurityPage() {
  const user = await requireUser(cookies().toString())
  return (
    <main>
      <Navbar user={user} />
      <div className="mx-auto grid w-security grid-cols-1 gap-8.75 pb-15 pt-31.25 md:grid-cols-security md:gap-18.75 md:pt-36.25">
        <aside>
          <h1 className="mb-8.75 mt-3 text-52 font-normal tracking-word md:text-65">Security</h1>
          <nav aria-label="Security topics" className="flex flex-wrap gap-3 text-sm leading-normal text-muted md:grid md:text-base">
            <a href="#access">Repository access</a><a href="#credentials">Credentials</a><a href="#sessions">Your session</a>
          </nav>
        </aside>
        <article>
          <section id="access" className="mb-13.75 scroll-mt-30">
            <h2 className="mb-5.5 text-30 font-normal tracking-title md:text-38">Keeping your work secure</h2>
            <p className="my-4.5 text-lg leading-security text-muted">Your repositories belong to you. Penguin connects through a GitHub App, with access limited to the organizations and repositories you choose.</p>
            <h3 className="mt-7.5 text-xl leading-normal">You choose what to connect</h3>
            <p className="my-4.5 text-lg leading-security text-muted">Review repository permissions when installing the app. You can update or revoke its access from your GitHub settings whenever you need to.</p>
          </section>
          <section id="credentials" className="mb-13.75 scroll-mt-30">
            <h2 className="mb-5.5 text-30 font-normal tracking-title md:text-38">Protecting credentials</h2>
            <p className="my-4.5 text-lg leading-security text-muted">Penguin encrypts stored credentials used to connect to your services. Your provider settings let you manage the credentials used for commit summaries.</p>
          </section>
          <section id="sessions" className="mb-13.75 scroll-mt-30">
            <h2 className="mb-5.5 text-30 font-normal tracking-title md:text-38">Your session, your workspace</h2>
            <p className="my-4.5 text-lg leading-security text-muted">Authenticated requests check your session and repository ownership before returning workspace data. Sign out when you finish using a shared device.</p>
          </section>
        </article>
      </div>
      <SiteFooter />
    </main>
  )
}
