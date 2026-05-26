'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { CompanyCard as CardType, FitmentScore } from '@quotatain/shared'
import { fmtINR, fmtMoney, fmtCount, normaliseRevenueString } from '@/lib/indianFormat'
import { api } from '@/lib/api'
import {
  ChevronDown, ChevronUp, Copy, Check, AlertTriangle,
  TrendingUp, Users, Zap, Target, Building2,
  Search, Loader2, Linkedin, Mail, UserCircle2, RefreshCw,
} from 'lucide-react'

interface Props {
  card: CardType
  fitment: FitmentScore | null
  companyId: string   // DB id — needed for contact search API calls
}

// ─── tiny helpers ────────────────────────────────────────────────────────────

function verdict(score: number) {
  if (score >= 75) return { label: 'Strong fit', cls: 'bg-positive-soft text-positive' }
  if (score >= 50) return { label: 'Worth qualifying', cls: 'bg-warning-soft text-warning' }
  return { label: 'Low priority', cls: 'bg-negative-soft text-negative' }
}

function confidenceDot(c: 'high' | 'medium' | 'low') {
  return c === 'high' ? 'bg-positive' : c === 'medium' ? 'bg-warning' : 'bg-ink-4'
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title="Copy outreach opener"
      className="ml-auto shrink-0 p-1.5 rounded-[5px] text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
    >
      {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-3">
      {children}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-line my-1" />
}

function ScoreBar({ score, label, evidence }: { score: number; label: string; evidence?: string }) {
  const barCls = score >= 70 ? 'bg-positive' : score >= 40 ? 'bg-warning' : 'bg-negative'
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[12px] text-ink-2">{label}</span>
        <span className="text-[12px] font-medium font-mono text-ink">{score}</span>
      </div>
      <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
        <div className={`h-full ${barCls} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      {evidence && <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">{evidence}</p>}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-line last:border-0">
      <span className="text-[11.5px] text-ink-3 shrink-0">{label}</span>
      <span className="text-[11.5px] text-ink text-right font-medium">{value}</span>
    </div>
  )
}

function Chip({ label, variant = 'default' }: { label: string; variant?: 'default' | 'accent' | 'positive' }) {
  const cls =
    variant === 'accent'   ? 'bg-accent-soft text-accent' :
    variant === 'positive' ? 'bg-positive-soft text-positive' :
                             'bg-surface-2 text-ink-2'
  return <span className={`inline-block text-[11.5px] font-medium px-2.5 py-1 rounded-[5px] mr-1.5 mb-1.5 ${cls}`}>{label}</span>
}

// ─── Contact persona card ────────────────────────────────────────────────────

function ContactCard({
  role, rec,
}: {
  role: string
  rec: { recommendedTitle: string; confidence: 'high' | 'medium' | 'low'; rationale: string; outreachAngle: string }
}) {
  return (
    <div className="bg-surface border border-line rounded-[8px] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.06em]">{role}</span>
        <span className={`flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full`}>
          <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot(rec.confidence)}`} />
          <span className="text-ink-3">{rec.confidence}</span>
        </span>
      </div>
      <div className="text-[14px] font-medium text-ink leading-snug">{rec.recommendedTitle}</div>
      <p className="text-[11.5px] text-ink-3 leading-relaxed">{rec.rationale}</p>
      <div className="flex items-start gap-2 mt-1 bg-accent-soft rounded-[6px] px-3 py-2">
        <Target size={12} className="text-accent shrink-0 mt-0.5" />
        <p className="text-[12px] text-accent leading-relaxed flex-1 italic">"{rec.outreachAngle}"</p>
        <CopyButton text={rec.outreachAngle} />
      </div>
    </div>
  )
}

// ─── Contact search ───────────────────────────────────────────────────────────

type ContactPersona = 'economicBuyer' | 'champion' | 'technicalEvaluator' | 'other'

interface Contact {
  apolloId: string
  name: string
  title: string
  seniority: string | null
  linkedinUrl: string | null
  email: string | null
  emailStatus: string | null
  photoUrl: string | null
  persona: ContactPersona
  relevanceScore: number
}

const PERSONA_LABEL: Record<ContactPersona, string> = {
  economicBuyer: 'Economic buyer',
  champion: 'Champion',
  technicalEvaluator: 'Tech evaluator',
  other: 'Other',
}

function PersonaTag({ persona }: { persona: ContactPersona }) {
  const cls =
    persona === 'economicBuyer'      ? 'bg-accent-soft text-accent' :
    persona === 'champion'           ? 'bg-positive-soft text-positive' :
    persona === 'technicalEvaluator' ? 'bg-warning-soft text-warning' :
                                       'bg-surface-2 text-ink-3'
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {PERSONA_LABEL[persona]}
    </span>
  )
}

function ContactRow({
  contact,
  companyId,
  onEmailRevealed,
}: {
  contact: Contact
  companyId: string
  onEmailRevealed: (apolloId: string, email: string) => void
}) {
  const [copied, setCopied] = useState<'name' | 'email' | null>(null)

  const revealMutation = useMutation({
    mutationFn: () => api.companies.revealEmail(companyId, contact.apolloId),
    onSuccess: (data) => {
      if (data.email) onEmailRevealed(contact.apolloId, data.email)
    },
  })

  const copyText = (text: string, which: 'name' | 'email') => {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 2000)
  }

  const initials = contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex items-start gap-3 p-3 bg-surface border border-line rounded-[8px]">
      {/* Avatar */}
      {contact.photoUrl ? (
        <img src={contact.photoUrl} alt={contact.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-surface-2 border border-line flex items-center justify-center shrink-0 font-medium text-[13px] text-ink-2">
          {initials || <UserCircle2 size={20} className="text-ink-4" />}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-ink">{contact.name}</span>
          <PersonaTag persona={contact.persona} />
        </div>
        <div className="text-[12px] text-ink-2 mt-0.5">{contact.title}</div>

        {/* Email row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {contact.email ? (
            <div className="flex items-center gap-1.5 bg-surface-2 rounded-[5px] px-2.5 py-1">
              <Mail size={11} className="text-positive shrink-0" />
              <span className="text-[11.5px] font-mono text-ink">{contact.email}</span>
              <button
                onClick={() => copyText(contact.email!, 'email')}
                className="ml-1 text-ink-3 hover:text-ink transition-colors"
              >
                {copied === 'email' ? <Check size={11} className="text-positive" /> : <Copy size={11} />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => revealMutation.mutate()}
              disabled={revealMutation.isPending || revealMutation.isError}
              className="flex items-center gap-1.5 text-[11.5px] text-accent hover:text-accent-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {revealMutation.isPending ? (
                <><Loader2 size={11} className="animate-spin" />Revealing…</>
              ) : revealMutation.isError ? (
                <span className="text-negative">Failed to reveal</span>
              ) : (
                <><Mail size={11} />Reveal email</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {contact.linkedinUrl && (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open LinkedIn profile"
            className="p-1.5 rounded-[5px] text-ink-3 hover:text-[#0A66C2] hover:bg-surface-2 transition-colors"
          >
            <Linkedin size={14} />
          </a>
        )}
        <button
          onClick={() => copyText(contact.name, 'name')}
          title="Copy name"
          className="p-1.5 rounded-[5px] text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
        >
          {copied === 'name' ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}

function WhoToContact({
  companyId,
  fitment,
  hiring,
  attritionRisk,
  attritionEvidence,
}: {
  companyId: string
  fitment: FitmentScore
  hiring: CardType['hiring']
  attritionRisk: string
  attritionEvidence: string | null
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [cached, setCached] = useState(false)

  const searchMutation = useMutation({
    mutationFn: () => api.companies.searchContacts(companyId),
    onSuccess: (data) => {
      setContacts(data.contacts)
      setCached(data.cached)
    },
  })

  const handleEmailRevealed = (apolloId: string, email: string) => {
    setContacts(prev =>
      prev ? prev.map(c => c.apolloId === apolloId ? { ...c, email, emailStatus: 'verified' } : c) : prev
    )
  }

  // Group contacts by persona
  const grouped = contacts
    ? (['economicBuyer', 'champion', 'technicalEvaluator', 'other'] as ContactPersona[])
        .map(p => ({ persona: p, people: contacts.filter(c => c.persona === p) }))
        .filter(g => g.people.length > 0)
    : []

  return (
    <div>
      {/* Recommended personas (always shown) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        <ContactCard role="Economic buyer" rec={fitment.contacts.economicBuyer} />
        <ContactCard role="Champion" rec={fitment.contacts.champion} />
        {fitment.contacts.technicalEvaluator && (
          <ContactCard role="Tech evaluator" rec={fitment.contacts.technicalEvaluator} />
        )}
      </div>

      {/* Senior hires */}
      {hiring.seniorHiresLast90Days.length > 0 && (
        <div className="mb-4 bg-surface-2 rounded-[7px] px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Users size={13} className="text-ink-3" />
            <span className="text-[11.5px] font-medium text-ink-2">New senior hires to target (last 90 days)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiring.seniorHiresLast90Days.map((hire, i) => (
              <span key={i} className="text-[12px] text-ink bg-surface border border-line px-2.5 py-1 rounded-[5px]">
                {hire}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attrition risk */}
      {attritionRisk && attritionRisk !== 'Unknown' && (
        <div className="mb-4 flex items-start gap-2.5">
          <span className="text-[11.5px] text-ink-3 shrink-0 mt-0.5">Attrition risk:</span>
          <span className={`text-[11.5px] font-medium px-2 py-0.5 rounded-full ${
            attritionRisk === 'High'   ? 'bg-negative-soft text-negative' :
            attritionRisk === 'Medium' ? 'bg-warning-soft text-warning' :
                                         'bg-positive-soft text-positive'
          }`}>{attritionRisk}</span>
          {attritionEvidence && (
            <span className="text-[11.5px] text-ink-3 italic">{attritionEvidence}</span>
          )}
        </div>
      )}

      {/* Find real contacts CTA / results */}
      {!contacts && !searchMutation.isPending && !searchMutation.isError && (
        <button
          onClick={() => searchMutation.mutate()}
          className="flex items-center gap-2 w-full justify-center py-2.5 border border-dashed border-line-2 rounded-[8px] text-[13px] text-ink-2 hover:border-accent hover:text-accent hover:bg-accent-soft transition-all"
        >
          <Search size={14} />
          Find real contacts at this company via Apollo
        </button>
      )}

      {searchMutation.isPending && (
        <div className="flex items-center justify-center gap-2.5 py-4 text-[13px] text-ink-3">
          <Loader2 size={16} className="animate-spin text-accent" />
          Searching Apollo for contacts…
        </div>
      )}

      {searchMutation.isError && (
        <div className="flex items-center gap-3 bg-negative-soft rounded-[7px] px-4 py-3">
          <AlertTriangle size={14} className="text-negative shrink-0" />
          <span className="text-[12.5px] text-negative flex-1">{(searchMutation.error as Error).message}</span>
          <button onClick={() => searchMutation.mutate()} className="text-[12px] text-negative underline">Retry</button>
        </div>
      )}

      {contacts && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11.5px] text-ink-3">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
              {cached && <span className="ml-1.5 text-ink-4">(cached)</span>}
            </span>
            <button
              onClick={() => searchMutation.mutate()}
              disabled={searchMutation.isPending}
              className="flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink transition-colors"
            >
              <RefreshCw size={11} className={searchMutation.isPending ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-ink-3">
              No matching contacts found on Apollo for this company.
              <br />
              <span className="text-[12px]">Try searching manually on LinkedIn with the recommended titles above.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {grouped.map(({ persona, people }) => (
                <div key={persona}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <PersonaTag persona={persona} />
                    <span className="text-[11px] text-ink-4">{people.length} found</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    {people.map(contact => (
                      <ContactRow
                        key={contact.apolloId}
                        contact={contact}
                        companyId={companyId}
                        onEmailRevealed={handleEmailRevealed}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible background section ─────────────────────────────────────────

function Background({ card }: { card: CardType }) {
  const { identity, scale, funding, hiring, techStack } = card
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t border-line">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-hover transition-colors"
      >
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
          <Building2 size={14} className="text-ink-3" />
          Company background
        </div>
        {open ? <ChevronUp size={14} className="text-ink-3" /> : <ChevronDown size={14} className="text-ink-3" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">

          {/* Identity */}
          {identity.description && (
            <div>
              <SectionLabel>About</SectionLabel>
              <p className="text-[13px] text-ink-2 leading-relaxed">{identity.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <SectionLabel>Company</SectionLabel>
              <Field label="Industry" value={identity.industry} />
              <Field label="Sub-industry" value={identity.subIndustry} />
              <Field label="Founded" value={identity.foundedYear} />
              <Field label="HQ" value={[identity.hqCity, identity.hqState, identity.hqCountry].filter(Boolean).join(', ')} />
              <Field label="Type" value={identity.companyType} />
              <Field label="CIN" value={identity.cin} />
              <Field label="NSE / BSE" value={identity.nseTicker ?? identity.bseTicker} />
            </div>
            <div>
              <SectionLabel>Scale & Revenue</SectionLabel>
              <Field label="Headcount" value={fmtCount(scale.headcount)} />
              <Field label="Trend (6 mo)" value={scale.headcountTrend} />
              <Field label="Growth (6 mo)" value={scale.headcountGrowthPct6mo != null ? `${scale.headcountGrowthPct6mo > 0 ? '+' : ''}${scale.headcountGrowthPct6mo}%` : null} />
              <Field
                label="Revenue (est.)"
                value={normaliseRevenueString(scale.revenueRange) ?? fmtMoney(scale.revenueEstimated, scale.revenueCurrency)}
              />
              <Field label="YoY growth" value={scale.revenueGrowthYoyPct != null ? `${scale.revenueGrowthYoyPct > 0 ? '+' : ''}${scale.revenueGrowthYoyPct}%` : null} />
              <Field label="MCA revenue" value={fmtINR(funding.annualRevenueFromMCA)} />
              <Field label="MCA net profit" value={fmtINR(funding.netProfitFromMCA)} />
              <Field label="Paid-up capital" value={fmtINR(scale.mcaPaidUpCapital)} />
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <SectionLabel>Funding</SectionLabel>
              <Field label="Stage" value={funding.stage} />
              <Field label="IPO" value={funding.ipoStatus !== 'NA' ? funding.ipoStatus : null} />
              <Field label="Total raised" value={fmtMoney(funding.totalRaised, funding.totalRaisedCurrency)} />
              <Field label="Last round" value={funding.lastRoundDate} />
              <Field label="Last amount" value={fmtMoney(funding.lastRoundAmount, funding.totalRaisedCurrency)} />
              <Field label="Last stage" value={funding.lastRoundStage} />
              <Field label="Stock price" value={funding.stockPriceINR != null ? `₹${funding.stockPriceINR.toLocaleString('en-IN')}` : null} />
              <Field label="Market cap" value={normaliseRevenueString(funding.marketCapINR)} />
              {funding.lastRoundInvestors.length > 0 && (
                <div className="pt-1.5">
                  <span className="text-[11.5px] text-ink-3">Investors: </span>
                  <span className="text-[11.5px] text-ink">{funding.lastRoundInvestors.join(', ')}</span>
                </div>
              )}
            </div>
            <div>
              <SectionLabel>Hiring detail</SectionLabel>
              <Field label="Open roles" value={hiring.openRolesTotal} />
              <Field label="90 days ago" value={hiring.openRoles90DaysAgo} />
              <Field label="Velocity" value={hiring.hiringVelocity} />
              <Field label="Hiring spike" value={hiring.hiringSpike ? 'Yes' : null} />
              <Field label="Fresher hiring" value={hiring.fresherHiringPct != null ? `${hiring.fresherHiringPct}% of roles` : null} />
              <Field label="Fresher signal" value={hiring.fresherHiringSignal} />
              <Field label="Avg tenure" value={hiring.avgTenureMonths != null ? `${Math.round(hiring.avgTenureMonths / 12)}y ${hiring.avgTenureMonths % 12}m` : null} />
              {hiring.rolesByDepartment && Object.keys(hiring.rolesByDepartment).length > 0 && (
                <div className="mt-2">
                  <span className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.06em]">Roles by dept</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(hiring.rolesByDepartment)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([dept, count]) => (
                        <div key={dept} className="flex justify-between text-[11.5px]">
                          <span className="text-ink-2">{dept}</span>
                          <span className="font-mono text-ink">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Divider />

          {/* Tech Stack */}
          <div>
            <SectionLabel>Technology stack</SectionLabel>
            <div className="grid grid-cols-2 gap-x-8 mb-3">
              <Field label="CRM" value={techStack.crm} />
              <Field label="ATS" value={techStack.ats} />
              <Field label="HRIS" value={techStack.hris} />
              <Field label="ERP" value={techStack.erp} />
              <Field label="Cloud" value={techStack.cloud} />
              <Field label="SaaS tools (est.)" value={techStack.estimatedToolCount} />
            </div>
            {techStack.competitorFlag && (
              <div className="bg-warning-soft border border-warning-soft rounded-[6px] px-3 py-2 text-[12px] text-warning font-medium mb-2">
                ⚡ {techStack.competitorFlag}
              </div>
            )}
            <div className="mt-1">
              {[...techStack.marketing, ...techStack.collaboration, ...techStack.analytics, ...techStack.security, ...techStack.other].map((t, i) => (
                <Chip key={i} label={t} />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CompanyCard({ card, fitment, companyId }: Props) {
  const { identity, hiring, buyingSignals, painPoints, synthesis, engagement } = card
  const score = fitment?.compositeScore ?? null
  const v = score != null ? verdict(score) : null

  return (
    <div className="bg-surface border border-line rounded-[8px] overflow-hidden">

      {/* ── 1. THE HOOK ─────────────────────────────────────────────────── */}
      {score != null && v && (
        <div className="px-5 py-5 border-b border-line">
          <div className="flex items-start gap-5">
            {/* Score */}
            <div className="shrink-0 text-center">
              <div className="text-[42px] font-medium font-mono text-ink leading-none">{score}</div>
              <div className="text-[10.5px] text-ink-3 mt-1">/ 100</div>
            </div>
            {/* Verdict + signals */}
            <div className="flex-1 min-w-0">
              <span className={`inline-block text-[11.5px] font-medium px-2.5 py-1 rounded-full mb-2 ${v.cls}`}>
                {v.label}
              </span>
              {synthesis.buyingSignalSummary && (
                <p className="text-[13px] text-ink-2 leading-relaxed">{synthesis.buyingSignalSummary}</p>
              )}
              {synthesis.competitorDisplacementAngle && (
                <div className="flex items-start gap-2 mt-2 bg-accent-soft rounded-[6px] px-3 py-2">
                  <Zap size={12} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-[12px] text-accent leading-relaxed">{synthesis.competitorDisplacementAngle}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dimension bars */}
          {fitment && (
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-0">
              {Object.entries(fitment.breakdown).map(([key, dim]: [string, any]) => (
                <ScoreBar
                  key={key}
                  score={dim.score}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                  evidence={dim.evidence}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 2. LEADERSHIP CHANGE ALERT ──────────────────────────────────── */}
      {hiring.leadershipChangeFlag && hiring.leadershipChangeDetail && (
        <div className="mx-5 mt-4 flex items-start gap-2.5 bg-warning-soft border border-warning-soft rounded-[7px] px-4 py-3">
          <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
          <div>
            <span className="text-[12px] font-medium text-warning">Leadership change — act fast</span>
            <p className="text-[12px] text-warning/80 mt-0.5">{hiring.leadershipChangeDetail}</p>
          </div>
        </div>
      )}

      {/* ── 3. WHO TO CONTACT ───────────────────────────────────────────── */}
      {fitment && (
        <div className="px-5 py-5 border-b border-line">
          <SectionLabel>Who to contact</SectionLabel>
          <WhoToContact
            companyId={companyId}
            fitment={fitment}
            hiring={hiring}
            attritionRisk={hiring.attritionRisk}
            attritionEvidence={hiring.attritionEvidence}
          />
        </div>
      )}

      {/* ── 4. WHAT TO SAY ──────────────────────────────────────────────── */}
      {synthesis.talkingPoints.length > 0 && (
        <div className="px-5 py-5 border-b border-line">
          <SectionLabel>What to say</SectionLabel>
          <ol className="space-y-2.5">
            {synthesis.talkingPoints.map((tp, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-[13px] font-medium text-accent shrink-0">{i + 1}.</span>
                <span className="text-[13px] text-ink-2 leading-relaxed">{tp}</span>
              </li>
            ))}
          </ol>
          {synthesis.fresherHiringInterpretation && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-ink-2 bg-surface-2 rounded-[6px] px-3 py-2">
              <TrendingUp size={13} className="text-ink-3 shrink-0 mt-0.5" />
              <span>{synthesis.fresherHiringInterpretation}</span>
            </div>
          )}
          {synthesis.riskFlags.length > 0 && (
            <div className="mt-3 bg-negative-soft rounded-[6px] px-4 py-3 space-y-1">
              <div className="text-[10.5px] font-medium text-negative uppercase tracking-[0.06em] mb-1.5">Risk flags</div>
              {synthesis.riskFlags.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-[12.5px] text-negative">
                  <span className="shrink-0">⚠</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. BUYING SIGNALS ───────────────────────────────────────────── */}
      {buyingSignals.length > 0 && (
        <div className="px-5 py-5 border-b border-line">
          <SectionLabel>Buying signals</SectionLabel>
          <div className="space-y-2">
            {[...buyingSignals].sort((a, b) => b.weight - a.weight).map((s, i) => (
              <div key={i} className="flex items-start gap-3 bg-surface-2 rounded-[7px] p-3">
                <div className={`text-[12px] font-mono font-medium shrink-0 w-7 text-right mt-0.5 ${
                  s.weight >= 70 ? 'text-positive' : s.weight >= 40 ? 'text-warning' : 'text-ink-3'
                }`}>{s.weight}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink">{s.signal}</div>
                  <div className="text-[12px] text-ink-3 mt-0.5">
                    {s.detail}
                    <span className="mx-1.5 text-ink-4">·</span>
                    {s.source}
                    {s.date && <><span className="mx-1.5 text-ink-4">·</span>{s.date}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. PAIN POINTS ──────────────────────────────────────────────── */}
      {painPoints.length > 0 && (
        <div className="px-5 py-5 border-b border-line">
          <SectionLabel>Pain points</SectionLabel>
          <div className="space-y-2.5">
            {painPoints.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                <div>
                  <span className="text-[13px] font-medium text-ink">{p.point}</span>
                  <span className="text-[12px] text-ink-3 ml-2">— {p.evidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7. BACKGROUND (collapsible) ─────────────────────────────────── */}
      <Background card={card} />

      {/* ── 8. CRM ENGAGEMENT ───────────────────────────────────────────── */}
      {card.engagement && (
        <div className="px-5 py-5 border-t border-line">
          <SectionLabel>CRM engagement</SectionLabel>
          <div className="grid grid-cols-2 gap-x-8">
            <Field label="In CRM" value={card.engagement.inCRM ? 'Yes' : 'No'} />
            <Field label="Last contact" value={card.engagement.lastContactDate} />
            <Field label="Last meeting" value={card.engagement.lastMeetingDate} />
            <Field label="Deal stage" value={card.engagement.dealStage} />
            <Field label="Open opportunity" value={card.engagement.openOpportunity ? 'Yes' : null} />
            <Field label="Previous customer" value={card.engagement.previousCustomer ? 'Yes (churned)' : null} />
            <Field label="Emails (90 days)" value={card.engagement.emailsSent90Days} />
          </div>
        </div>
      )}

      {/* ── 9. FOOTER ───────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-line bg-surface-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-3">
          Confidence {card.synthesis.confidenceScore}%
          <span className="mx-1.5 text-ink-4">·</span>
          {card.meta.sourcesUsed.join(', ')}
          <span className="mx-1.5 text-ink-4">·</span>
          {card.meta.dataFreshness}
        </span>
        <span className="text-[11px] text-ink-3">
          {new Date(card.meta.researchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

    </div>
  )
}
