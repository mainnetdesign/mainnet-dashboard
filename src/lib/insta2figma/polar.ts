const POLAR_TOKEN = process.env.POLAR_ACCESS_TOKEN!
const POLAR_ORG_ID = process.env.POLAR_ORGANIZATION_ID!
const POLAR_BASE = 'https://api.polar.sh/v1'

const HEADERS = {
  Authorization: `Bearer ${POLAR_TOKEN}`,
  'Content-Type': 'application/json',
}

export type PolarOrder = {
  id: string
  createdAt: string
  amountUSD: number
  status: string
  /** users.id interno — Polar customer.external_id é setado no checkout como o userId */
  userId: string | null
}

export type PolarSubscription = {
  id: string
  customerId: string | null
  amountUSD: number
  status: string
}

async function fetchAllPages<T>(
  path: string,
  extractItems: (json: { items?: T[] }) => T[],
): Promise<T[]> {
  const items: T[] = []
  let page = 1
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${POLAR_BASE}${path}${sep}page=${page}&limit=100`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Polar API error: ${res.status} ${await res.text()}`)
    const json = await res.json()
    const batch = extractItems(json)
    items.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return items
}

/** Pedidos pagos da organização (receita real) */
export async function fetchPolarOrders(): Promise<PolarOrder[]> {
  const raw = await fetchAllPages<{
    id: string
    created_at: string
    net_amount?: number
    amount?: number
    status: string
    customer?: { external_id?: string | null }
  }>(`/orders?organization_id=${POLAR_ORG_ID}`, (j) => j.items ?? [])

  return raw.map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    amountUSD: (o.net_amount ?? o.amount ?? 0) / 100,
    status: o.status,
    userId: o.customer?.external_id ?? null,
  }))
}

/** Assinaturas ativas (para MRR) */
export async function fetchActivePolarSubscriptions(): Promise<PolarSubscription[]> {
  const raw = await fetchAllPages<{
    id: string
    customer_id?: string | null
    amount?: number
    status: string
  }>(`/subscriptions?organization_id=${POLAR_ORG_ID}&active=true`, (j) => j.items ?? [])

  return raw.map((s) => ({
    id: s.id,
    customerId: s.customer_id ?? null,
    amountUSD: (s.amount ?? 0) / 100,
    status: s.status,
  }))
}
