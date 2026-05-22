import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

// Tofler.in — Indian company financial data (MCA21 aggregator)
// API docs: https://www.tofler.in/api
export class ToflerProvider implements CompanyDataProvider {
  readonly name = 'tofler'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(_domain: string, companyName?: string): Promise<ProviderResult | null> {
    if (!companyName) return null
    try {
      const searchRes = await axios.get('https://api.tofler.in/company/search', {
        params: { q: companyName, api_key: this.apiKey, limit: 1 },
        timeout: 8000,
      })

      const company = searchRes.data?.companies?.[0]
      if (!company) return null

      // Fetch full profile
      const profileRes = await axios.get(`https://api.tofler.in/company/${company.cin}`, {
        params: { api_key: this.apiKey },
        timeout: 8000,
      })

      const profile = profileRes.data?.company
      if (!profile) return null

      const data: RawCompanyData = {
        cin: profile.cin,
        name: profile.company_name,
        hqCity: profile.registered_address?.city,
        hqState: profile.registered_address?.state,
        hqCountry: 'India',
        companyType: profile.company_type,
        foundedYear: profile.incorporation_date
          ? new Date(profile.incorporation_date).getFullYear()
          : undefined,
        mcaPaidUpCapital: profile.paid_up_capital,
        annualRevenueFromMCA: profile.financials?.revenue,
        netProfitFromMCA: profile.financials?.net_profit,
        directors: profile.directors?.map((d: any) => d.name) ?? [],
      }

      return { source: this.name, confidence: 0.9, data, fetchedAt: new Date().toISOString() }
    } catch (err: any) {
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:tofler')
      return null
    }
  }
}
