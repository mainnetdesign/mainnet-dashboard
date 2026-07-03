import type { ImportScrapeSource } from '@/types/insta2figma'

const WORKER_SOURCES = new Set(['instagram_web_profile_info'])

export function resolveImportScrapeSource(
  resultSummarySource: string | null | undefined,
  errorMessage: string | null | undefined,
  errorCode: string | null | undefined,
): ImportScrapeSource {
  const src = resultSummarySource?.trim().toLowerCase() ?? ''
  const err = errorMessage?.trim().toLowerCase() ?? ''
  const code = errorCode?.trim().toLowerCase() ?? ''

  if (src.includes('apify') || err.includes('apify') || code.includes('apify')) {
    return 'apify'
  }

  if (src && (WORKER_SOURCES.has(src) || src.startsWith('instagram_web'))) {
    return 'worker'
  }

  if (src) return 'worker'

  return 'unknown'
}

export function importScrapeSourceLabel(source: ImportScrapeSource): string {
  switch (source) {
    case 'worker':
      return 'Worker'
    case 'apify':
      return 'Apify'
    default:
      return '—'
  }
}

const APIFY_SOURCE_SQL = `(
  LOWER(COALESCE(j.result_summary->>'source', '')) LIKE '%apify%'
  OR LOWER(COALESCE(j.error_message, '')) LIKE '%apify%'
  OR LOWER(COALESCE(j.error_code, '')) LIKE '%apify%'
)`

/** SQL fragment matching resolveImportScrapeSource — keep in sync. */
export function importSourceSqlCondition(origin: ImportScrapeSource): string {
  switch (origin) {
    case 'apify':
      return APIFY_SOURCE_SQL
    case 'worker':
      return `NOT ${APIFY_SOURCE_SQL} AND COALESCE(TRIM(j.result_summary->>'source'), '') <> ''`
    case 'unknown':
      return `NOT ${APIFY_SOURCE_SQL} AND COALESCE(TRIM(j.result_summary->>'source'), '') = ''`
  }
}
