import { NotionTransaction } from '@/types'

const NOTION_KEY = process.env.NOTION_API_KEY!
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const NOTION_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const HEADERS = {
  Authorization: `Bearer ${NOTION_KEY}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
}

interface NotionPage {
  id: string
  properties: {
    Nome: { title: Array<{ plain_text: string }> }
    Valor: { number: number | null }
    'Valor Previsto': { formula?: { number?: number | null } } | undefined
    Tipo: { select: { name: string } | null }
    Realizado: { checkbox: boolean }
    'Data Pagamento': { date: { start: string } | null }
    Projetos: { relation: Array<{ id: string }> } | undefined
  }
}

interface NotionQueryResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

async function queryPage(cursor?: string): Promise<NotionQueryResponse> {
  const body: Record<string, unknown> = {
    page_size: 100,
    filter: {
      property: 'Tipo',
      select: { equals: 'Entrada' },
    },
  }
  if (cursor) body.start_cursor = cursor

  const res = await fetch(`${NOTION_BASE}/databases/${DATABASE_ID}/query`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

/** Fetch a single Notion page and return its title (Project name) */
async function fetchProjectPageName(pageId: string): Promise<string | null> {
  try {
    const res = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    // The Projetos database uses "Project name" as the title property
    const titleProp = data.properties?.['Project name'] ?? data.properties?.['Nome']
    return titleProp?.title?.[0]?.plain_text ?? null
  } catch {
    return null
  }
}

/** Batch-fetch project names for a set of page IDs */
async function fetchProjectNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const entries = await Promise.all(
    ids.map(async (id) => {
      const name = await fetchProjectPageName(id)
      return name ? ([id, name] as [string, string]) : null
    })
  )
  return Object.fromEntries(entries.filter(Boolean) as [string, string][])
}

export async function fetchAllTransactions(): Promise<NotionTransaction[]> {
  // Step 1: collect all raw pages across pagination
  const allResults: NotionPage[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const page = await queryPage(cursor)
    allResults.push(...page.results)
    hasMore = page.has_more
    cursor = page.next_cursor ?? undefined
  }

  // Step 2: collect unique project page IDs from the "Projetos" relation
  const projectIdSet = new Set<string>()
  for (const result of allResults) {
    for (const rel of (result.properties.Projetos?.relation ?? [])) {
      projectIdSet.add(rel.id)
    }
  }

  // Step 3: batch-fetch project names (parallel)
  const projectNames = await fetchProjectNames([...projectIdSet])

  // Step 4: build transactions with linked project names
  const transactions: NotionTransaction[] = []
  for (const result of allResults) {
    const p = result.properties
    const name = p.Nome.title[0]?.plain_text ?? ''
    const value = p.Valor.number ?? 0
    const predictedValue = p['Valor Previsto']?.formula?.number ?? value
    const realized = p.Realizado.checkbox
    const paymentDate = p['Data Pagamento'].date?.start ?? null
    const linkedProjectNames = (p.Projetos?.relation ?? [])
      .map((rel) => projectNames[rel.id])
      .filter((n): n is string => Boolean(n))

    transactions.push({
      id: result.id,
      name,
      value,
      predictedValue,
      realized,
      paymentDate,
      linkedProjectNames,
    })
  }

  return transactions
}
