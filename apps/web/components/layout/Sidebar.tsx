'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BarChart2, Upload, Package, Home, Settings, Users } from 'lucide-react'

const baseNav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/runs', label: 'Research Runs', icon: Upload },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/dashboard', label: 'Team View', icon: BarChart2 },
]

const adminNav = [
  { href: '/settings/users', label: 'Users', icon: Users },
]

const bottomNav = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session as any)?.role === 'ADMIN'

  const nav = isAdmin
    ? [...baseNav, ...adminNav, ...bottomNav]
    : [...baseNav, ...bottomNav]

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-gray-200">
        <span className="text-lg font-bold text-indigo-600">Quotatain</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
