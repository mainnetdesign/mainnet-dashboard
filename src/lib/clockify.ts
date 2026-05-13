import { ClockifyEntry } from '@/types'
import { COLLABORATOR_IDS } from '@/config/collaborators'

const API_KEY = process.env.CLOCKIFY_API_KEY!
const WORKSPACE_ID = process.env.CLOCKIFY_WORKSPACE_ID!
const REPORTS_BASE = 'https://reports.api.clockify.me/v1'

interface RawEntry {
  _id: string
  userId: string
  userName: string
  projectId: string | null
  projectName: string | null
  timeInterval: {
    start: string
    duration: number
  }
}

interface ReportsResponse {
  totals: Array<{ entriesCount: number }>
  timeentries: RawEntry[]
}

async function fetchPage(
  start: string,
  end: string,
  page: number
): Promise<ReportsResponse> {
  const res = await fetch(
    `${REPORTS_BASE}/workspaces/${WORKSPACE_ID}/reports/detailed`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRangeStart: start,
        dateRangeEnd: end,
        detailedFilter: { page, pageSize: 1000 },
      }),
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    throw new Error(`Clockify API error: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function fetchAllTimeEntries(
  startDate: string,
  endDate: string
): Promise<ClockifyEntry[]> {
  const start = `${startDate}T00:00:00.000Z`
  const end = `${endDate}T23:59:59.999Z`

  // First page to know total
  const first = await fetchPage(start, end, 1)
  const totalEntries = first.totals[0]?.entriesCount ?? 0
  const totalPages = Math.ceil(totalEntries / 1000)

  let rawEntries: RawEntry[] = [...first.timeentries]

  // Fetch remaining pages in parallel
  if (totalPages > 1) {
    const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const results = await Promise.all(pages.map((p) => fetchPage(start, end, p)))
    for (const r of results) rawEntries = rawEntries.concat(r.timeentries)
  }

  // Filter to our 6 collaborators and normalize
  return rawEntries
    .filter((e) => COLLABORATOR_IDS.has(e.userId))
    .map((e) => {
      const entryStart = new Date(e.timeInterval.start)
      const month = `${entryStart.getFullYear()}-${String(entryStart.getMonth() + 1).padStart(2, '0')}`
      return {
        _id: e._id,
        userId: e.userId,
        userName: e.userName,
        projectId: e.projectId,
        projectName: e.projectName,
        duration: e.timeInterval.duration,
        start: e.timeInterval.start,
        month,
      }
    })
}

export async function fetchProjects(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(
    `https://api.clockify.me/api/v1/workspaces/${WORKSPACE_ID}/projects?limit=100`,
    {
      headers: { 'X-Api-Key': API_KEY },
      cache: 'no-store',
    }
  )
  if (!res.ok) throw new Error(`Clockify projects error: ${res.status}`)
  const data = await res.json()
  return data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))
}
