'use client'
import type { CompanyCard as CardType, FitmentScore } from '@quotatain/shared'
import { fmtINR, fmtMoney, fmtCount, normaliseRevenueString } from '@/lib/indianFormat'

interface Props {
  card: CardType
  fitment: FitmentScore | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 px-5 py-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</h4>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between items-start gap-4 py-1">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-900 text-right font-medium">{value}</span>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-1 mb-1 ${color}`}>{label}</span>
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-900">{score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export function CompanyCard({ card, fitment }: Props) {
  const { identity, scale, funding, hiring, techStack, buyingSignals, painPoints, synthesis, engagement, intent } = card

  return (
    <div className="border-t border-gray-100 bg-gray-50/50">
      {/* Fitment Score */}
      {fitment && (
        <Section title="Product Fit">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`text-4xl font-bold ${fitment.compositeScore >= 70 ? 'text-green-600' : fitment.compositeScore >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {fitment.compositeScore}
                </div>
                <div className="text-sm text-gray-500">/ 100<br />Fit Score</div>
              </div>
              {Object.entries(fitment.breakdown).map(([key, dim]: [string, any]) => (
                <ScoreBar key={key} score={dim.score} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())} />
              ))}
            </div>
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Who to contact</h5>
              <div className="space-y-2">
                {[
                  { role: 'Economic Buyer', rec: fitment.contacts.economicBuyer },
                  { role: 'Champion', rec: fitment.contacts.champion },
                  ...(fitment.contacts.technicalEvaluator ? [{ role: 'Tech Evaluator', rec: fitment.contacts.technicalEvaluator }] : []),
                ].map(({ role, rec }) => (
                  <div key={role} className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{role}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${rec.confidence === 'high' ? 'bg-green-50 text-green-700' : rec.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>{rec.confidence}</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-900">{rec.recommendedTitle}</div>
                    <div className="text-xs text-indigo-600 mt-1 italic">&ldquo;{rec.outreachAngle}&rdquo;</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* AI Talking Points */}
      {synthesis.talkingPoints.length > 0 && (
        <Section title="Talking Points">
          <ol className="space-y-2">
            {synthesis.talkingPoints.map((tp: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm text-gray-800">
                <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span>
                <span>{tp}</span>
              </li>
            ))}
          </ol>
          {synthesis.riskFlags.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <div className="text-xs font-semibold text-red-700 mb-1">Risk flags</div>
              {synthesis.riskFlags.map((f: string, i: number) => <div key={i} className="text-xs text-red-600">⚠ {f}</div>)}
            </div>
          )}
        </Section>
      )}

      {/* Buying Signals */}
      {buyingSignals.length > 0 && (
        <Section title="Buying Signals">
          <div className="space-y-2">
            {buyingSignals.sort((a: any, b: any) => b.weight - a.weight).map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-indigo-100">
                <div className={`text-xs font-bold mt-0.5 shrink-0 ${s.weight >= 70 ? 'text-green-600' : s.weight >= 40 ? 'text-yellow-600' : 'text-gray-400'}`}>{s.weight}</div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">{s.signal}</div>
                  <div className="text-xs text-gray-500">{s.detail} · <span className="text-gray-400">{s.source}{s.date ? ` · ${s.date}` : ''}</span></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Company Details */}
      <Section title="Company">
        <div className="grid grid-cols-2 gap-x-8">
          <Field label="Industry" value={identity.industry} />
          <Field label="Founded" value={identity.foundedYear} />
          <Field label="HQ" value={[identity.hqCity, identity.hqState, identity.hqCountry].filter(Boolean).join(', ')} />
          <Field label="Type" value={identity.companyType} />
          <Field label="CIN (India)" value={identity.cin} />
          <Field label="NSE/BSE" value={identity.nseTicker ?? identity.bseTicker} />
        </div>
      </Section>

      {/* Scale */}
      <Section title="Scale & Financials">
        <div className="grid grid-cols-2 gap-x-8">
          <Field label="Headcount" value={fmtCount(scale.headcount)} />
          <Field label="Headcount Trend" value={scale.headcountTrend} />
          <Field label="Growth (6mo)" value={scale.headcountGrowthPct6mo != null ? `${scale.headcountGrowthPct6mo > 0 ? '+' : ''}${scale.headcountGrowthPct6mo}%` : null} />
          <Field
            label="Revenue (Est.)"
            value={
              normaliseRevenueString(scale.revenueRange) ??
              fmtMoney(scale.revenueEstimated, scale.revenueCurrency)
            }
          />
          <Field label="Revenue Growth (YoY)" value={scale.revenueGrowthYoyPct != null ? `${scale.revenueGrowthYoyPct > 0 ? '+' : ''}${scale.revenueGrowthYoyPct}%` : null} />
          <Field label="MCA Paid-Up Capital" value={fmtINR(scale.mcaPaidUpCapital)} />
          <Field label="MCA Revenue" value={fmtINR(funding.annualRevenueFromMCA)} />
          <Field label="MCA Net Profit" value={fmtINR(funding.netProfitFromMCA)} />
        </div>
      </Section>

      {/* Funding */}
      <Section title="Funding">
        <div className="grid grid-cols-2 gap-x-8">
          <Field label="Stage" value={funding.stage} />
          <Field label="IPO Status" value={funding.ipoStatus !== 'NA' ? funding.ipoStatus : null} />
          <Field label="Total Raised" value={fmtMoney(funding.totalRaised, funding.totalRaisedCurrency)} />
          <Field label="Last Round" value={funding.lastRoundDate} />
          <Field label="Last Amount" value={fmtMoney(funding.lastRoundAmount, funding.totalRaisedCurrency)} />
          <Field label="Last Stage" value={funding.lastRoundStage} />
          <Field label="Stock Price (NSE/BSE)" value={funding.stockPriceINR != null ? `₹${funding.stockPriceINR.toLocaleString('en-IN')}` : null} />
          <Field label="Market Cap" value={normaliseRevenueString(funding.marketCapINR)} />
          {funding.lastRoundInvestors.length > 0 && (
            <div className="col-span-2 mt-1">
              <span className="text-xs text-gray-500">Investors: </span>
              <span className="text-xs text-gray-900">{funding.lastRoundInvestors.join(', ')}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Hiring */}
      <Section title="Hiring & People">
        <div className="grid grid-cols-2 gap-x-8">
          <Field label="Open Roles" value={hiring.openRolesTotal} />
          <Field label="Hiring Velocity" value={hiring.hiringVelocity} />
          <Field label="Leadership Change" value={hiring.leadershipChangeFlag ? `Yes — ${hiring.leadershipChangeDetail ?? ''}` : null} />
          <Field label="Fresher Hiring" value={hiring.fresherHiringPct != null ? `${hiring.fresherHiringPct}% of open roles` : null} />
          <Field label="Fresher Signal" value={hiring.fresherHiringSignal} />
          <Field label="Avg Tenure" value={hiring.avgTenureMonths != null ? `${Math.round(hiring.avgTenureMonths / 12)}y ${hiring.avgTenureMonths % 12}m` : null} />
          <div className="col-span-2">
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Attrition Risk:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hiring.attritionRisk === 'High' ? 'bg-red-50 text-red-700' : hiring.attritionRisk === 'Medium' ? 'bg-yellow-50 text-yellow-700' : hiring.attritionRisk === 'Low' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                {hiring.attritionRisk}
              </span>
            </div>
            {hiring.attritionEvidence && <p className="text-xs text-gray-500 mt-1 italic">{hiring.attritionEvidence}</p>}
          </div>
        </div>
      </Section>

      {/* Tech Stack */}
      <Section title="Technology Stack">
        <div className="grid grid-cols-2 gap-x-8 mb-3">
          <Field label="CRM" value={techStack.crm} />
          <Field label="ATS" value={techStack.ats} />
          <Field label="HRIS" value={techStack.hris} />
          <Field label="ERP" value={techStack.erp} />
          <Field label="Cloud" value={techStack.cloud} />
          <Field label="Est. SaaS Tools" value={techStack.estimatedToolCount} />
        </div>
        {techStack.competitorFlag && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 font-medium mb-2">
            ⚡ {techStack.competitorFlag}
          </div>
        )}
        <div>
          {[...techStack.marketing, ...techStack.collaboration, ...techStack.analytics].map((t, i) => (
            <Badge key={i} label={t} color="bg-gray-100 text-gray-700" />
          ))}
        </div>
      </Section>

      {/* Pain Points */}
      {painPoints.length > 0 && (
        <Section title="Pain Points">
          <div className="space-y-2">
            {painPoints.map((p: any, i: number) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-gray-800">{p.point}</span>
                <span className="text-gray-500 text-xs ml-2">— {p.evidence}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Engagement */}
      {engagement && (
        <Section title="CRM Engagement">
          <div className="grid grid-cols-2 gap-x-8">
            <Field label="In CRM" value={engagement.inCRM ? 'Yes' : 'No'} />
            <Field label="Last Contact" value={engagement.lastContactDate} />
            <Field label="Last Meeting" value={engagement.lastMeetingDate} />
            <Field label="Deal Stage" value={engagement.dealStage} />
            <Field label="Open Opportunity" value={engagement.openOpportunity ? 'Yes' : null} />
            <Field label="Previous Customer" value={engagement.previousCustomer ? 'Yes (churned)' : null} />
          </div>
        </Section>
      )}

      {/* Confidence */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Data confidence: {synthesis.confidenceScore}% · Sources: {card.meta.sourcesUsed.join(', ')}</span>
        <span className="text-xs text-gray-400">{new Date(card.meta.researchedAt).toLocaleString('en-IN')}</span>
      </div>
    </div>
  )
}
