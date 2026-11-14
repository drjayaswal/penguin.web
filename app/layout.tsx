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
          {children}
        </PlanetProvider>
      </body>
    </html>
  )
}
