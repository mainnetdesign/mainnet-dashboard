/**
 * Maps Notion transaction names → Clockify project names.
 * Key: lowercase substring found in the Notion entry name
 * Value: exact Clockify project name (or null = non-project revenue)
 */
export const NOTION_TO_CLOCKIFY: Record<string, string | null> = {
  // Special patterns
  'week of work': 'Embeddables',
  'embeddables': 'Embeddables',
  'lemon squeezy': 'Embeddables',   // product revenue tied to Embeddables
  'framer partners': null,           // platform revenue — unassigned
  'framer challenge': null,          // one-time competition
  'framer marketplace': null,
  'guimarães': 'Pousio',
  'guimaraes': 'Pousio',
  'careers [mino]': 'MINO',
  'careers': 'MINO',
  'mino framer': 'MINO',
  'hiro film': 'Hiro',
  'san health': 'Sailia',            // update if different project
  'greenpill brasil': 'GreenPill Brasil',
  'green pill': 'Green Pill',
  'yaseen': null,                    // add to Clockify if needed
}

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

/**
 * Extract project name from a Notion transaction name.
 * Strategy:
 * 1. Check manual overrides first
 * 2. Strip week-number prefix (17th, 22nd, etc.)
 * 3. Strip bracketed content like [LP], [Landing Page]
 * 4. Strip fractions (1/2, 2/3, etc.)
 * 5. Strip USD amounts
 * 6. Strip month names + year
 * 7. Return cleaned string
 */
export function extractProjectName(notionName: string): string | null {
  const lower = notionName.toLowerCase()

  // Check manual overrides (longest match first for specificity)
  const sortedKeys = Object.keys(NOTION_TO_CLOCKIFY).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      return NOTION_TO_CLOCKIFY[key]
    }
  }

  let name = notionName

  // Remove ordinal week prefix: "17th", "22nd", "1st", "2nd", etc.
  name = name.replace(/^\d+(st|nd|rd|th)\s+(week of work|and\b)?/i, '').trim()

  // Remove bracketed descriptors: [Landing Page], [LP], [E-Commerce], [Retainer]
  name = name.replace(/\[.*?\]/g, '').trim()

  // Remove fraction patterns: 1/2, 2/3, (1/2), 2/2
  name = name.replace(/\(?\d+\/\d+\)?/g, '').trim()

  // Remove USD amounts: (350 USD), (USD 182.72), 1365 USD
  name = name.replace(/\(?\s*(?:USD\s*[\d.,]+|[\d.,]+\s*USD)\s*\)?/gi, '').trim()

  // Remove month names + optional year
  const monthRegex = new RegExp(
    `\\b(${MONTH_PATTERNS.join('|')})\\.?\\s*(\\d{2,4})?\\b`,
    'gi'
  )
  name = name.replace(monthRegex, '').trim()

  // Remove trailing numbers (like "26" in "Apr 26")
  name = name.replace(/\s+\d{2,4}$/, '').trim()

  // Clean up double spaces
  name = name.replace(/\s+/g, ' ').trim()

  return name || null
}
