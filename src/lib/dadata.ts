/**
 * DaData API helper functions
 * Используют существующие API роуты: /api/dadata/party и /api/dadata/bank
 */

export interface CompanyData {
  name: string
  fullName?: string
  inn: string
  kpp?: string
  ogrn?: string
  address?: string
  management?: {
    name: string
    post: string
  }
}

export interface BankData {
  name: string
  bik: string
  correspondentAccount?: string
  address?: string
}

/**
 * Поиск компании по ИНН через DaData
 */
export async function getCompanyByInn(inn: string): Promise<CompanyData | null> {
  try {
    const response = await fetch('/api/dadata/party', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: inn }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('DaData party API error:', response.status, data)
      throw new Error(data?.error || 'Ошибка запроса к DaData')
    }

    if (data.suggestions?.[0]) {
      const suggestion = data.suggestions[0]
      return {
        name: suggestion.value,
        fullName: suggestion.data?.name?.full_with_opf,
        inn: suggestion.data?.inn,
        kpp: suggestion.data?.kpp,
        ogrn: suggestion.data?.ogrn,
        address: suggestion.data?.address?.value,
        management: suggestion.data?.management ? {
          name: suggestion.data.management.name,
          post: suggestion.data.management.post,
        } : undefined,
      }
    }

    return null
  } catch (error) {
    console.error('Ошибка поиска компании по ИНН:', error)
    throw error
  }
}

/**
 * Поиск банка по БИК через DaData
 */
export async function getBankByBik(bik: string): Promise<BankData | null> {
  try {
    const response = await fetch('/api/dadata/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: bik }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('DaData bank API error:', response.status, data)
      throw new Error(data?.error || 'Ошибка запроса к DaData')
    }

    if (data.suggestions?.[0]) {
      const suggestion = data.suggestions[0]
      return {
        name: suggestion.value,
        bik: suggestion.data?.bic,
        correspondentAccount: suggestion.data?.correspondent_account,
        address: suggestion.data?.address?.value,
      }
    }

    return null
  } catch (error) {
    console.error('Ошибка поиска банка по БИК:', error)
    throw error
  }
}
