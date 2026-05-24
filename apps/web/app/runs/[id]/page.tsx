'use client'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { CompanyCard } from '@/components/cards/CompanyCard'

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterAttrition, setFilterAttrition] = useState('')
  const [sortBy, setSortBy] = useState<'fitment' | 'name' | 'headcount'>('fitment')

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.runs.get(id),
    refetchInterval: (query) => {
      const status = ((query.state.data as any)?.status ?? '').toUpperCase()
      return status === 'PROCESSING' || status === 'QUEUED' ? 3000 : false
    },
  })

  // SSE for live progress during active runs
  useEffect(() => {
    const status = (run?.status ?? '').toUpperCase()
    if (!run || (status !== 'PROCESSING' && status !== 'QUEUED')) return
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/runs/${id}/progress`, { withCredentials: true })
    es.onmessage = () => qc.invalidateQueries({ queryKey: ['run', id] })
    es.onerror = () => es.close()
    return () => es.close()
  }, [id, run?.status, qc])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
  if (!run) return <div className="p-8 text-gray-500">Run not found</div>

  const companies: any[] = run.companies ?? []
  const completed = companies.filter((c: any) => c.status === 'COMPLETED')
  const pct = run.companyCount > 0 ? Math.round(((run.completedCount + run.failedCount) / run.companyCount) * 100) : 0

  const filtered = completed
    .filter((c: any) => !filterAttrition || c.card?.hiring?.attritionRisk === filterAttrition)
    .sort((a: any, b: any) => {
      if (sortBy === 'fitment') return (b.fitment?.compositeScore ?? 0) - (a.fitment?.compositeScore ?? 0)
      if (sortBy === 'headcount') return (b.card?.scale?.headcount ?? 0) - (a.card?.scale?.headcount ?? 0)
      return (a.card?.identity?.name ?? a.inputName ?? '').localeCompare(b.card?.identity?.name ?? b.inputName ?? '')
    })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{run.name ?? `Run ${id.slice(-6)}`}</h1>
          <p className="text-sm text-gray-500 mt-1">{run.product?.name} · {run.companyCount} companies · {new Date(run.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {run.status === 'COMPLETED' || run.status === 'PARTIAL' ? (
          <a
            href={api.runs.exportUrl(id, 'csv')}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </a>
        ) : null}
      </div>

      {/* Progress bar */}
      {(run.status === 'QUEUED' || run.status === 'PROCESSING') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={18} className="animate-spin text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Researching companies…</span>
            <span className="ml-auto text-sm text-gray-500">{run.completedCount + run.failedCount} / {run.companyCount}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs text-center">
            {companies.map((c: any) => (
              <div key={c.id} className={`px-2 py-1 rounded text-xs truncate ${c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : c.status === 'FAILED' ? 'bg-red-50 text-red-700' : c.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                {c.card?.identity?.name ?? c.inputName ?? c.domain ?? 'Unknown'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {completed.length > 0 && (
        <>
          {/* Filters + sort */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600 font-medium">{filtered.length} results</span>
            <select value={filterAttrition} onChange={e => setFilterAttrition(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All attrition risks</option>
              <option value="High">High risk</option>
              <option value="Medium">Medium risk</option>
              <option value="Low">Low risk</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="fitment">Sort: Fitment Score</option>
              <option value="headcount">Sort: Headcount</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>

          <div className="space-y-3">
            {filtered.map((company: any) => (
              <div key={company.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpanded(expanded === company.id ? null : company.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  {company.card?.identity?.logoUrl ? (
                    <img src={company.card.identity.logoUrl} alt="" className="w-8 h-8 rounded object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {(company.card?.identity?.name ?? company.inputName ?? '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{company.card?.identity?.name ?? company.inputName}</div>
                    <div className="text-xs text-gray-500">{company.card?.identity?.industry} · {company.card?.scale?.headcount?.toLocaleString() ?? '—'} employees · {company.card?.funding?.stage}</div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {company.fitment && (
                      <div className="text-center">
                        <div className={`text-xl font-bold ${company.fitment.compositeScore >= 70 ? 'text-green-600' : company.fitment.compositeScore >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {company.fitment.compositeScore}
                        </div>
                        <div className="text-xs text-gray-500">Fit</div>
                      </div>
                    )}
                    {company.card?.hiring?.attritionRisk && company.card.hiring.attritionRisk !== 'Unknown' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.card.hiring.attritionRisk === 'High' ? 'bg-red-50 text-red-700' : company.card.hiring.attritionRisk === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        {company.card.hiring.attritionRisk} Attrition
                      </span>
                    )}
                    {company.card?.buyingSignals?.length > 0 && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {company.card.buyingSignals.length} signal{company.card.buyingSignals.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {expanded === company.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>
                {expanded === company.id && <CompanyCard card={company.card} fitment={company.fitment} />}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Failed companies */}
      {companies.filter((c: any) => c.status === 'FAILED').length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-400" />
            {companies.filter((c: any) => c.status === 'FAILED').length} companies could not be researched
          </h3>
          <div className="space-y-1">
            {companies.filter((c: any) => c.status === 'FAILED').map((c: any) => (
              <div key={c.id} className="text-xs text-gray-500 bg-red-50 px-3 py-2 rounded-lg">
                {c.inputName ?? c.domain ?? 'Unknown'} — {c.error ?? 'Research failed'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
