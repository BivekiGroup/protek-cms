import axios from 'axios'

export interface TrinityBrandItem {
  article: string
  producer: string
  ident: string
}

export interface TrinityBrandSearchResult {
  count: number
  data: TrinityBrandItem[]
}

export interface TrinityOfferRaw {
  caption: string
  code: string
  currency: string
  dataprice?: string
  product_code?: string
  price: string | number
  producer: string
  bra_id?: string
  rest: string | number
  minOrderCount?: string | number
  deliverydays?: string // like "0/1"
  stock?: string
  source?: string
  store?: string
  quickDelivery?: string
  safety_code?: string
  safety_desc?: string
  bid?: string
  outputTime?: string
}

export interface TrinityOfferSearchResult {
  count: number
  data: (TrinityOfferRaw | string)[]
}

type OnlineFlag = 'allow' | 'disallow'
type CrossesFlag = 'allow' | 'disallow'

export interface TrinityConfig {
  clientCode?: string
  onlyStock?: boolean
  online?: OnlineFlag
  crosses?: CrossesFlag
  includeStocks?: '0' | '1'
}

class TrinityService {
  private readonly baseUrl: string
  private readonly defaultClientCode: string

  constructor() {
    this.baseUrl = 'https://trinity-parts.ru/httpws/hs'
    // default from env with fallback to provided key
    this.defaultClientCode = process.env.TRINITY_CLIENT_CODE || 'e75d0b169ffeb90d4b805790ce68a239'
  }

  private getClientCode(override?: string): string {
    return (override && override.trim()) || this.defaultClientCode
  }

  async searchBrandsByCode(code: string, cfg?: TrinityConfig): Promise<TrinityBrandItem[]> {
    const url = `${this.baseUrl}/search/byCode`
    const payload = {
      clientCode: this.getClientCode(cfg?.clientCode),
      searchCode: code,
      online: cfg?.online || 'allow',
    }
    const resp = await axios.post(url, payload, { timeout: 10000, headers: { 'Content-Type': 'application/json' } })
    const data = resp.data as TrinityBrandSearchResult
    if (!data || !Array.isArray(data.data)) return []
    return data.data
  }

  async searchItemsByCodeBrand(code: string, brand: string, cfg?: TrinityConfig): Promise<TrinityOfferRaw[]> {
    const url = `${this.baseUrl}/search/byCodeBrand`
    const payload: any = {
      clientCode: this.getClientCode(cfg?.clientCode),
      searchCode: { [code]: brand },
      onlyStock: cfg?.onlyStock ? '1' : '0',
      crosses: cfg?.crosses || 'disallow',
      online: cfg?.online || 'allow',
    }
    if (cfg?.includeStocks) {
      payload.includeStocks = cfg.includeStocks
    }
    const resp = await axios.post(url, payload, { timeout: 15000, headers: { 'Content-Type': 'application/json' } })
    const data = resp.data as TrinityOfferSearchResult
    if (!data || !Array.isArray(data.data)) return []
    // Filter out possible trailing message strings
    return data.data.filter((item: any) => typeof item === 'object') as TrinityOfferRaw[]
  }
}

export const trinityService = new TrinityService()
