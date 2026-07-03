export type PlanTier = 'free' | 'pro' | 'max'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

/** Job statuses + pre-job search activity shown in the imports table. */
export type ImportActivityStatus = JobStatus | 'searching' | 'searched'
export type Platform = 'figma' | 'framer'
export type ImportScrapeSource = 'worker' | 'apify' | 'unknown'

export type Insta2FigmaService = {
  id: string
  name: string
  slug: string
  url: string
  status: 'active' | 'draft' | 'paused'
  mrrUSD: number
  users: number
  mrrDeltaPct: number
  earningsSparkline: number[]
}

export type ServicesHubData = {
  mrrUSD: number
  totalUsers: number
  monthRevenueUSD: number
  services: Insta2FigmaService[]
}

export type OverviewDailyPoint = {
  date: string
  label: string
  value: number
}

/** Novos usuários por dia, divididos por exportação */
export type OverviewUserDayPoint = {
  date: string
  label: string
  exported: number
  neverExported: number
  value: number
}

export type OverviewSeries = {
  earnings: OverviewDailyPoint[]
  users: OverviewUserDayPoint[]
  images: OverviewDailyPoint[]
  jobs: OverviewDailyPoint[]
}

export type OverviewKPIs = {
  earningsUSD: number
  earningsDeltaPct: number
  users: number
  usersDeltaPct: number
  imagesImported: number
  imagesDeltaPct: number
  jobsInPeriod: number
  series: OverviewSeries
}

export type RecentJob = {
  id: string
  userId: string
  displayName: string
  createdAt: string
  platform: string
  profileUsername: string | null
  imageCount: number
  status: JobStatus
}

export type OverviewData = {
  kpis: OverviewKPIs
  recentJobs: RecentJob[]
  attentionPoints: OverviewAttentionPoint[]
}

export type OverviewAttentionSeverity = 'error' | 'warning' | 'info'

export type OverviewAttentionPoint = {
  id: string
  severity: OverviewAttentionSeverity
  title: string
  description: string
  href?: string
}

export type UserRow = {
  id: string
  displayName: string
  planTier: PlanTier
  emailVerified: boolean
  platform: Platform | null
  imagesUsed: number
  createdAt: string
  lastImportAt: string | null
}

export type UsersSeries = {
  cumulative: OverviewDailyPoint[]
  active: OverviewDailyPoint[]
  newUsers: OverviewDailyPoint[]
  conversions: OverviewDailyPoint[]
}

export type UsersKPIs = {
  total: number
  active: number
  activeDeltaPct: number
  newInPeriod: number
  newDeltaPct: number
  paidConversionPct: number
  conversionDeltaPct: number
  series: UsersSeries
}

export type UsersListData = {
  kpis: UsersKPIs
  users: UserRow[]
  total: number
}

export type UserJob = {
  id: string
  createdAt: string
  platform: string
  profileUsername: string | null
  status: JobStatus
  imageCount: number
  durationMs: number | null
  errorMessage: string | null
}

export type UserDetail = {
  id: string
  displayName: string
  emailVerified: boolean
  planTier: PlanTier
  figmaUserId: string | null
  framerUserId: string | null
  googleId: string | null
  polarCustomerId: string | null
  createdAt: string
  subscription: {
    status: string
    productId: string
    currentPeriodEnd: string
  } | null
  usage: {
    periodStart: string
    imagesUsed: number
  } | null
  jobs: UserJob[]
}

export type EarningsTransaction = {
  id: string
  date: string
  type: string
  displayName: string | null
  amountUSD: number
  earningsUSD: number
  status: string
}

export type EarningsData = {
  revenueUSD: number
  costsUSD: number
  netUSD: number
  revenueDeltaPct: number
  chart: { month: string; revenue: number; costs: number; net: number }[]
  transactions: EarningsTransaction[]
}

export type FunnelStep = {
  name: string
  label: string
  count: number
  rateFromPrev: number | null
}

export type AnalyticsData = {
  usageFunnel: FunnelStep[]
  conversionFunnel: FunnelStep[]
  insights: {
    sessions: number
    avgSessionMinutes: number
    importCompletionRate: number
    importAbandonRate: number
    previewPrivateAccount: number
    previewLimitReached: number
    featureToggles: { name: string; count: number }[]
  }
  topProfiles: { username: string; searches: number }[]
  platformBreakdown: { platform: string; count: number }[]
}

export type ProfileImportRank = {
  username: string
  imports: number
  images: number
}

export type FailedImport = {
  id: string
  userId: string
  displayName: string
  createdAt: string
  platform: string
  profileUsername: string | null
  scrapeSource: ImportScrapeSource
  errorCode: string | null
  errorMessage: string | null
}

export type ImportErrorSummary = {
  errorCode: string | null
  errorMessage: string
  count: number
}

export type ImportsSeries = {
  imports: OverviewDailyPoint[]
  images: OverviewDailyPoint[]
  avgPerImport: OverviewDailyPoint[]
  failed: OverviewDailyPoint[]
}

export type ImportsKPIs = {
  totalImports: number
  totalImages: number
  avgImagesPerImport: number
  failedImports: number
  failureRatePct: number
  importsDeltaPct: number
  imagesDeltaPct: number
  avgDeltaPct: number
  failedDeltaPct: number
  series: ImportsSeries
}

export type ImportsData = {
  kpis: ImportsKPIs
  topProfiles: ProfileImportRank[]
  failedImports: FailedImport[]
  errorSummary: ImportErrorSummary[]
}

export type ImportFlowStatus =
  | 'started'
  | 'search_failed'
  | 'import_failed'
  | 'completed'
  | 'abandoned'

export type ImportFlowStepType = 'search' | 'load_more' | 'import'

export type ImportFlowStepStatus = 'running' | 'succeeded' | 'failed'

export type ImportJobInput = {
  username: string
  maxPosts?: number
  postCount?: number
  selectionMode?: string
  timelineOrder?: string
  expandCarouselImages?: boolean
  ignoreReels?: boolean
  startIndex?: number
  selectedIndices?: number[]
  estimatedImportImages?: number
}

export type ImportFlowStepAttempt = {
  id: string
  attemptOrder: number
  source: string
  status: ImportFlowStepStatus
  httpStatus: number | null
  errorKind: string | null
  errorMessage: string | null
  sessionAccount: string | null
  proxyUsed: boolean
  retryCount: number
  postsRequested: number | null
  postsReturned: number | null
  billable: boolean
  costUsd: number
  durationMs: number
  startedAt: string
  finishedAt: string | null
}

export type ImportFlowStep = {
  id: string
  stepOrder: number
  stepType: ImportFlowStepType
  status: ImportFlowStepStatus
  previewPage: number | null
  postsReturned: number | null
  imagesImported: number | null
  costUsd: number
  durationMs: number
  errorCode: string | null
  errorMessage: string | null
  jobId: string | null
  startedAt: string
  finishedAt: string | null
  attempts: ImportFlowStepAttempt[]
}

export type ImportFlowSummary = {
  id: string
  status: ImportFlowStatus
  totalCostUsd: number
  totalDurationMs: number
  finishedAt: string | null
  steps: ImportFlowStep[]
  /** True when reconstructed from analytics events + scrape telemetry (import_flows tables are empty). */
  synthesized?: boolean
}

export type IgProfileSnapshot = {
  username: string
  fullName: string | null
  followerCount: number
  followingCount: number
  mediaCount: number
  isPrivate: boolean
  isVerified: boolean
  catalogComplete: boolean
  lastScrapedAt: string | null
}

export type ScrapeTelemetryEntry = {
  id: string
  endpoint: string
  statusCode: number
  latencyMs: number
  cacheHit: boolean
  proxyUsed: boolean
  sessionAccount: string | null
  errorKind: string | null
  retryCount: number
  createdAt: string
}

export type FlowTelemetryStats = {
  endpoint: string
  total: number
  cacheHits: number
  authErrors: number
  notFound: number
  network: number
  otherErrors: number
  avgLatencyMs: number
}

export type FlowJourneyData = {
  /** Aggregate event counts (event_name -> count) for the range. */
  events: Record<string, number>
  telemetry: FlowTelemetryStats[]
  jobsByStatus: Record<string, number>
  /** Which scraper won per job (worker succeeded vs apify fallback). */
  gates: { worker: number; apify: number; unknown: number }
  failedByCode: { code: string; count: number }[]
}

export type FlowNodeOccurrence = {
  id: string
  when: string
  title: string
  detail: string | null
  status: 'ok' | 'error' | 'warning' | 'neutral'
}

export type FlowNodeDetail =
  | { kind: 'jobs'; total: number; jobs: ImportJobRow[] }
  | { kind: 'occurrences'; occurrences: FlowNodeOccurrence[] }

export type ImportJobRow = {
  id: string
  userId: string
  displayName: string
  planTier: PlanTier
  createdAt: string
  platform: string
  profileUsername: string | null
  imageCount: number
  postsRequested: number | null
  durationMs: number | null
  status: ImportActivityStatus
  jobType: string
  scrapeSource: ImportScrapeSource
  errorCode: string | null
  errorMessage: string | null
}

export type ImportsJobsList = {
  jobs: ImportJobRow[]
  total: number
}

export type ImportJobDetail = {
  id: string
  userId: string
  displayName: string
  planTier: PlanTier
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  durationMs: number | null
  platform: string
  profileUsername: string | null
  imageCount: number
  postsRequested: number | null
  status: JobStatus
  jobType: string
  scrapeSource: ImportScrapeSource
  resultSummarySource: string | null
  input: ImportJobInput
  errorCode: string | null
  errorMessage: string | null
  flow: ImportFlowSummary | null
  igProfile: IgProfileSnapshot | null
  scrapeTelemetry: ScrapeTelemetryEntry[]
}
