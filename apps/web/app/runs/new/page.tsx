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
  const nameIdx = headers.findIndex(h => ['company', 'company name', 'name', 'account', 'org'].includes(h))
  const domainIdx = headers.findIndex(h => ['domain', 'website', 'url', 'web', 'site'].includes(h))

  return lines.slice(1).map(line => {
    const cols = splitLine(line)
    return {
      name: nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined,
      domain: domainIdx >= 0 ? cols[domainIdx]?.trim() : undefined,
    }
  }).filter(r => r.name || r.domain)
}

function parsePasteText(text: string): CompanyRow[] {
  if (!text.trim()) return []
  return text.trim()
    .split(/[\n,]+/)
    .map((token): CompanyRow | null => {
      const v = token.trim()
      if (!v) return null
      if (v.includes('.')) return { domain: v.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }
      return { name: v }
    })
    .filter((r): r is CompanyRow => r !== null)
}

export default function NewRunPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [runName, setRunName] = useState('')
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [fileName, setFileName] = useState('')

  const { data: productsData } = useQuery({ queryKey: ['products'], queryFn: api.products.list })

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCompanies(parseCSV(text))
    }
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  })

  const parsedPaste = parsePasteText(pasteText)
  const finalCompanies = mode === 'upload' ? companies : parsedPaste

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const createRun = useMutation({
    mutationFn: async () => {
      // Create one run per selected product in parallel
      const results = await Promise.all(
        selectedProducts.map(productId =>
          api.runs.create({
            name: runName || undefined,
            productId,
            depth,
            companies: finalCompanies.slice(0, 50),
          })
        )
      )
      return results
    },
    onSuccess: (results) => {
      if (results.length === 1) {
        router.push(`/runs/${results[0].runId}`)
      } else {
        router.push('/runs')
      }
    },
  })

  const canSubmit = finalCompanies.length > 0 && selectedProducts.length > 0

  const submitLabel = () => {
    if (createRun.isPending) return 'Starting…'
    const co = `${finalCompanies.length} ${finalCompanies.length === 1 ? 'company' : 'companies'}`
    const pr = selectedProducts.length > 1 ? ` × ${selectedProducts.length} products` : ''
    return `Research ${co}${pr}`
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New Research Run</h1>
      <p className="text-sm text-gray-500 mb-8">Upload a company list to get intelligence cards and fitment scores.</p>

      {/* Run name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Run name (optional)</label>
        <input
          type="text"
          value={runName}
          onChange={e => setRunName(e.target.value)}
          placeholder="e.g. Naukri — IT Companies Delhi NCR May 2026"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Product selector — multi-select checkboxes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Products to score against <span className="text-red-500">*</span>
          <span className="text-xs text-gray-400 font-normal ml-1">(select one or more)</span>
        </label>
        {productsData?.products.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle size={14} />
            No products configured. <a href="/products" className="underline font-medium">Add a product first.</a>
          </div>
        ) : (
          <div className="space-y-2">
            {productsData?.products.map((p: any) => {
              const selected = selectedProducts.includes(p.id)
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                    selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleProduct(p.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                    selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload / Paste toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Upload file
        </button>
        <button
          onClick={() => setMode('paste')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'paste' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Paste names
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className="mx-auto mb-3 text-gray-400" />
          {fileName ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-indigo-700">
              <FileText size={16} />
              {fileName} — {companies.length} companies detected
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Drop your CSV or Excel file here</p>
              <p className="text-xs text-gray-500 mt-1">Needs a "Company Name" or "Domain" column · max 50 rows</p>
            </>
          )}
        </div>
      ) : (
        <div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={8}
            placeholder={"One per line or comma-separated:\ninfosys.com, tcs.com\nPando AI\nFreshworks"}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          {parsedPaste.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{parsedPaste.length} companies parsed</p>
          )}
        </div>
      )}

      {/* Depth selector */}
      <div className="mt-6 mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Research depth</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            ['quick', 'Quick', '~10s/co', 'Large lists, fast signal'],
            ['standard', 'Standard', '~30s/co', 'Recommended for outreach'],
            ['deep', 'Deep', '~90s/co', 'Key target accounts'],
          ] as const).map(([val, label, time, desc]) => (
            <button
              key={val}
              onClick={() => setDepth(val)}
              className={`p-3 rounded-xl border text-left transition-all ${depth === val ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-medium text-sm text-gray-900">{label}</div>
              <div className="text-xs text-indigo-600 font-medium">{time}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => createRun.mutate()}
        disabled={!canSubmit || createRun.isPending}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitLabel()}
      </button>

      {createRun.isError && (
        <p className="mt-3 text-sm text-red-600 text-center">{(createRun.error as Error).message}</p>
      )}
    </div>
  )
}
