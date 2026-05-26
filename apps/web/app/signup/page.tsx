'use client'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Account created but sign-in failed. Go to login.')
        setLoading(false)
      } else {
        router.push('/runs')
      }
    } catch {
      setError('Could not reach the server.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
      {/* LEFT: form */}
      <div className="flex flex-col bg-bg" style={{ padding: '40px 56px' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center font-mono font-medium text-white text-[13px] relative overflow-hidden"
            style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--ink)' }}
          >
            Q
            <span className="absolute bottom-0 right-0" style={{ width: 9, height: 9, background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <span className="font-medium text-[14.5px] tracking-tight text-ink">quotatain</span>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center">
          <div style={{ width: 380, maxWidth: '100%' }}>
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-5">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-colors"
                  style={{ height: 3, background: step >= i ? 'var(--accent)' : 'var(--surface-2)' }}
                />
              ))}
            </div>

            <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-2">
              Sign up · step {step} of 2
            </div>
            <h1 className="text-[28px] font-medium tracking-tight text-ink leading-tight">
              {step === 1 ? 'Start your free trial' : 'Set up your workspace'}
            </h1>
            <p className="text-[13.5px] text-ink-3 mt-1.5">
              {step === 1 ? (
                <>Already have an account?{' '}
                  <Link href="/login" className="text-accent font-medium hover:text-accent-2">Sign in →</Link>
                </>
              ) : 'We auto-create your workspace. You can add teammates later.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {step === 1 ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-ink-2">Full name</label>
                    <input
                      required value={name} onChange={e => setName(e.target.value)}
                      placeholder="Priya Mehta" autoFocus
                      className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-ink-2">Work email</label>
                    <input
                      type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                    />
                    <div className="text-[11.5px] text-ink-3">We use this for sign-in and workspace invites.</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-ink-2">Password</label>
                    <input
                      type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="At least 10 characters" minLength={8}
                      className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer">
                    <input type="checkbox" required className="accent-accent" />
                    <span>I agree to the <a className="underline text-ink">terms</a> and <a className="underline text-ink">privacy policy</a></span>
                  </label>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-[6px] py-2.5 text-[13px] font-medium hover:bg-accent-2 transition-colors"
                  >
                    Continue →
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-ink-2">Workspace name</label>
                    <input
                      defaultValue={email ? email.split('@')[1]?.split('.')[0]?.replace(/^./, s => s.toUpperCase()) : ''}
                      placeholder="InfoEdge India" autoFocus
                      className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                    />
                    <div className="text-[11.5px] text-ink-3">This is what teammates see. You can change it later.</div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-ink-2">Region</label>
                    <select
                      defaultValue="india"
                      className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 transition-all appearance-none"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238E8881' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center', paddingRight: 30 }}
                    >
                      <option value="india">India (MVP region)</option>
                      <option value="us" disabled>United States (V2)</option>
                    </select>
                  </div>
                  {error && <p className="text-[13px] text-negative">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="border border-line-2 bg-surface text-ink-2 rounded-[6px] px-4 py-2.5 text-[13px] font-medium hover:bg-hover transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-accent text-white rounded-[6px] py-2.5 text-[13px] font-medium hover:bg-accent-2 disabled:opacity-50 transition-colors"
                    >
                      {loading ? 'Creating…' : 'Create workspace →'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-ink-3">
          © 2026 InfoEdge India · v1.2 · India region
        </div>
      </div>

      {/* RIGHT slab */}
      <div
        className="relative flex flex-col justify-between overflow-hidden"
        style={{ background: 'var(--ink)', color: '#FAFAF8', padding: '44px 52px' }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
          <defs>
            <pattern id="grid2" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid2)" />
        </svg>
        <div className="absolute top-0 right-0 pointer-events-none" style={{ width: 280, height: 280, background: 'radial-gradient(circle at top right, rgba(216,90,40,0.4), transparent 65%)' }} />
        <div className="relative">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>India · B2B sales intelligence</div>
          <h1 className="font-medium leading-[1.15] max-w-[460px]" style={{ fontSize: 38, letterSpacing: '-0.02em' }}>
            One agent. Ten sources.
            <br />
            <span style={{ color: 'var(--accent)' }}>One sales-ready brief per account.</span>
          </h1>
          <p className="mt-4 leading-relaxed max-w-[430px]" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Drop a list. The agent queries Apollo, MCA21, NSE, AmbitionBox, news, and your CRM in parallel, then synthesises a fitment-scored intelligence card per company.
          </p>
        </div>
        <div className="relative">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Trusted by</div>
          <div className="flex items-center gap-3 font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <span>InfoEdge</span><span>·</span><span>Naukri</span><span>·</span><span>99acres</span><span>·</span><span>Shiksha</span>
          </div>
        </div>
      </div>
    </div>
  )
}
