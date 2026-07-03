export type SortDirection = 'asc' | 'desc'

export function compareSortValues(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
  direction: SortDirection,
): number {
  const empty = direction === 'asc' ? 1 : -1
  const av = a ?? null
  const bv = b ?? null

  if (av == null && bv == null) return 0
  if (av == null) return empty
  if (bv == null) return -empty

  if (typeof av === 'number' && typeof bv === 'number') {
    return direction === 'asc' ? av - bv : bv - av
  }

  if (typeof av === 'boolean' && typeof bv === 'boolean') {
    const cmp = Number(av) - Number(bv)
    return direction === 'asc' ? cmp : -cmp
  }

  const cmp = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? cmp : -cmp
}
