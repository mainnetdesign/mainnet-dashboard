import { Pool, type QueryResultRow } from 'pg'

let pool: Pool | null = null

function getConnectionString() {
  const url = process.env.INSTA2FIGMA_DATABASE_URL
  if (!url) {
    throw new Error('INSTA2FIGMA_DATABASE_URL is not configured')
  }
  return url
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

export async function i2fQuery<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params)
}
