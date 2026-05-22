import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

export class NewsApiProvider implements CompanyDataProvider {
  readonly name = 'newsapi'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async fetch(_domain: string, companyName?: string): Promise<ProviderResult | null> {
    if (!companyName) return null
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: `"${companyName}"`,
          from: ninetyDaysAgo,
          sortBy: 'relevancy',
          pageSize: 8,
          language: 'en',
          apiKey: this.apiKey,
        },
        timeout: 8000,
      })

      const articles = response.data?.articles ?? []
      const news = articles.map((a: any) => ({
        headline: a.title,
        url: a.url,
        date: a.publishedAt?.split('T')[0] ?? '',
        source: a.source?.name ?? 'Unknown',
      }))

      const data: RawCompanyData = { recentNews: news }
      return { source: this.name, confidence: 0.7, data, fetchedAt: new Date().toISOString() }
    } catch (err: any) {
      if (err?.response?.status === 429) throw new Error('RATE_LIMITED:newsapi')
      return null
    }
  }
}
