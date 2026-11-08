import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
      <body className={`${inter.variable} font-skin antialiased select-none bg-amber-100/50 text-black`}>
        <header className="fixed top-0 left-0 right-0 p-5 z-10">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-4xl tracking-tight">Penguin</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  )
}