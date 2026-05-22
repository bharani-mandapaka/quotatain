import axios from 'axios'
import type { CompanyDataProvider, ProviderResult, RawCompanyData } from './base.js'

// NSE India — free API for listed company stock data
export class NseProvider implements CompanyDataProvider {
  readonly name = 'nse'

  async fetch(_domain: string, companyName?: string): Promise<ProviderResult | null> {
    if (!companyName) return null
    try {
      // NSE public quote API — no API key needed for basic data
      const symbol = await this.resolveSymbol(companyName)
      if (!symbol) return null

      const response = await axios.get(
        `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://www.nseindia.com',
          },
          timeout: 8000,
        }
      )

      const info = response.data?.info
      const priceInfo = response.data?.priceInfo
      if (!info) return null

      const marketCapCr = priceInfo?.intraDayHighLow?.value
        ? undefined
        : undefined // NSE doesn't directly expose market cap in this endpoint

      const data: RawCompanyData = {
        nseTicker: symbol,
        stockPriceINR: priceInfo?.lastPrice,
        companyType: 'Public',
        name: info.companyName,
        industry: info.industry,
        hqCountry: 'India',
      }

      return { source: this.name, confidence: 0.8, data, fetchedAt: new Date().toISOString() }
    } catch {
      return null
    }
  }

  private async resolveSymbol(companyName: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `https://www.nseindia.com/api/search/autocomplete?q=${encodeURIComponent(companyName)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.nseindia.com' },
          timeout: 5000,
        }
      )
      const symbols = response.data?.symbols ?? []
      return symbols[0]?.symbol ?? null
    } catch {
      return null
    }
  }
}
