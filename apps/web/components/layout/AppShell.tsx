'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

const PUBLIC_PATHS = ['/login', '/signup']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
