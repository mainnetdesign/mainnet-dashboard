/**
 * Maps Notion transaction names → Clockify project names.
 * Key: lowercase substring found in the Notion entry name
 * Value: exact Clockify project name (or null = non-project revenue)
 *
 * Keys are matched by substring (longest key wins). If the mapped value is
 * not null the transaction is always treated as "matched" — even if the
 * project doesn't exist in Clockify (e.g. projects tracked elsewhere).
 */
export const NOTION_TO_CLOCKIFY: Record<string, string | null> = {
  // ── Embeddables platform revenue ────────────────────────────────────────────
  'week of work':       'Embeddables',
  'embeddables':        'Embeddables',
  'lemon squeezy':      'Embeddables',    // product revenue tied to Embeddables

  // ── Framer platform revenue (non-project) ───────────────────────────────────
  'framer partners':    null,
  'framer challenge':   null,
  'framer marketplace': null,

  // ── Named client / project mappings ─────────────────────────────────────────
  'guimarães':          'Pousio',
  'guimaraes':          'Pousio',

  'careers [mino]':     'MINO',          // keep specific before generic
  'mino framer':        'MINO',
  'careers':            'MINO',

  'hiro film':          'Hiro',
  'san health':         'Sailia',

  'greenpill brasil':   'GreenPill Brasil',
  'green pill':         'Green Pill',

  'slides [bluestream]': 'BlueStream',   // keep specific before generic
  'bluestream':         'BlueStream',

  'yaseen':             null,
  'regen rio':          null,

  // ── Projects found in Notion — mapped to Clockify equivalents ───────────────
  'le mirage':          'Le Mirage',
  'eternal creations':  'Eternal Creations',
  'quinta do bispo':    'Quinta do Bispo',
  'juicy telas':        'Juicy Telas',
  'guna':               'Guna',
  'oluwah':             'Oluwah',
  'markado':            'Markado',
  'defiscan':           'Hackathon',
  'hackathon':          'Hackathon',
  'sava':               'SAVA',
  'warux':              'Warux',

  // ── Non-project revenue ──────────────────────────────────────────────────────
  'gumroad':            null,            // platform fee / non-project
  'motion junkei':      null,            // not tracked in Clockify
  'lemon capital':      null,            // not found in Notion or Clockify
}

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Check whether a Notion transaction name matches a known mapping.
 * Returns `{ found: true, value }` when a key is found (value may be null).
 * Returns `{ found: false, value: null }` otherwise.
 *
 * Longer keys are tested first so that "careers [mino]" wins over "careers".
 */
export function getKnownMapping(
  notionName: string
): { found: true; value: string | null } | { found: false; value: null } {
  const lower = notionName.toLowerCase()
  const sortedKeys = Object.keys(NOTION_TO_CLOCKIFY).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return { found: true, value: NOTION_TO_CLOCKIFY[key] }
    }
  }
  return { found: false, value: null }
}

// ─── Month name patterns ──────────────────────────────────────────────────────

/**
 * Month name patterns to strip from Notion entry names
 */
export const MONTH_PATTERNS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  'jan', 'fev', 'mar', 'abr', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez',
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

// ─── Generic bracket descriptors ─────────────────────────────────────────────

/**
 * When a Notion name has the form "Descriptor [ProjectName]", these are the
 * descriptor words that mean the bracket content IS the real project name.
 */
const GENERIC_PREFIXES = new Set([
  'retainer', 'website', 'web', 'web design', 'design', 'branding', 'logo',
  'ui', 'ux', 'app', 'slides', 'video', 'consulting', 'dev', 'development',
  'service', 'project', 'work', 'lp', 'landing page', 'e-commerce', 'ecommerce',
])

// ─── Main extractor ──────────────────────────────────────────────────────────

/**
 * Extract project name from a Notion transaction name.
 *
 * Strategy:
 * 1. Check NOTION_TO_CLOCKIFY manual overrides first (use getKnownMapping).
 * 2. If brackets exist and the prefix is a generic descriptor, use the
 *    bracket content as the project name (e.g. "Retainer [Le Mirage]" → "Le Mirage").
 * 3. Strip ordinal week prefix, bracket content, fractions, USD amounts,
 *    and month names. Return the cleaned string.
 */
export function extractProjectName(notionName: string): string | null {
  // Step 1 — known overrides (handled by getKnownMapping in the route,
  // but kept here too so callers that only use extractProjectName still work)
  const mapping = getKnownMapping(notionName)
  if (mapping.found) return mapping.value

  let name = notionName

  // Step 2 — ordinal week prefix
  name = name.replace(/^\d+(st|nd|rd|th)\s+(week of work|and\b)?/i, '').trim()

  // Step 3 — smart bracket handling
  // If brackets contain a non-generic token, use that content as the project name
  const bracketMatch = name.match(/\[([^\]]+)\]/)
  if (bracketMatch) {
    const inside  = bracketMatch[1].trim()
    const outside = name.replace(/\[.*?\]/g, '').trim().toLowerCase()
    const isGenericPrefix = GENERIC_PREFIXES.has(outside) || outside.split(/\s+/).every((w) => GENERIC_PREFIXES.has(w))
    const isGenericInside = GENERIC_PREFIXES.has(inside.toLowerCase())

    if (isGenericPrefix && !isGenericInside) {
      // "Retainer [Le Mirage]" → "Le Mirage"
      return inside || null
    }
    // Otherwise drop brackets and keep the prefix
    name = name.replace(/\[.*?\]/g, '').trim()
  }

  // Step 4 — fractions
  name = name.replace(/\(?\d+\/\d+\)?/g, '').trim()

  // Step 5 — USD amounts
  name = name.replace(/\(?\s*(?:USD\s*[\d.,]+|[\d.,]+\s*USD)\s*\)?/gi, '').trim()

  // Step 6 — month names + optional year
  const monthRegex = new RegExp(
    `\\b(${MONTH_PATTERNS.join('|')})\\.?\\s*(\\d{2,4})?\\b`,
    'gi'
  )
  name = name.replace(monthRegex, '').trim()

  // Step 7 — trailing standalone numbers
  name = name.replace(/\s+\d{2,4}$/, '').trim()

  // Step 8 — collapse spaces
  name = name.replace(/\s+/g, ' ').trim()

  return name || null
}
