export interface Collaborator {
  id: string
  name: string
  color: string
  monthlySalary?: number
  hourlyRate?: number // fixed (Djturzin)
}

export interface ClockifyEntry {
  _id: string
  userId: string
  userName: string
  projectId: string | null
  projectName: string | null
  duration: number // seconds
  start: string // ISO
  month: string  // YYYY-MM
}

export interface ProjectCostData {
  projectId: string
  projectName: string
  totalHours: number
  totalCost: number
  costByCollaborator: Record<string, { hours: number; cost: number; name: string; color: string }>
}

export interface CollaboratorSummary {
  id: string
  name: string
  color: string
  totalCost: number
  totalHours: number
  effectiveHourlyRate: number
  percentOfTotal: number
}

export interface NotionTransaction {
  id: string
  name: string
  value: number
  predictedValue: number
  realized: boolean
  paymentDate: string | null
  linkedProjectNames: string[]  // from Notion "Projetos" relation
}

export interface ProjectPL {
  clockifyProjectName: string
  clockifyProjectId: string
  hours: number
  revenue: number
  cost: number
  result: number
  margin: number | null
  status: 'Lucro' | 'Prejuízo' | 'Margem baixa'
  hasAttention: boolean
  isInternal: boolean
}

export interface MonthlyData {
  month: string   // YYYY-MM
  label: string   // "Jan/25"
  cost: number
  revenue: number
  predictedRevenue: number
  result: number
  collaboratorRates: Record<string, number> // userId → effective R$/h for that month
}

export interface ComparisonKPIs {
  totalCost: number
  totalRevenue: number
  netResult: number
  overheadPercent: number
}

export interface AlertItem {
  projectName: string
  type: 'loss' | 'low-margin' | 'no-revenue'
  cost: number
  revenue: number
  result: number
  hours: number
}

export interface DashboardData {
  period: { start: string; end: string }
  totalCost: number
  overheadCost: number
  overheadHours: number
  overheadPercent: number
  mostExpensiveProject: { name: string; cost: number }
  highestCostPerHour: { name: string; rate: number; percentOfTotal: number }
  costByProject: ProjectCostData[]
  collaborators: CollaboratorSummary[]
  totalCostAllCollaborators: number
  pl: ProjectPL[]
  monthly: MonthlyData[]
  comparison: ComparisonKPIs | null
  alerts: AlertItem[]
}
