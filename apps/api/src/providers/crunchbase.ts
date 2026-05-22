import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

const CB_BASE = 'https://api.crunchbase.com/api/v4'

export class CrunchbaseProvider implements CompanyDataProvider {
  readonly name = 'crunchbase'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(domain: string): Promise<ProviderResult | null> {
    try {
      // First: find org by domain
      const searchRes = await axios.post(
        `${CB_BASE}/searches/organizations`,
        {
          field_ids: ['identifier', 'short_description', 'funding_stage', 'total_funding_usd',
                      'last_funding_at', 'last_funding_type', 'num_employees_enum',
                      'location_identifiers', 'founded_on', 'investor_identifiers'],
          query: [{ type: 'predicate', field_id: 'website_url', operator_id: 'domain_eq', values: [domain] }],
          limit: 1,
        },
        {
          headers: { 'X-cb-user-key': this.apiKey },
          timeout: 10000,
        }
      )

      const entity = searchRes.data?.entities?.[0]
      if (!entity) return null

      const props = entity.properties
      const data: RawCompanyData = {
        fundingStage: props.funding_stage?.value,
        totalRaised: props.total_funding_usd,
        lastRoundDate: props.last_funding_at,
        lastRoundStage: props.last_funding_type?.value,
        description: props.short_description,
        hqCity: props.location_identifiers?.find((l: any) => l.location_type === 'city')?.value,
        hqState: props.location_identifiers?.find((l: any) => l.location_type === 'region')?.value,
        hqCountry: props.location_identifiers?.find((l: any) => l.location_type === 'country')?.value,
      }

      return {
        source: this.name,
        confidence: 0.85,
        data,
        fetchedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:crunchbase')
      return null
    }
  }
}
