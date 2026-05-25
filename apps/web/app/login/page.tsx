'use client'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('meetbharani91@gmail.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/runs')
    }
  }

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
      {/* LEFT — form */}
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
            <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-2">Sign in</div>
            <h1 className="text-[28px] font-medium tracking-tight text-ink leading-tight">Welcome back</h1>
            <p className="text-[13.5px] text-ink-3 mt-1.5">
              New here?{' '}
              <Link href="/signup" className="text-accent font-medium hover:text-accent-2">
                Create an account →
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink-2">Work email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-[12px] font-medium text-ink-2">Password</label>
                  <button type="button" className="text-[12px] text-ink-3 hover:text-ink">Forgot?</button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-line-2 rounded-[6px] px-3 py-2 text-[13.5px] text-ink bg-surface focus:outline-none focus:border-ink-3 focus:shadow-[0_0_0_3px_rgba(24,21,15,0.06)] transition-all"
                />
              </div>

              <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-accent" />
                Keep me signed in on this device
              </label>

              {error && <p className="text-[13px] text-negative">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-[6px] py-2.5 text-[13px] font-medium hover:bg-accent-2 disabled:opacity-50 transition-colors mt-1"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[11.5px] text-ink-3">or</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 border border-line-2 bg-surface rounded-[6px] py-2.5 text-[13px] font-medium text-ink-2 opacity-60 cursor-not-allowed"
            >
              <span className="font-mono font-medium text-[13px]">G</span>
              Continue with Google
              <span className="text-[10.5px] text-ink-3 ml-1">V2</span>
            </button>
          </div>
        </div>

        <div className="font-mono text-[11.5px] text-ink-3">
          © 2026 InfoEdge India · v1.2 · India region
        </div>
      </div>

      {/* RIGHT — value-prop slab */}
      <div
        className="relative flex flex-col justify-between overflow-hidden"
        style={{ background: 'var(--ink)', color: '#FAFAF8', padding: '44px 52px' }}
      >
        {/* Decorative grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Accent corner glow */}
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: 280, height: 280,
            background: 'radial-gradient(circle at top right, rgba(216,90,40,0.4), transparent 65%)',
          }}
        />

        <div className="relative">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
            India · B2B sales intelligence
          </div>
          <h1 className="font-medium leading-[1.15] max-w-[460px]" style={{ fontSize: 38, letterSpacing: '-0.02em' }}>
            One agent. Ten sources.
            <br />
            <span style={{ color: 'var(--accent)' }}>One sales-ready brief per account.</span>
          </h1>
          <p className="mt-4 leading-relaxed max-w-[430px]" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Drop a list. The agent queries Apollo, MCA21, NSE, AmbitionBox, news, and your CRM
            in parallel — then synthesises a fitment-scored intelligence card per company.
          </p>
        </div>

        <div className="relative">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Trusted by
          </div>
          <div className="flex items-center gap-3 font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <span>InfoEdge</span><span>·</span><span>Naukri</span><span>·</span><span>99acres</span><span>·</span><span>Shiksha</span>
          </div>
        </div>
      </div>
    </div>
  )
}
