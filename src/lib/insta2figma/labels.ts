import type { JobStatus, PlanTier, Platform } from '@/types/insta2figma'

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Grátis',
  pro: 'Pro',
  max: 'Max',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  succeeded: 'Concluído',
  failed: 'Falhou',
  running: 'Em execução',
  queued: 'Na fila',
  canceled: 'Cancelado',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  figma: 'Figma',
  framer: 'Framer',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  canceled: 'Cancelada',
  past_due: 'Em atraso',
  trialing: 'Em teste',
  incomplete: 'Incompleta',
}

export const TX_TYPE_LABELS: Record<string, string> = {
  subscription: 'Assinatura',
}

export const FEATURE_LABELS: Record<string, string> = {
  ignore_reels_toggled: 'Ignorar reels',
  carousel_expand_toggled: 'Expandir carrossel',
  selection_mode_changed: 'Modo de seleção',
  post_count_adjusted: 'Ajuste de posts',
  load_more_clicked: 'Carregar mais',
}

export function planLabel(tier: PlanTier): string {
  return PLAN_LABELS[tier] ?? tier
}

export function jobStatusLabel(status: JobStatus | string): string {
  return JOB_STATUS_LABELS[status as JobStatus] ?? status
}

export function platformLabel(platform: Platform | string | null): string {
  if (!platform) return '—'
  return PLATFORM_LABELS[platform as Platform] ?? platform
}

export function subscriptionStatusLabel(status: string): string {
  return SUBSCRIPTION_STATUS_LABELS[status] ?? status
}

export function txTypeLabel(type: string): string {
  return TX_TYPE_LABELS[type] ?? type
}

export function featureLabel(name: string): string {
  return FEATURE_LABELS[name] ?? name.replace(/_/g, ' ')
}

export const FILTER_ALL = 'Todos'

export const PLAN_FILTER_OPTIONS = [
  { value: 'all', label: FILTER_ALL },
  { value: 'free', label: PLAN_LABELS.free },
  { value: 'pro', label: PLAN_LABELS.pro },
  { value: 'max', label: PLAN_LABELS.max },
] as const
