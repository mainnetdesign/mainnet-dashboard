'use client'
import type { ChartConfig } from './types'

const KEY = (page: string) => `i2f-charts:${page}`

export function loadCharts(page: string, presets: ChartConfig[]): ChartConfig[] {
  if (typeof window === 'undefined') return presets
  try {
    const raw = localStorage.getItem(KEY(page))
    if (!raw) return presets
    const parsed = JSON.parse(raw) as ChartConfig[]
    return Array.isArray(parsed) ? parsed : presets
  } catch {
    return presets
  }
}

export function saveCharts(page: string, configs: ChartConfig[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY(page), JSON.stringify(configs))
}

export function resetCharts(page: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY(page))
}
