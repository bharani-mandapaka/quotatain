'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  queued: { label: 'Queued', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-600 bg-blue-50', icon: Loader2 },
  completed: { label: 'Done', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  partial: { label: 'Partial', color: 'text-orange-600 bg-orange-50', icon: AlertCircle },
  failed: { label: 'Failed', color: 'text-red-600 bg-red-50', icon: AlertCircle },
}

export default function RunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api.runs.list(),
    refetchInterval: 5000,
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research Runs</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a company list and get intelligence cards</p>
        </div>
        <Link
          href="/runs/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Run
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : data?.runs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Upload size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-500">No research runs yet</p>
          <p className="text-sm mt-1">Start by uploading a list of companies to research</p>
          <Link href="/runs/new" className="mt-4 inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Start your first run
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.runs.map((run: any) => {
            const cfg = statusConfig[run.status] ?? statusConfig.queued!
            const Icon = cfg.icon
            const pct = run.companyCount > 0 ? Math.round(((run.completedCount + run.failedCount) / run.companyCount) * 100) : 0
            return (
              <Link key={run.id} href={`/runs/${run.id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{run.name ?? `Run ${run.id.slice(-6)}`}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <Icon size={12} className={run.status === 'processing' ? 'animate-spin' : ''} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {run.productName} · {run.companyCount} companies · by {run.createdByName}
                    </p>
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(run.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {(run.status === 'processing' || run.status === 'queued') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{run.completedCount} / {run.companyCount} researched</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Upload({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
