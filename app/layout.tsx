import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Penguin',
  description: 'GitHub App sign-in and repository access grant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-skin antialiased select-none text-black min-h-screen relative isolate`}>
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-cover bg-top bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/penguins/Mars.webp')" }}
        />

        <header className="fixed top-0 left-0 right-0 p-5 z-20 pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="hidden min-[1000px]:block font-semibold text-white text-4xl tracking-tight">
              Penguin
            </span>
            <Image
              src="/Penguin.png"
              alt="Penguin"
              width={80}
              height={80}
              className="absolute hidden min-[850px]:block min-[1000px]:hidden invert rotate-180"
              priority
            />
          </div>
        </header>

        {children}
      </body>
    </html>
  )
}