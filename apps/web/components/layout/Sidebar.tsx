'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Zap, List, Box, Users, Plug, Settings, BarChart2 } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
  adminOnly?: boolean
}

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { href: '/runs/new', label: 'New Run', icon: Zap, badge: '⌘N' },
      { href: '/runs',     label: 'Runs',    icon: List },
    ] as NavItem[],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/products',  label: 'Products', icon: Box },
      { href: '/dashboard', label: 'Team',     icon: BarChart2 },
    ] as NavItem[],
  },
  {
    label: 'Settings',
    items: [
      { href: '/integrations',  label: 'Integrations', icon: Plug },
      { href: '/settings/users', label: 'Members',      icon: Users, adminOnly: true },
      { href: '/settings',       label: 'Preferences',  icon: Settings },
    ] as NavItem[],
  },
]

function initials(name?: string | null, email?: string | null) {
  if (name) return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (email?.[0] ?? 'U').toUpperCase()
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session as any)?.role === 'ADMIN'
  const userName = session?.user?.name
  const userEmail = session?.user?.email
  const userRole = (session as any)?.role ?? 'AE'

  function isActive(href: string) {
    if (href === '/runs') return pathname === '/runs' || (pathname.startsWith('/runs/') && pathname !== '/runs/new')
    if (href === '/settings') return pathname === '/settings'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className="flex flex-col shrink-0 bg-bg border-r border-line"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-line">
        <div
          className="flex items-center justify-center text-[13px] font-mono font-medium text-white rounded-[7px] relative overflow-hidden shrink-0"
          style={{ width: 26, height: 26, background: 'var(--ink)' }}
        >
          Q
          <span
            className="absolute bottom-0 right-0 rounded-sm"
            style={{ width: 9, height: 9, background: 'var(--accent)', borderRadius: 2 }}
          />
        </div>
        <span className="font-medium text-[14.5px] tracking-tight text-ink">quotatain</span>
        <span className="ml-auto font-mono text-[10.5px] text-ink-3">v1.2</span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mt-2">
            <div className="px-2.5 py-1.5 text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.06em]">
              {section.label}
            </div>
            <div className="space-y-px">
              {section.items
                .filter(item => !item.adminOnly || isAdmin)
                .map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-[6px] rounded-[6px] text-[13.5px] transition-colors ${
                        active
                          ? 'bg-surface text-ink font-medium shadow-[inset_0_0_0_1px_var(--line)]'
                          : 'text-ink-2 hover:bg-hover hover:text-ink'
                      }`}
                    >
                      <item.icon
                        size={15}
                        className={active ? 'text-accent' : 'text-ink-3'}
                        strokeWidth={1.5}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="font-mono text-[10px] text-ink-3 bg-surface-2 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-line">
        <div
          className="flex items-center justify-center text-[11px] font-medium text-white rounded-full shrink-0"
          style={{ width: 26, height: 26, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))' }}
        >
          {initials(userName, userEmail)}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[13px] text-ink truncate">{userName ?? userEmail ?? 'User'}</div>
          <div className="text-[11px] text-ink-3 font-mono">{userRole.toLowerCase()} · quotatain</div>
        </div>
        <button className="text-ink-4 hover:text-ink-2 text-[12px] leading-none">···</button>
      </div>
    </aside>
  )
}
