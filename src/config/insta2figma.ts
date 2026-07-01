export const INSTA2FIGMA_PRODUCT = {
  id: 'insta2figma',
  slug: 'insta2figma',
  name: 'Insta2Figma',
  url: 'https://insta2figma.com',
  status: 'active' as const,
}

/** Preços mensais estimados (USD) — ajuste quando Polar estiver integrado */
export const PLAN_PRICING_USD: Record<'pro' | 'max', number> = {
  pro: 12,
  max: 29,
}

/** Custos operacionais manuais — fase 1 do PRD */
export const INSTA2FIGMA_MONTHLY_COSTS_USD = [
  { id: 'railway', label: 'Infra (Railway)', amountUSD: 5 },
  { id: 'scraper', label: 'Scraper (Apify + telefone)', amountUSD: 5 },
] as const

export const USAGE_FUNNEL_EVENTS = [
  { name: 'session_start', label: 'Início de sessão' },
  { name: 'profile_search', label: 'Busca de perfil' },
  { name: 'preview_loaded', label: 'Preview carregado' },
  { name: 'import_started', label: 'Import iniciado' },
  { name: 'import_completed', label: 'Import concluído' },
] as const

export const CONVERSION_FUNNEL_EVENTS = [
  { name: 'preview_limit_reached', label: 'Limite atingido' },
  { name: 'upgrade_overlay_opened', label: 'Upgrade aberto' },
  { name: 'subscription_created', label: 'Assinatura criada' },
] as const

export const FEATURE_TOGGLE_EVENTS = [
  'ignore_reels_toggled',
  'carousel_expand_toggled',
  'selection_mode_changed',
  'post_count_adjusted',
  'load_more_clicked',
] as const

export function monthlyCostsTotalUSD() {
  return INSTA2FIGMA_MONTHLY_COSTS_USD.reduce((s, c) => s + c.amountUSD, 0)
}
