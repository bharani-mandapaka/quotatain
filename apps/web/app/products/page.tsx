'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { useSession } from 'next-auth/react'

export default function ProductsPage() {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = (session as any)?.role === 'ADMIN'

  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data } = useQuery({ queryKey: ['products'], queryFn: api.products.list })
  const products: any[] = data?.products ?? []

  const createProduct = useMutation({
    mutationFn: () => api.products.create({ name: newName, description: newDesc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      setNewName(''); setNewDesc(''); setShowNew(false)
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  return (
    <div className="p-8" style={{ maxWidth: 980 }}>
      {/* Page head */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Intelligence</div>
          <h1 className="text-[22px] font-medium tracking-tight text-ink">Product profiles</h1>
          <div className="text-[13px] text-ink-2 mt-1">
            Define what you sell. Each run scores target companies against one product.
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-accent text-white px-3.5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 transition-colors"
          >
            <Plus size={14} />
            New product
          </button>
        )}
      </div>

      {/* Add product form */}
      {showNew && isAdmin && (
        <div className="bg-surface border border-accent-line rounded-[8px] p-6 mb-6">
          <h3 className="text-[15px] font-medium text-ink mb-4">New product</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Product name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Naukri RMS — Enterprise"
                className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-2">Product description</label>
              <p className="text-[11.5px] text-ink-3">
                Describe what it does, who it's for, what problems it solves, what tools it replaces.
                Claude will extract a structured ICP profile automatically.
              </p>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                rows={5}
                placeholder="Naukri RMS is a recruitment management system for Indian enterprises with 200+ employees. It helps HR teams manage hiring end-to-end. Target buyers are CHROs and Heads of TA…"
                className="w-full border border-line-2 rounded-[6px] px-3 py-2.5 font-mono text-[12.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => createProduct.mutate()}
                disabled={!newName || !newDesc || createProduct.isPending}
                className="bg-accent text-white px-5 py-2 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 disabled:opacity-40 transition-colors"
              >
                {createProduct.isPending ? 'Saving…' : 'Save product'}
              </button>
              <button
                onClick={() => { setShowNew(false); setNewName(''); setNewDesc('') }}
                className="text-[13px] text-ink-3 hover:text-ink px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products list */}
      {products.length === 0 && !showNew ? (
        <div className="bg-surface border border-line rounded-[8px] flex flex-col items-center justify-center py-20 text-ink-3">
          <div className="w-14 h-14 bg-accent-soft rounded-xl flex items-center justify-center mb-4">
            <Package size={24} className="text-accent" />
          </div>
          <div className="text-[15px] font-medium text-ink-2 mb-1">No product profiles yet</div>
          <div className="text-[13px] mb-5">Add your first product to enable fitment scoring.</div>
          {isAdmin && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 transition-colors"
            >
              <Plus size={14} /> New product profile
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p: any) => {
            const open = expandedId === p.id
            return (
              <div key={p.id} className="bg-surface border border-line rounded-[8px] overflow-hidden">
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-hover transition-colors"
                  onClick={() => setExpandedId(open ? null : p.id)}
                >
                  <div className="w-9 h-9 bg-surface-2 border border-line rounded-[6px] flex items-center justify-center shrink-0">
                    <Package size={16} className="text-ink-3" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-ink">{p.name}</div>
                    <div className="text-[12.5px] text-ink-3 truncate mt-0.5">{p.description?.slice(0, 90)}{p.description?.length > 90 ? '…' : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p.id)
                        }}
                        className="p-1.5 text-ink-4 hover:text-negative hover:bg-negative-soft rounded-[6px] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {open ? <ChevronUp size={15} className="text-ink-3" /> : <ChevronDown size={15} className="text-ink-3" />}
                  </div>
                </div>

                {open && (
                  <div className="px-5 pb-5 border-t border-line">
                    <div className="pt-4 space-y-3">
                      <div>
                        <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.05em] mb-1.5">Description</div>
                        <p className="text-[13px] text-ink-2 leading-relaxed">{p.description}</p>
                      </div>
                      {p.profile && (
                        <>
                          {p.profile.targetIndustries?.length > 0 && (
                            <div>
                              <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.05em] mb-1.5">Target industries</div>
                              <div className="flex flex-wrap gap-1.5">
                                {p.profile.targetIndustries.map((ind: string) => (
                                  <span key={ind} className="text-[12px] font-medium px-2.5 py-1 bg-accent-soft text-accent rounded-[5px]">{ind}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {p.profile.headcountMin && (
                            <div className="flex gap-6">
                              <div>
                                <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.05em] mb-1">Headcount range</div>
                                <div className="font-mono text-[13px] text-ink">{p.profile.headcountMin?.toLocaleString('en-IN')} – {p.profile.headcountMax?.toLocaleString('en-IN')} employees</div>
                              </div>
                            </div>
                          )}
                          {p.profile.displacedCompetitors?.length > 0 && (
                            <div>
                              <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.05em] mb-1.5">Displaces</div>
                              <div className="flex flex-wrap gap-1.5">
                                {p.profile.displacedCompetitors.map((c: string) => (
                                  <span key={c} className="text-[12px] px-2.5 py-1 bg-surface-2 text-ink-2 rounded-[5px]">{c}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
