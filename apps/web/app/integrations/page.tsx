'use client'
import { useState } from 'react'
import { Check, ExternalLink, Plug, Database, Globe, Zap, ChevronDown, ChevronUp } from 'lucide-react'

type IntegrationStatus = 'connected' | 'available' | 'coming_soon'

interface Integration {
  id: string
  name: string
  description: string
  logo: string
  status: IntegrationStatus
  category: string
  detail?: string
}

const INTEGRATIONS: Integration[] = [
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Pull opportunity and engagement history. Push enriched account data back to Salesforce.',
    logo: 'SF',
    status: 'coming_soon',
    category: 'CRM',
    detail: 'When connected, Quotatain will sync enriched company data, fitment scores, and buying signals directly to your Salesforce accounts.',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync enriched company profiles and fitment scores to your HubSpot CRM.',
    logo: 'HS',
    status: 'coming_soon',
    category: 'CRM',
    detail: 'Enrich HubSpot company records with headcount trends, tech stack, pain points, and fitment scores from every research run.',
  },
  // Data
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'Company and contact data powering headcount, org chart, and contact enrichment.',
    logo: 'AP',
    status: 'connected',
    category: 'Data',
    detail: 'Apollo data is used to enrich every company with headcount, org chart, contact info, and industry classification.',
  },
  {
    id: 'tavily',
    name: 'Tavily Search',
    description: 'Real-time web search for news, press releases, and buying signal detection.',
    logo: 'TV',
    status: 'connected',
    category: 'Data',
    detail: 'Tavily powers the live web search step in every research run, fetching recent news, funding rounds, and hiring signals.',
  },
  {
    id: 'newsapi',
    name: 'NewsAPI',
    description: 'Aggregated news coverage for company mentions, funding signals, and executive moves.',
    logo: 'NW',
    status: 'connected',
    category: 'Data',
    detail: 'NewsAPI augments Tavily search with structured news aggregation for consistent signal coverage.',
  },
  // Intent
  {
    id: 'clearbit',
    name: 'Clearbit Reveal',
    description: 'IP-to-company enrichment. Identify which uploaded target accounts visit your website.',
    logo: 'CB',
    status: 'coming_soon',
    category: 'Intent',
    detail: 'When connected, Quotatain cross-references your website visitors with your target company lists to surface warm accounts automatically.',
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'First-party intent data pipeline via GA4 + GTM for tracking account-level engagement.',
    logo: 'GA',
    status: 'coming_soon',
    category: 'Intent',
  },
  // Export
  {
    id: 'csv',
    name: 'CSV Export',
    description: 'Download enriched company data, fitment scores, and intelligence cards as CSV.',
    logo: 'EX',
    status: 'connected',
    category: 'Export',
  },
]

const CATEGORY_ICONS: Record<string, any> = {
  CRM: Plug,
  Data: Database,
  Intent: Globe,
  Export: Zap,
}

const STATUS_STYLES: Record<IntegrationStatus, { badge: string; label: string }> = {
  connected:   { badge: 'bg-positive-soft text-positive', label: 'Connected' },
  available:   { badge: 'bg-surface-2 text-ink-2', label: 'Available' },
  coming_soon: { badge: 'bg-surface-2 text-ink-3', label: 'V2' },
}

function IntegrationCard({ item }: { item: Integration }) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_STYLES[item.status]
  const isConnected = item.status === 'connected'

  return (
    <div className={`bg-surface border rounded-[8px] overflow-hidden transition-all ${isConnected ? 'border-line' : 'border-line'}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-[8px] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: isConnected ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'var(--surface-2)', color: isConnected ? undefined : 'var(--ink-3)' }}
        >
          {item.logo}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-ink">{item.name}</span>
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
          </div>
          <div className="text-[12.5px] text-ink-3 mt-0.5 truncate">{item.description}</div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-[12.5px] text-positive font-medium">
              <Check size={13} />
              Active
            </div>
          ) : item.status === 'available' ? (
            <button className="text-[12.5px] font-medium text-ink-2 border border-line px-3 py-1.5 rounded-[6px] hover:border-ink-3 hover:text-ink transition-colors">
              Connect
            </button>
          ) : (
            <span className="text-[11.5px] text-ink-4">Coming soon</span>
          )}
          {item.detail && (
            <button
              onClick={() => setOpen(!open)}
              className="p-1 text-ink-4 hover:text-ink-2 transition-colors"
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
      {open && item.detail && (
        <div className="px-5 pb-4 pt-0 border-t border-line">
          <p className="text-[12.5px] text-ink-2 leading-relaxed pt-3">{item.detail}</p>
        </div>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  const categories = Array.from(new Set(INTEGRATIONS.map(i => i.category)))
  const connected = INTEGRATIONS.filter(i => i.status === 'connected').length

  return (
    <div className="p-8" style={{ maxWidth: 860 }}>
      {/* Page head */}
      <div className="mb-6">
        <div className="text-[10.5px] font-medium text-ink-3 uppercase tracking-[0.08em] mb-1">Settings</div>
        <h1 className="text-[22px] font-medium tracking-tight text-ink">Integrations</h1>
        <div className="text-[13px] text-ink-2 mt-1">Connect your stack to enrich research runs and sync intelligence data</div>
      </div>

      {/* Coverage strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Connected', value: connected },
          { label: 'Available', value: INTEGRATIONS.filter(i => i.status === 'available').length },
          { label: 'Coming in V2', value: INTEGRATIONS.filter(i => i.status === 'coming_soon').length },
        ].map(m => (
          <div key={m.label} className="bg-surface border border-line rounded-[8px] px-4 py-3">
            <div className="font-mono text-[22px] font-medium text-ink leading-none">{m.value}</div>
            <div className="text-[11px] font-medium text-ink-3 uppercase tracking-[0.05em] mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat] ?? Plug
          const items = INTEGRATIONS.filter(i => i.category === cat)
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={13} className="text-ink-3" />
                <span className="text-[11.5px] font-medium text-ink-3 uppercase tracking-[0.06em]">{cat}</span>
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <IntegrationCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Intent tracking snippet */}
      <div className="mt-8 bg-ink rounded-[10px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="text-[12px] font-medium text-white/60">Intent tracking snippet (V2)</div>
          <span className="text-[11px] font-medium text-white/30 bg-white/10 px-2 py-0.5 rounded">Coming soon</span>
        </div>
        <div className="px-5 py-4">
          <pre className="font-mono text-[12px] text-white/50 leading-relaxed overflow-x-auto">{`<!-- Add to <head> on your marketing site -->
<script async
  src="https://cdn.quotatain.com/intent.js"
  data-key="YOUR_WORKSPACE_KEY">
</script>`}</pre>
          <p className="text-[12px] text-white/30 mt-3">
            Identifies which target companies visit your site. Requires Clearbit Reveal or a compatible IP-to-company provider.
          </p>
        </div>
      </div>
    </div>
  )
}
