'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const [addAnother, setAddAnother] = useState(false)

  const createProduct = useMutation({
    mutationFn: () => api.products.create({ name: newName, description: newDesc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      if (addAnother) {
        setNewName('')
        setNewDesc('')
      } else {
        setNewName(''); setNewDesc(''); setShowNew(false)
      }
      setAddAnother(false)
    },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the products you sell to enable fitment scoring</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {showNew && (
        <div className="bg-white border border-indigo-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">New Product</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Naukri RMS — Enterprise" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
            <p className="text-xs text-gray-500 mb-2">Describe what your product does, who it's for, what problems it solves, and what tools it replaces. Claude will extract a structured profile automatically.</p>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={6}
              placeholder="Naukri RMS is an AI-powered recruitment management system for enterprise HR teams. It helps companies manage end-to-end hiring — from job posting to offer rollout. Target customers are companies with 200+ employees, active hiring teams, and currently using Taleo, SAP SuccessFactors, or manual spreadsheet processes. Primary buyers are CHROs and Heads of Talent Acquisition. The product solves: slow time-to-hire, poor candidate experience, disconnected ATS workflows, and high recruitment agency costs."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createProduct.mutate()}
              disabled={!newName || !newDesc || createProduct.isPending}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createProduct.isPending && !addAnother ? 'Extracting profile…' : 'Create Product'}
            </button>
            <button
              onClick={() => { setAddAnother(true); createProduct.mutate() }}
              disabled={!newName || !newDesc || createProduct.isPending}
              className="bg-white border border-indigo-300 text-indigo-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50"
            >
              {createProduct.isPending && addAnother ? 'Extracting…' : 'Save & Add Another'}
            </button>
            <button onClick={() => setShowNew(false)} className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {data?.products.length === 0 && !showNew ? (
        <div className="text-center py-20 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-gray-500">No products yet</p>
          <p className="text-sm mt-1">Add a product to enable fitment scoring on your research runs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.products.map((p: any) => {
            const profile = p.parsedProfile ?? {}
            const isExpanded = expandedId === p.id
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Package size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {profile.targetIndustries?.slice(0, 3).join(', ')}
                      {profile.targetHeadcountMin && ` · ${profile.targetHeadcountMin}–${profile.targetHeadcountMax ?? '∞'} employees`}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Problems Solved</h5>
                      <ul className="space-y-1">{profile.problemsSolved?.map((p: string, i: number) => <li key={i} className="text-gray-700 text-xs">• {p}</li>)}</ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Buyer Personas</h5>
                      <div className="text-xs text-gray-700">{[...profile.primaryBuyerTitles ?? [], ...profile.secondaryBuyerTitles ?? []].join(', ')}</div>
                      <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">Displaces</h5>
                      <div className="text-xs text-gray-700">{profile.displacedCompetitors?.join(', ') || '—'}</div>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => deleteProduct.mutate(p.id)} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700">
                        <Trash2 size={13} />
                        Remove product
                      </button>
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
