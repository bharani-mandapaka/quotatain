'use client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, TrendingUp, Zap, Building2, ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { ScorePill } from '@/components/ui/ScorePill'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_BADGE: Record<string, string> = {
  queued:     'bg-surface-2 text-ink-2',
  processing: 'bg-accent-soft text-accent',
  completed:  'bg-positive-soft text-positive',
  partial:    'bg-warning-soft text-warning',
  failed:     'bg-negative-soft text-negative',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const name = session?.user?.name?.split(' ')[0] ?? 'there'

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.workspace.dashboard,
    refetchInterval: 30000,
  })

  const { data: runsData } = useQuery({
    queryKey: ['runs'],
    queryFn: api.runs.list,
    refetchInterval: 10000,
  })

  const runs: any[] = runsData?.runs ?? []
  const recentRuns = runs.slice(0, 8)
  const completed = runs.filter(r => r.status === 'completed').length
  const processing = runs.filter(r => r.status === 'processing' || r.status === 'queued').length
  const scores = runs.map(r => r.avgFitment).filter(Boolean)
  const avgFit = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null
  const totalCompanies = runs.reduce((s: number, r: any) => s + (r.companyCount ?? 0), 0)

  const repStats: Record<string, { name: string; email: string; runs: number; avgFit: number | null }> = {}
  runs.forEach((r: any) => {
    if (!r.createdBy) return
    const key = r.createdBy.id ?? r.createdBy
    if (!repStats[key]) repStats[key] = { name: r.createdByName ?? 'Unknown', email: r.createdByEmail ?? '', runs: 0, avgFit: null }
    repStats[key]!.runs++
  })

  return (
    <div className="p-8" style={{ maxWidth: 1040 }}>
      {/* Page head */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Workspace</div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Good morning, {name}</h1>
          <div className="text-[13px] text-ink-2 mt-1">Here's what's happening across the workspace</div>
        </div>
        <Link
          href="/runs/new"
          className="flex items-center gap-2 bg-accent text-white px-3.5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 transition-colors"
        >
          <Plus size={14} />
          New Run
        </Link>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total runs', value: runs.length, mono: true },
          { label: 'Completed', value: completed, mono: true },
          { label: 'In progress', value: processing, mono: true },
          { label: 'Companies researched', value: totalCompanies.toLocaleString('en-IN'), mono: true },
        ].map(m => (
          <div key={m.label} className="bg-surface border border-line rounded-[8px] px-4 py-3">
            <div className="font-mono text-[22px] font-medium text-ink leading-none">{m.value}</div>
            <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        {/* Recent runs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[12px] font-medium text-ink-3 uppercase tracking-[0.06em]">Recent runs</div>
            <Link href="/runs" className="text-[12.5px] text-ink-3 hover:text-accent flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-surface border border-line rounded-[8px] overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={20} className="animate-spin text-ink-4" />
              </div>
            ) : recentRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-ink-4">
                <TrendingUp size={28} className="mb-3 opacity-30" />
                <p className="text-[13px] font-medium text-ink-3">No runs yet</p>
                <p className="text-[12px] text-ink-4 mt-1 mb-4">Start by uploading a company list</p>
                <Link
                  href="/runs/new"
                  className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-[6px] text-[12.5px] font-medium hover:bg-accent-2 transition-colors"
                >
                  <Plus size={13} /> New run
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-bg">
                    {['Run', 'Product', 'Companies', 'Avg fit', 'Status'].map(h => (
                      <th key={h} className="text-left text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentRuns.map((run: any) => {
                    const badge = STATUS_BADGE[run.status] ?? STATUS_BADGE.queued!
                    return (
                      <tr
                        key={run.id}
                        className="hover:bg-hover transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/runs/${run.id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-medium text-ink leading-tight">{run.name ?? `Run #${run.id.slice(-6)}`}</div>
                          <div className="font-mono text-[11px] text-ink-4 mt-0.5">{timeAgo(run.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-ink-2">{run.product?.name ?? '-'}</td>
                        <td className="px-4 py-3 font-mono text-[12.5px] text-ink">{run.companyCount ?? 0}</td>
                        <td className="px-4 py-3">
                          {run.avgFitment
                            ? <ScorePill score={Math.round(run.avgFitment)} size="sm" />
                            : <span className="text-ink-4 text-[12.5px]">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11.5px] font-medium px-2 py-0.5 rounded capitalize ${badge}`}>
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Avg fitment card */}
          <div className="bg-surface border border-line rounded-[8px] p-4">
            <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.06em] mb-3">Workspace avg fitment</div>
            {avgFit ? (
              <div className="flex items-center gap-3">
                <div className="font-mono text-[36px] font-medium text-ink leading-none">{avgFit}</div>
                <div className="text-[12px] text-ink-3 leading-snug">
                  across<br />
                  <span className="font-medium text-ink">{completed} runs</span>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-ink-4">No completed runs yet</div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-surface border border-line rounded-[8px] p-4">
            <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.06em] mb-3">Quick actions</div>
            <div className="space-y-1.5">
              {[
                { href: '/runs/new', icon: Zap, label: 'Start a research run' },
                { href: '/products', icon: Building2, label: 'Manage products' },
              ].map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] hover:bg-hover transition-colors text-[13px] text-ink-2 hover:text-ink"
                >
                  <Icon size={14} className="text-ink-3 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Signal summary */}
          {dash?.signals && dash.signals.length > 0 && (
            <div className="bg-surface border border-line rounded-[8px] p-4">
              <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.06em] mb-3">Recent signals</div>
              <div className="space-y-2">
                {dash.signals.slice(0, 5).map((sig: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="text-[12.5px] text-ink-2 leading-snug">{sig.text ?? sig}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
