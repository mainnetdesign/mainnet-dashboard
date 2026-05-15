import { NotionTransaction } from '@/types'

const NOTION_KEY = process.env.NOTION_API_KEY!
const DATABASE_ID = process.env.NOTION_DATABASE_ID!
const NOTION_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

interface NotionPage {
  id: string
  properties: {
    Nome: { title: Array<{ plain_text: string }> }
    Valor: { number: number | null }
    'Valor Previsto': { formula?: { number?: number | null } } | undefined
    Tipo: { select: { name: string } | null }
    Realizado: { checkbox: boolean }
    'Data Pagamento': { date: { start: string } | null }
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
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function fetchAllTransactions(): Promise<NotionTransaction[]> {
  const transactions: NotionTransaction[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const page = await queryPage(cursor)
    for (const result of page.results) {
      const p = result.properties
      const name = p.Nome.title[0]?.plain_text ?? ''
      const value = p.Valor.number ?? 0
      const predictedValue = p['Valor Previsto']?.formula?.number ?? value
      const realized = p.Realizado.checkbox
      const paymentDate = p['Data Pagamento'].date?.start ?? null

      transactions.push({
        id: result.id,
        name,
        value,
        predictedValue,
        realized,
        paymentDate,
      })
    }
    hasMore = page.has_more
    cursor = page.next_cursor ?? undefined
  }

  return transactions
}
