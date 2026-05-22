import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

export class BuiltWithProvider implements CompanyDataProvider {
  readonly name = 'builtwith'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(domain: string): Promise<ProviderResult | null> {
    try {
      const response = await axios.get('https://api.builtwith.com/free1/api.json', {
        params: { KEY: this.apiKey, LOOKUP: domain },
        timeout: 10000,
      })

      const groups = response.data?.Results?.[0]?.Result?.Paths?.[0]?.Technologies ?? []
      const allTechs: string[] = groups.map((t: any) => t.Name).filter(Boolean)

      const data: RawCompanyData = {
        crm: detectFromList(allTechs, CRM_TOOLS),
        ats: detectFromList(allTechs, ATS_TOOLS),
        cloud: detectFromList(allTechs, CLOUD_TOOLS),
        marketingTools: matchAll(allTechs, MARKETING_TOOLS),
        analyticsTools: matchAll(allTechs, ANALYTICS_TOOLS),
        collaborationTools: matchAll(allTechs, COLLAB_TOOLS),
        otherTools: allTechs.slice(0, 20),
        estimatedToolCount: allTechs.length,
      }

      return { source: this.name, confidence: 0.85, data, fetchedAt: new Date().toISOString() }
    } catch (err: any) {
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:builtwith')
      return null
    }
  }
}

function detectFromList(techs: string[], candidates: string[]): string | undefined {
  return candidates.find((c) => techs.some((t) => t.toLowerCase().includes(c.toLowerCase())))
}

function matchAll(techs: string[], candidates: string[]): string[] {
  return candidates.filter((c) => techs.some((t) => t.toLowerCase().includes(c.toLowerCase())))
}

const CRM_TOOLS = ['Salesforce', 'HubSpot', 'Zoho', 'Pipedrive', 'Dynamics']
const ATS_TOOLS = ['Workday', 'Taleo', 'Greenhouse', 'Lever', 'Keka', 'Darwinbox', 'SmartRecruiters']
const CLOUD_TOOLS = ['AWS', 'Google Cloud', 'Azure', 'Cloudflare']
const MARKETING_TOOLS = ['Marketo', 'Pardot', 'Mailchimp', 'CleverTap', 'MoEngage', 'WebEngage', 'Braze']
const ANALYTICS_TOOLS = ['Google Analytics', 'Mixpanel', 'Amplitude', 'Segment', 'Heap', 'Hotjar']
const COLLAB_TOOLS = ['Slack', 'Microsoft Teams', 'Notion', 'Confluence', 'Jira', 'Google Workspace']
