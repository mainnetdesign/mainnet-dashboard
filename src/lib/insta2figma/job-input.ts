import type { ImportJobInput } from '@/types/insta2figma'

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const nums = value.map((item) => readNumber(item)).filter((item): item is number => item != null)
  return nums.length > 0 ? nums : undefined
}

export function parseImportJobInput(raw: unknown): ImportJobInput {
  const input = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const username = readString(input.username) ?? ''

  return {
    username,
    maxPosts: readNumber(input.maxPosts),
    postCount: readNumber(input.postCount),
    selectionMode: readString(input.selectionMode),
    timelineOrder: readString(input.timelineOrder),
    expandCarouselImages:
      typeof input.expandCarouselImages === 'boolean' ? input.expandCarouselImages : undefined,
    ignoreReels: typeof input.ignoreReels === 'boolean' ? input.ignoreReels : undefined,
    startIndex: readNumber(input.startIndex),
    selectedIndices: readNumberArray(input.selectedIndices),
    estimatedImportImages: readNumber(input.estimatedImportImages),
  }
}

export function postsRequestedFromInput(input: ImportJobInput): number | null {
  return input.postCount ?? input.maxPosts ?? input.estimatedImportImages ?? null
}
