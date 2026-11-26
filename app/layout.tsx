import type { Metadata } from 'next'
import './globals.css'

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
    <html className="scroll-smooth motion-reduce:scroll-auto" lang="en" suppressHydrationWarning>
      <body className="m-0 min-h-screen bg-bg text-black antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
