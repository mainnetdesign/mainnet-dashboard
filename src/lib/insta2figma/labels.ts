import type {
  ImportFlowStatus,
  ImportFlowStepStatus,
  ImportFlowStepType,
  JobStatus,
  PlanTier,
  Platform,
} from '@/types/insta2figma'
import { importScrapeSourceLabel } from '@/lib/insta2figma/import-source'

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
  paid: 'Paga',
  pending: 'Pendente',
  refunded: 'Reembolsada',
}

export const TX_TYPE_LABELS: Record<string, string> = {
  subscription: 'Assinatura',
  order: 'Pedido',
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

export function formatJobError(errorCode: string | null, errorMessage: string | null): string {
  const message = errorMessage?.trim()
  const code = errorCode?.trim()
  if (message && code) return `[${code}] ${message}`
  if (message) return message
  if (code) return code
  return 'Erro desconhecido'
}

export const IMPORT_FLOW_STATUS_LABELS: Record<ImportFlowStatus, string> = {
  started: 'Iniciado',
  search_failed: 'Busca falhou',
  import_failed: 'Importação falhou',
  completed: 'Concluído',
  abandoned: 'Abandonado',
}

export const IMPORT_FLOW_STEP_TYPE_LABELS: Record<ImportFlowStepType, string> = {
  search: 'Busca do perfil',
  load_more: 'Carregar mais posts',
  import: 'Importação',
}

export const IMPORT_FLOW_STEP_STATUS_LABELS: Record<ImportFlowStepStatus, string> = {
  running: 'Em execução',
  succeeded: 'Concluído',
  failed: 'Falhou',
}

export const SELECTION_MODE_LABELS: Record<string, string> = {
  recent: 'Posts recentes',
  all: 'Todos os posts',
  custom: 'Seleção manual',
  range: 'Intervalo',
}

export const TIMELINE_ORDER_LABELS: Record<string, string> = {
  newest_first: 'Mais recentes primeiro',
  oldest_first: 'Mais antigos primeiro',
}

export function importFlowStatusLabel(status: ImportFlowStatus | string): string {
  return IMPORT_FLOW_STATUS_LABELS[status as ImportFlowStatus] ?? status
}

export function importFlowStepTypeLabel(stepType: ImportFlowStepType | string): string {
  return IMPORT_FLOW_STEP_TYPE_LABELS[stepType as ImportFlowStepType] ?? stepType
}

export function importFlowStepStatusLabel(status: ImportFlowStepStatus | string): string {
  return IMPORT_FLOW_STEP_STATUS_LABELS[status as ImportFlowStepStatus] ?? status
}

export function selectionModeLabel(mode: string | null | undefined): string {
  if (!mode) return '—'
  return SELECTION_MODE_LABELS[mode] ?? mode.replace(/_/g, ' ')
}

export function timelineOrderLabel(order: string | null | undefined): string {
  if (!order) return '—'
  return TIMELINE_ORDER_LABELS[order] ?? order.replace(/_/g, ' ')
}

export function jobTypeLabel(type: string): string {
  switch (type) {
    case 'SCRAPE_PROFILE':
      return 'Scrape de perfil'
    default:
      return type.replace(/_/g, ' ')
  }
}

export function scrapeEndpointLabel(endpoint: string): string {
  switch (endpoint) {
    case 'profile-preview':
      return 'Preview do perfil'
    case 'feed-pagination':
      return 'Paginação do feed'
    default:
      return endpoint.replace(/_/g, ' ')
  }
}

export const FILTER_ALL = 'Todos'
export const FILTER_ALL_PLATFORMS = 'Todas plataformas'

export const PLATFORM_FILTER_OPTIONS = [
  { value: 'all', label: FILTER_ALL_PLATFORMS },
  { value: 'figma', label: PLATFORM_LABELS.figma },
  { value: 'framer', label: PLATFORM_LABELS.framer },
] as const

export const PLAN_FILTER_OPTIONS = [
  { value: 'all', label: FILTER_ALL },
  { value: 'free', label: PLAN_LABELS.free },
  { value: 'pro', label: PLAN_LABELS.pro },
  { value: 'max', label: PLAN_LABELS.max },
] as const

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos status' },
  { value: 'succeeded', label: JOB_STATUS_LABELS.succeeded },
  { value: 'failed', label: JOB_STATUS_LABELS.failed },
  { value: 'running', label: JOB_STATUS_LABELS.running },
  { value: 'queued', label: JOB_STATUS_LABELS.queued },
  { value: 'canceled', label: JOB_STATUS_LABELS.canceled },
] as const

export const ORIGIN_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas origens' },
  { value: 'worker', label: importScrapeSourceLabel('worker') },
  { value: 'apify', label: importScrapeSourceLabel('apify') },
  { value: 'unknown', label: 'Indefinida' },
] as const
