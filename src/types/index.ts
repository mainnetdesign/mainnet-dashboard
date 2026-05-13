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
  realized: boolean
  paymentDate: string | null
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
}
