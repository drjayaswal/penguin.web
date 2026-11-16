import { cookies } from "next/headers"
import { requireUser } from "@/lib/auth"
import { Navbar } from "@/components/navbar"

export default async function SecurityPage() {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden text-neutral-900 select-none pb-20">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/blue.png')] bg-cover bg-center bg-no-repeat" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-blue-900/10" />

      <Navbar isCentered={false} user={user} />

      <section className="relative z-10 max-w-3xl mx-auto pt-24 sm:pt-28 px-4 sm:px-6">
        <div className="bg-white/95 p-6 sm:p-10 shadow-2xl">
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-3 py-1 ">
            Security &amp; Trust
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif text-neutral-900 mt-4 tracking-tight">
            Built for security and compliance
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base mt-2">
            How Penguin protects your code, personal access tokens, and repository data.
          </p>

          <div className="mt-8 space-y-6">
            <div className="border-t border-neutral-100 pt-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Official GitHub App Architecture
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Penguin communicates using granular GitHub App permissions. You pick exactly which organizations and repositories are accessible, and you can revoke access anytime with one click in GitHub.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Encrypted Credentials &amp; Zero Code Storage
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Tokens and secrets are encrypted in transit and at rest. Penguin never stores your private repository source files or clones them onto third-party servers.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <h2 className="text-lg font-semibold text-neutral-900">
                Audited Sessions &amp; Isolated Workflows
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Sessions use strict HTTP-only, SameSite cookies with short-lived tokens. Every API call is verified against authenticated session state and user ownership.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
