'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, Check } from 'lucide-react'
import { api } from '@/lib/api'

type CompanyRow = { name?: string; domain?: string }

function parseCSV(text: string): CompanyRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const splitLine = (line: string) => {
    const res: string[] = []; let cur = ''; let inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { res.push(cur.trim()); cur = '' }
      else cur += ch
    }
    res.push(cur.trim()); return res
  }
  const headers = splitLine(lines[0]!).map(h => h.toLowerCase().trim())
  const nameIdx  = headers.findIndex(h => ['company','company name','name','account','org'].includes(h))
  const domainIdx = headers.findIndex(h => ['domain','website','url','web','site'].includes(h))
  return lines.slice(1).map(line => {
    const cols = splitLine(line)
    return { name: nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined, domain: domainIdx >= 0 ? cols[domainIdx]?.trim() : undefined }
  }).filter(r => r.name || r.domain)
}

function parsePaste(text: string): CompanyRow[] {
  if (!text.trim()) return []
  return text.trim().split(/[\n,]+/).map((token): CompanyRow | null => {
    const v = token.trim()
    if (!v) return null
    if (v.includes('.')) return { domain: v.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }
    return { name: v }
  }).filter((r): r is CompanyRow => r !== null)
}

const DEPTHS = [
  { val: 'quick',    label: 'Quick',    time: '~10s / co',  desc: 'Large lists, fast signals' },
  { val: 'standard', label: 'Standard', time: '~30s / co',  desc: 'Recommended for outreach' },
  { val: 'deep',     label: 'Deep',     time: '~90s / co',  desc: 'Key target accounts' },
] as const

export default function NewRunPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'upload' | 'paste'>('paste')
  const [runName, setRunName] = useState('')
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [pasteText, setPasteText] = useState('')
  const [fileName, setFileName] = useState('')

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]; if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setCompanies(parseCSV(e.target?.result as string))
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls','.xlsx'] },
    maxFiles: 1,
  })

  const parsedPaste = parsePaste(pasteText)
  const finalCompanies = mode === 'upload' ? companies : parsedPaste
  const toggleProduct = (id: string) =>
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const createRun = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        selectedProducts.map(productId =>
          api.runs.create({ name: runName || undefined, productId, depth, companies: finalCompanies.slice(0, 50) })
        )
      )
      return results
    },
    onSuccess: (results) => {
      if (results.length === 1) router.push(`/runs/${results[0].runId}`)
      else router.push('/runs')
    },
  })

  const canSubmit = finalCompanies.length > 0 && selectedProducts.length > 0

  return (
    <div className="p-8" style={{ maxWidth: 980 }}>
      <div className="mb-6">
        <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Workspace</div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">New Research Run</h1>
        <div className="text-[13px] text-ink-2 mt-1">Upload a company list and get fitment-scored intelligence cards.</div>
      </div>

      <div className="bg-surface border border-line rounded-[8px] p-6 space-y-6">
        {/* Run name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-ink-2">Run name</label>
          <input
            value={runName}
            onChange={e => setRunName(e.target.value)}
            placeholder="e.g. Naukri RMS — IT companies Delhi Q2 2026"
            className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
          />
        </div>

        {/* Product + Depth side by side */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[12px] font-medium text-ink-2">
              Product to score against <span className="text-negative">*</span>
            </label>
            {productsData?.products.length === 0 ? (
              <div className="flex items-center gap-2 text-[13px] text-warning bg-warning-soft border border-warning-soft rounded-[6px] p-3">
                <AlertCircle size={14} />
                No products yet. <a href="/products" className="underline font-medium">Add one first.</a>
              </div>
            ) : (
              <div className="space-y-1.5">
                {productsData?.products.map((p: any) => {
                  const selected = selectedProducts.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] border cursor-pointer transition-all ${
                        selected ? 'border-accent-line bg-accent-soft' : 'border-line hover:border-line-2 bg-surface'
                      }`}
                    >
                      <input type="checkbox" checked={selected} onChange={() => toggleProduct(p.id)} className="sr-only" />
                      <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${selected ? 'bg-accent border-accent' : 'border-line-3'}`}>
                        {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[13px] font-medium text-ink">{p.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-medium text-ink-2">Research depth</label>
            <div className="space-y-1.5">
              {DEPTHS.map(({ val, label, time, desc }) => (
                <button
                  key={val}
                  onClick={() => setDepth(val)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-[6px] border transition-all ${depth === val ? 'border-accent-line bg-accent-soft' : 'border-line hover:border-line-2 bg-surface'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink">{label}</span>
                    <span className="font-mono text-[11px] text-accent">{time}</span>
                  </div>
                  <div className="text-[11.5px] text-ink-3 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mode toggle + input */}
        <div>
          <div className="flex items-center gap-1 mb-3 bg-surface-2 p-0.5 rounded-[7px] w-fit">
            {(['paste', 'upload'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-[5px] text-[12.5px] font-medium transition-colors ${mode === m ? 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)]' : 'text-ink-2 hover:text-ink'}`}
              >
                {m === 'paste' ? 'Paste names' : 'Upload CSV'}
              </button>
            ))}
          </div>

          {mode === 'paste' ? (
            <div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={7}
                placeholder={"One per line or comma-separated:\ninfosys.com, tcs.com\nPando AI\nFreshworks"}
                className="w-full border border-line-2 rounded-[6px] px-3.5 py-3 font-mono text-[12.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all resize-none"
              />
              {parsedPaste.length > 0 && (
                <div className="text-[11.5px] text-ink-3 mt-1.5 font-mono">{parsedPaste.length} companies detected</div>
              )}
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-[8px] p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-line-3'}`}
            >
              <input {...getInputProps()} />
              <Upload size={28} className="mx-auto mb-3 text-ink-4" />
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-accent">
                  <FileText size={14} />
                  {fileName} — {companies.length} companies
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-ink-2">Drop your CSV here, or click to browse</p>
                  <p className="text-[11.5px] text-ink-3 mt-1">Needs a "Company" or "Domain" column · max 50 rows</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stats bar */}
        {finalCompanies.length > 0 && (
          <div className="flex items-center gap-6 px-4 py-3 bg-surface-2 rounded-[6px] font-mono text-[12px]">
            <span className="text-ink"><span className="font-medium">{finalCompanies.length}</span> <span className="text-ink-3">companies</span></span>
            <span className="text-ink-3">·</span>
            <span className="text-ink"><span className="font-medium">{depth === 'quick' ? '~' + Math.ceil(finalCompanies.length * 10 / 60) + 'm' : depth === 'standard' ? '~' + Math.ceil(finalCompanies.length * 30 / 60) + 'm' : '~' + Math.ceil(finalCompanies.length * 90 / 60) + 'm'}</span> <span className="text-ink-3">est.</span></span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => createRun.mutate()}
            disabled={!canSubmit || createRun.isPending}
            className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-[6px] text-[13px] font-medium hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {createRun.isPending
              ? 'Starting…'
              : `Research ${finalCompanies.length > 0 ? finalCompanies.length : ''} ${finalCompanies.length === 1 ? 'company' : 'companies'}${selectedProducts.length > 1 ? ` × ${selectedProducts.length} products` : ''}`}
          </button>
          <a href="/runs" className="text-[13px] text-ink-3 hover:text-ink px-3 py-2.5">Cancel</a>
        </div>
        {createRun.isError && (
          <p className="text-[13px] text-negative">{(createRun.error as Error).message}</p>
        )}
      </div>
    </div>
  )
}
