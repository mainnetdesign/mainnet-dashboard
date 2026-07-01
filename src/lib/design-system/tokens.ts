/**
 * Mainnet Design System 2.0 — tokens extraídos do Figma (AlignUI).
 * @see https://www.figma.com/design/GGEt5FY0pIeEaDKd2zTk12
 */

export const dsRadius = {
  4: '4px',
  6: '6px',
  8: '8px',
  10: '10px',
  16: '16px',
  24: '24px',
  full: '999px',
} as const

export const dsShadow = {
  xs: '0 1px 2px 0 rgba(10, 13, 20, 0.03)',
  toggle: '0 6px 10px 0 rgba(14, 18, 27, 0.06), 0 2px 4px 0 rgba(14, 18, 27, 0.03)',
} as const

/** Tipografia — mapeamento Figma → classes Tailwind do projeto */
export const dsTypography = {
  labelXs: 'text-label-xs',
  labelSm: 'text-label-sm',
  labelLg: 'text-label-lg',
  paragraphXs: 'text-paragraph-xs',
  paragraphSm: 'text-paragraph-sm',
  titleH4: 'text-title-h4 font-display',
  titleH5: 'text-title-h5 font-display',
  titleH6: 'text-title-h6 font-display',
  subheading2xs: 'text-subheading-2xs uppercase tracking-wider',
} as const

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'

export const badgeStyles: Record<
  BadgeVariant,
  { bg: string; text: string }
> = {
  success: { bg: 'bg-success-light', text: 'text-success-dark' },
  error: { bg: 'bg-error-light', text: 'text-error-dark' },
  warning: { bg: 'bg-warning-light', text: 'text-warning-dark' },
  info: { bg: 'bg-information-light', text: 'text-information-dark' },
  neutral: { bg: 'bg-bg-soft-200', text: 'text-text-sub-600' },
}
