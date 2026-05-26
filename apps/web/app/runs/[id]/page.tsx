'use client'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronUp, Download, Loader2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { ScorePill } from '@/components/ui/ScorePill'
import { FitmentWheel } from '@/components/ui/FitmentWheel'
import { CompanyCard } from '@/components/cards/CompanyCard'
import { fmtCount } from '@/lib/indianFormat'

const TABS = ['Overview', 'Fitment', 'Signals', 'People', 'Raw data'] as const
type Tab = typeof TABS[number]

function StatusDot({ status }: { status: string }) {
  const cls =
    status === 'COMPLETED' ? 'bg-positive' :
    status === 'PROCESSING' ? 'bg-accent dot-active' :
    status === 'FAILED'     ? 'bg-negative' :
                               'bg-ink-4'
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />
}

function CompanyRow({ company, expanded, onToggle }: { company: any; expanded: boolean; onToggle: () => void }) {
  const c = company.card
  const fit = company.fitment?.compositeScore
  const topSignal = company.card?.buyingSignals?.sort((a: any, b: any) => b.weight - a.weight)[0]
  const name = c?.identity?.name ?? company.inputName ?? company.domain ?? '—'
  const industry = c?.identity?.industry ?? '—'
  const headcount = c?.scale?.headcount
  const domain = c?.identity?.domain ?? company.domain ?? '—'

  const dims = c && company.fitment?.breakdown ? Object.entries(company.fitment.breakdown).map(([k, v]: [string, any]) => ({
    label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).slice(0, 7),
    score: v.score,
  })) : undefined

  return (
    <>
      <tr
        className="hover:bg-hover transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <StatusDot status={company.status} />
            <div>
              <div className="text-[13.5px] font-medium text-ink leading-tight">{name}</div>
              <div className="font-mono text-[11px] text-ink-4 mt-0.5">{domain}</div>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 text-[13px] text-ink-2">{industry}</td>
        <td className="px-5 py-3.5 font-mono text-[13px] text-ink">
          {headcount ? fmtCount(headcount) : '—'}
        </td>
        <td className="px-5 py-3.5">
          {fit != null ? <ScorePill score={Math.round(fit)} /> : <span className="text-ink-4 text-[13px]">—</span>}
        </td>
        <td className="px-5 py-3.5">
          {topSignal ? (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${topSignal.weight >= 70 ? 'bg-positive' : topSignal.weight >= 40 ? 'bg-warning' : 'bg-ink-4'}`} />
              <span className="text-[12.5px] text-ink-2 truncate max-w-[200px]">{topSignal.signal}</span>
            </div>
          ) : <span className="text-ink-4">—</span>}
        </td>
        <td className="px-5 py-3.5 text-ink-3">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0 border-b border-line">
            <div className="p-5 bg-surface-2/40">
              {/* Company identity header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-[8px] bg-surface border border-line flex items-center justify-center font-mono text-[18px] font-medium text-ink shrink-0">
                  {name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[16px] font-medium text-ink">{name}</h2>
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-3 mt-0.5">
                    {c?.identity?.industry && <span>{c.identity.industry}</span>}
                    {c?.identity?.hqCity && <><span>·</span><span>{c.identity.hqCity}</span></>}
                    {c?.identity?.foundedYear && <><span>·</span><span>Est. {c.identity.foundedYear}</span></>}
                  </div>
                </div>
                {fit != null && <FitmentWheel score={Math.round(fit)} dims={dims} size={100} />}
              </div>
              {/* Full intelligence card */}
              <CompanyCard card={c} fitment={company.fitment} />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'fitment' | 'name' | 'headcount'>('fitment')
  const [filterAttrition, setFilterAttrition] = useState('')

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.runs.get(id),
    refetchInterval: (query) => {
      const status = ((query.state.data as any)?.status ?? '').toUpperCase()
      return status === 'PROCESSING' || status === 'QUEUED' ? 3000 : false
    },
  })

  useEffect(() => {
    const status = (run?.status ?? '').toUpperCase()
    if (!run || (status !== 'PROCESSING' && status !== 'QUEUED')) return
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/runs/${id}/progress`, { withCredentials: true })
    es.onmessage = () => qc.invalidateQueries({ queryKey: ['run', id] })
    es.onerror = () => es.close()
    return () => es.close()
  }, [id, run?.status, qc])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-ink-4" size={28} /></div>
  if (!run) return <div className="p-8 text-ink-3">Run not found</div>

  const companies: any[] = run.companies ?? []
  const completed = companies.filter((c: any) => c.status === 'COMPLETED')
  const processing = run.status === 'QUEUED' || run.status === 'PROCESSING'
  const pct = run.companyCount > 0 ? Math.round(((run.completedCount + run.failedCount) / run.companyCount) * 100) : 0

  const filtered = completed
    .filter((c: any) => !filterAttrition || c.card?.hiring?.attritionRisk === filterAttrition)
    .sort((a: any, b: any) => {
      if (sortBy === 'fitment')   return (b.fitment?.compositeScore ?? 0) - (a.fitment?.compositeScore ?? 0)
      if (sortBy === 'headcount') return (b.card?.scale?.headcount ?? 0) - (a.card?.scale?.headcount ?? 0)
      return (a.card?.identity?.name ?? a.inputName ?? '').localeCompare(b.card?.identity?.name ?? b.inputName ?? '')
    })

  const avgFit = completed.length > 0
    ? Math.round(completed.reduce((s, c) => s + (c.fitment?.compositeScore ?? 0), 0) / completed.length)
    : null
  const highFit = completed.filter(c => (c.fitment?.compositeScore ?? 0) >= 75).length
  const signals = completed.reduce((s, c) => s + (c.card?.buyingSignals?.length ?? 0), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">
            Workspace · Runs
          </div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">{run.name ?? `Run ${id.slice(-6)}`}</h1>
          <div className="text-[13px] text-ink-2 mt-1">
            {run.product?.name} · {run.companyCount} companies · {new Date(run.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        {(run.status === 'COMPLETED' || run.status === 'PARTIAL') && (
          <a
            href={api.runs.exportUrl(id, 'csv')}
            className="flex items-center gap-2 border border-line-2 bg-surface text-ink-2 px-3.5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-hover transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>
        )}
      </div>

      {/* Processing view */}
      {processing && (
        <div className="bg-surface border border-line rounded-[8px] p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-accent dot-active" />
            <span className="text-[13.5px] font-medium text-ink">Researching companies…</span>
            <span className="ml-auto font-mono text-[12px] text-ink-3">
              {run.completedCount + run.failedCount} / {run.companyCount} · {pct}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: 'var(--accent)' }}
            />
          </div>
          {/* Company status list */}
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto">
            {companies.map((c: any) => {
              const name = c.card?.identity?.name ?? c.inputName ?? c.domain ?? '—'
              const statusCls =
                c.status === 'COMPLETED' ? 'bg-positive' :
                c.status === 'PROCESSING' ? 'bg-accent dot-active' :
                c.status === 'FAILED'     ? 'bg-negative' : 'bg-ink-4'
              return (
                <div key={c.id} className="flex items-center gap-2.5 px-3 py-2 bg-surface-2 rounded-[6px]">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCls}`} />
                  <span className="text-[12.5px] text-ink-2 truncate">{name}</span>
                  {c.fitment?.compositeScore && c.status === 'COMPLETED' && (
                    <ScorePill score={Math.round(c.fitment.compositeScore)} size="sm" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Results metrics */}
      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Avg fitment',   value: avgFit ? `${avgFit}` : '—' },
            { label: 'High-fit ≥75',  value: highFit },
            { label: 'Signals found', value: signals },
          ].map(m => (
            <div key={m.label} className="bg-surface border border-line rounded-[8px] px-4 py-3">
              <div className="font-mono text-[22px] font-medium text-ink leading-none">{m.value}</div>
              <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter strip */}
      {completed.length > 0 && (
        <div className="bg-surface border border-line rounded-t-[8px] px-5 py-3 flex items-center gap-3 border-b-0">
          <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-[7px]">
            {[['', 'All'], ['Low', 'Low risk'], ['Medium', 'Medium risk'], ['High', 'High risk']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setFilterAttrition(val)}
                className={`px-3 py-1.5 rounded-[5px] text-[12.5px] font-medium transition-colors ${filterAttrition === val ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]' : 'text-ink-2 hover:text-ink'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="ml-auto font-mono text-[12px] text-ink-3">{filtered.length} companies</div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="border border-line-2 bg-surface rounded-[6px] px-2.5 py-1.5 text-[12.5px] text-ink-2 focus:outline-none appearance-none pr-7"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238E8881' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            <option value="fitment">Sort: Fitment</option>
            <option value="name">Sort: Name</option>
            <option value="headcount">Sort: Headcount</option>
          </select>
        </div>
      )}

      {/* Results table */}
      {completed.length > 0 && (
        <div className="bg-surface border border-line rounded-b-[8px] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-line bg-bg">
                {['Company', 'Industry', 'Headcount', 'Fitment', 'Top signal', ''].map(h => (
                  <th key={h} className="text-left text-[11.5px] font-medium text-ink-3 uppercase tracking-[0.05em] px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((company: any) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  expanded={expanded === company.id}
                  onToggle={() => setExpanded(expanded === company.id ? null : company.id)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-ink-3">
              <div className="text-[14px] font-medium text-ink-2 mb-1">No companies match this filter</div>
              <button onClick={() => setFilterAttrition('')} className="text-[13px] text-accent hover:text-accent-2">Clear filters</button>
            </div>
          )}
        </div>
      )}

      {!processing && completed.length === 0 && run.failedCount > 0 && (
        <div className="bg-negative-soft border border-negative-soft rounded-[8px] p-5 flex items-center gap-3">
          <span className="text-[13.5px] text-negative font-medium">All companies failed to resolve. Check inputs and retry.</span>
        </div>
      )}
    </div>
  )
}
