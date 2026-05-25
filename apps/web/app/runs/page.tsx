'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Clock, CheckCircle, AlertCircle, Loader2, ChevronRight, Upload } from 'lucide-react'
import { api } from '@/lib/api'
import { ScorePill } from '@/components/ui/ScorePill'

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  queued:     { label: 'Queued',     dot: 'bg-ink-4',    badge: 'bg-surface-2 text-ink-2' },
  processing: { label: 'Processing', dot: 'bg-accent dot-active', badge: 'bg-accent-soft text-accent' },
  completed:  { label: 'Done',       dot: 'bg-positive', badge: 'bg-positive-soft text-positive' },
  partial:    { label: 'Partial',    dot: 'bg-warning',  badge: 'bg-warning-soft text-warning' },
  failed:     { label: 'Failed',     dot: 'bg-negative', badge: 'bg-negative-soft text-negative' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function RunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.runs.list(),
    refetchInterval: 5000,
  })

  const runs: any[] = data?.runs ?? []
  const completed = runs.filter(r => r.status === 'completed').length
  const avgFit = (() => {
    const scores = runs.map(r => r.avgFitment).filter(Boolean)
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  })()

  return (
    <div className="p-8">
      {/* Page head */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Workspace</div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Runs</h1>
          <div className="text-[13px] text-ink-2 mt-1">{runs.length} research runs across the workspace</div>
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
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total runs', value: runs.length },
            { label: 'Completed', value: completed },
            { label: 'Avg fitment', value: avgFit ? `${avgFit}` : '—' },
          ].map(m => (
            <div key={m.label} className="bg-surface border border-line rounded-lg px-4 py-3">
              <div className="font-mono text-[22px] font-medium text-ink leading-none">{m.value}</div>
              <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-ink-4" />
        </div>
      ) : runs.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl flex flex-col items-center justify-center py-20 text-ink-3">
          <div className="w-14 h-14 bg-accent-soft rounded-xl flex items-center justify-center mb-4">
            <Upload size={24} className="text-accent" />
          </div>
          <div className="text-[15px] font-medium text-ink-2 mb-1">No runs yet</div>
          <div className="text-[13px] mb-5">Drop a list of companies and the agent will research them in minutes.</div>
          <Link
            href="/runs/new"
            className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={14} /> Start your first run
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-line bg-bg">
                {['Run', 'Product', 'Depth', 'Companies', 'Avg Fit', 'Started', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[11.5px] font-medium text-ink-3 uppercase tracking-[0.05em] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {runs.map((run: any) => {
                const cfg = STATUS_CFG[run.status] ?? STATUS_CFG.queued!
                const pct = run.companyCount > 0
                  ? Math.round(((run.completedCount + run.failedCount) / run.companyCount) * 100)
                  : 0
                return (
                  <tr key={run.id} className="hover:bg-hover transition-colors cursor-pointer" onClick={() => window.location.href = `/runs/${run.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-ink text-[13.5px] leading-tight">{run.name ?? `Run #${run.id.slice(-6)}`}</div>
                      <div className="font-mono text-[11px] text-ink-4 mt-0.5">{run.id.slice(-8)}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink-2">{run.product?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11.5px] font-medium px-2 py-0.5 rounded bg-surface-2 text-ink-2 capitalize">{run.depth ?? 'standard'}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-ink">
                      {run.status === 'processing' || run.status === 'queued'
                        ? `${run.completedCount + run.failedCount}/${run.companyCount}`
                        : run.companyCount}
                    </td>
                    <td className="px-5 py-3.5">
                      {run.avgFitment ? <ScorePill score={Math.round(run.avgFitment)} size="sm" /> : <span className="text-ink-4 text-[13px]">—</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ink-3">{timeAgo(run.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      {run.status === 'processing' || run.status === 'queued' ? (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`text-[11.5px] font-medium px-2 py-0.5 rounded ${cfg.badge}`}>
                            {cfg.label} {pct > 0 ? `${pct}%` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`text-[11.5px] font-medium px-2 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-4">
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
