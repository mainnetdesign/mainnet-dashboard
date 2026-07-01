export type PlanTier = 'free' | 'pro' | 'max'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
export type Platform = 'figma' | 'framer'

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
