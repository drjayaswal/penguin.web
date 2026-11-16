import { cookies } from "next/headers"
import { requireUser } from "@/lib/auth"
import { Navbar } from "@/components/navbar"

export default async function WhatsNewPage() {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())

  return (
    <main className="relative min-h-screen w-screen overflow-x-hidden text-neutral-900 select-none pb-20">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/blue.png')] bg-cover bg-center bg-no-repeat" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-blue-900/10" />

      <Navbar isCentered={false} user={user} />

      <section className="relative z-10 max-w-3xl mx-auto pt-24 sm:pt-28 px-4 sm:px-6">
        <div className="bg-white/95 p-6 sm:p-10 shadow-2xl">
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 bg-blue-50 px-3 py-1 ">
            Updates &amp; Releases
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif text-neutral-900 mt-4 tracking-tight">
            What&apos;s New in Penguin
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base mt-2">
            The latest features, improvements, and releases for your repositories and workflows.
          </p>

          <div className="mt-8 space-y-6">
            <div className="border-t border-neutral-100 pt-5">
              <span className="text-xs text-neutral-400 font-medium">November 2026</span>
              <h2 className="text-lg font-semibold text-neutral-900 mt-1">
                Visual Workflow Canvas &amp; Dynamic Flow Nodes
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Build and explore interactive flow graphs for all your branches and automated pipelines. Drag, connect, and inspect node details right from your browser.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <span className="text-xs text-neutral-400 font-medium">November 2026</span>
              <h2 className="text-lg font-semibold text-neutral-900 mt-1">
                AI-Powered Commit Summaries
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Connect your preferred AI provider to generate concise change summaries, identify risks, and track work context without switching tools.
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <span className="text-xs text-neutral-400 font-medium">October 2026</span>
              <h2 className="text-lg font-semibold text-neutral-900 mt-1">
                Multi-Repository GitHub App Sync
              </h2>
              <p className="text-neutral-600 text-sm mt-1 leading-relaxed">
                Securely grant access to individual organizations and repositories with fine-grained tokens and instant commit synchronization.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
