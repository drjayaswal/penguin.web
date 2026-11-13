import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PlanetProvider, PlanetToggle } from '@/components/planet-theme'

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
        <PlanetProvider>
          <header className="fixed top-0 left-0 right-0 p-5 z-20 pointer-events-none">
            <div className="flex items-center justify-end w-full">
              <div className="pointer-events-auto">
                <PlanetToggle />
              </div>
            </div>
          </header>

          {children}
        </PlanetProvider>
      </body>
    </html>
  )
}
