import { USD_BRL_FALLBACK } from '@/config/finance'

export interface UsdBrlRate {
  value: number
  source: 'awesomeapi' | 'fallback'
}

export async function fetchUsdBrl(): Promise<UsdBrlRate> {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`FX ${res.status}`)
    const json = await res.json()
    const value = Number(json?.USDBRL?.bid)
    if (!Number.isFinite(value) || value <= 0) throw new Error('FX inválido')
    return { value, source: 'awesomeapi' }
  } catch {
    return { value: USD_BRL_FALLBACK, source: 'fallback' }
  }
}
