import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { cookies } from "next/headers"
import Image from "next/image"
import { Navbar } from "@/components/navbar"

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const cookieStore = cookies()
  const user = await requireUser(cookieStore.toString())
  if (user) redirect("/settings")

  const error = searchParams.error ?? null

  return (
    <main className="relative h-screen w-screen overflow-hidden text-neutral-900 flex flex-col justify-between select-none">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/blue.png')] bg-cover bg-center bg-no-repeat" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-blue-900/10" />
      <Navbar isCentered={true} user={user} />
      {error && (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <p className="pointer-events-auto text-xs text-black bg-white backdrop-blur-md px-3.5 py-1.5 font-medium">
            {errorMessage(error)}
          </p>
        </div>
      )}
    </main>
  )
}

function errorMessage(error: string) {
  switch (error) {
    case "invalid_state":
      return "Invalid security state. Please try signing in again."
    case "missing_params":
      return "GitHub sign-in was cancelled or missing parameters."
    case "token_exchange_failed":
    case "callback_failed":
      return "GitHub sign-in failed. Please try again."
    default:
      return null
  }
}
