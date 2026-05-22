import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quotatain — Sales Intelligence',
  description: 'Research companies, score product fit, and find the right contacts.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <SessionProvider>
          <QueryProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
