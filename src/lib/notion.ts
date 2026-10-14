import { LedgerEntry, NotionTransaction } from '@/types'

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
    'Data Vencimento'?: { date: { start: string } | null }
    'Categoria padronizada'?: { select: { name: string } | null }
    Projetos: { relation: Array<{ id: string }> } | undefined
  }
}

interface NotionQueryResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

async function queryPage(cursor?: string, filter?: object): Promise<NotionQueryResponse> {
  const body: Record<string, unknown> = { page_size: 100 }
  if (filter) body.filter = filter
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

async function queryAll(filter?: object): Promise<NotionPage[]> {
  const allResults: NotionPage[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const page = await queryPage(cursor, filter)
    allResults.push(...page.results)
    hasMore = page.has_more
    cursor = page.next_cursor ?? undefined
  }
  return allResults
}

/** Todas as transações (entradas e saídas), com valores sempre positivos */
export async function fetchLedger(): Promise<LedgerEntry[]> {
  const allResults = await queryAll()

  return allResults.flatMap((result): LedgerEntry[] => {
    const p = result.properties
    const type = p.Tipo.select?.name
    if (type !== 'Entrada' && type !== 'Saída') return []
    const value = p.Valor.number ?? 0
    const predicted = p['Valor Previsto']?.formula?.number ?? value
    const realized = p.Realizado.checkbox
    return [{
      id: result.id,
      name: p.Nome.title[0]?.plain_text ?? '',
      type,
      amount: Math.abs(realized ? value : predicted),
      realized,
      date: p['Data Pagamento'].date?.start ?? p['Data Vencimento']?.date?.start ?? null,
      category: p['Categoria padronizada']?.select?.name ?? null,
    }]
  })
}

// ── Telas arquivadas (Estúdio) ────────────────────────────────────────────────

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

/** Entradas com os nomes dos projetos vinculados (relação "Projetos") */
export async function fetchAllTransactions(): Promise<NotionTransaction[]> {
  const allResults = await queryAll({ property: 'Tipo', select: { equals: 'Entrada' } })

  const projectIdSet = new Set<string>()
  for (const result of allResults) {
    for (const rel of (result.properties.Projetos?.relation ?? [])) {
      projectIdSet.add(rel.id)
    }
  }
  const projectNames = await fetchProjectNames([...projectIdSet])

  return allResults.map((result) => {
    const p = result.properties
    const value = p.Valor.number ?? 0
    return {
      id: result.id,
      name: p.Nome.title[0]?.plain_text ?? '',
      value,
      predictedValue: p['Valor Previsto']?.formula?.number ?? value,
      realized: p.Realizado.checkbox,
      paymentDate: p['Data Pagamento'].date?.start ?? null,
      linkedProjectNames: (p.Projetos?.relation ?? [])
        .map((rel) => projectNames[rel.id])
        .filter((n): n is string => Boolean(n)),
    }
  })
}
