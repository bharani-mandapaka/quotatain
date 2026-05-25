'use client'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'

type Crumb = { label: string }

function getCrumbs(pathname: string): Crumb[] {
  if (pathname === '/' || pathname === '/runs') return [{ label: 'Workspace' }, { label: 'Runs' }]
  if (pathname === '/runs/new') return [{ label: 'Workspace' }, { label: 'New Run' }]
  if (pathname.startsWith('/runs/')) return [{ label: 'Workspace' }, { label: 'Runs' }, { label: 'Run Detail' }]
  if (pathname === '/dashboard') return [{ label: 'Intelligence' }, { label: 'Team' }]
  if (pathname === '/products') return [{ label: 'Intelligence' }, { label: 'Products' }]
  if (pathname === '/integrations') return [{ label: 'Settings' }, { label: 'Integrations' }]
  if (pathname === '/settings/users') return [{ label: 'Settings' }, { label: 'Members' }]
  if (pathname === '/settings') return [{ label: 'Settings' }, { label: 'Preferences' }]
  return [{ label: 'Quotatain' }]
}

export function Topbar() {
  const pathname = usePathname()
  const crumbs = getCrumbs(pathname)

  return (
    <header
      className="flex items-center gap-4 px-7 border-b border-line bg-bg sticky top-0 z-10"
      style={{ height: 'var(--topbar-h)' }}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-ink-2 flex-1 min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-ink-4">/</span>}
            <span className={i === crumbs.length - 1 ? 'text-ink font-medium' : ''}>
              {c.label}
            </span>
          </span>
        ))}
      </div>

      {/* Search */}
      <button className="flex items-center gap-2 text-[13px] text-ink-3 hover:text-ink transition-colors">
        <Search size={14} />
        <span>Search</span>
        <kbd className="font-mono text-[10.5px] text-ink-3 px-1.5 py-0.5 border border-line rounded bg-surface">⌘K</kbd>
      </button>
    </header>
  )
}
