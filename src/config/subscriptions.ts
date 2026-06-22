export interface Subscription {
  id: string
  name: string
  category: 'SaaS IA' | 'Design' | 'Comunicação'
  monthlyBRL: number
}

export const SUBSCRIPTIONS: Subscription[] = [
  // SaaS IA
  { id: 'claude-pro',   name: 'Claude Pro',         category: 'SaaS IA',     monthlyBRL: 119.00 },
  { id: 'cursor-pro',   name: 'Cursor Pro',          category: 'SaaS IA',     monthlyBRL: 119.00 },
  { id: 'cursor-age',   name: 'Cursor AGE',          category: 'SaaS IA',     monthlyBRL:  52.71 },
  { id: 'chatgpt-pro',  name: 'ChatGPT Pro',         category: 'SaaS IA',     monthlyBRL: 119.88 },
  // Design
  { id: 'adobe-cc',     name: 'Adobe CC',            category: 'Design',      monthlyBRL:  95.00 },
  { id: 'framer-pro',   name: 'Framer Pro',          category: 'Design',      monthlyBRL:  75.00 },
  { id: 'figma-team',   name: 'Figma Team',          category: 'Design',      monthlyBRL: 107.80 },
  // Comunicação
  { id: 'google-ws',    name: 'Google Workspace',    category: 'Comunicação', monthlyBRL: 112.00 },
  { id: 'notion',       name: 'Notion',              category: 'Comunicação', monthlyBRL: 129.53 },
  { id: 'slack',        name: 'Slack',               category: 'Comunicação', monthlyBRL:  47.37 },
  { id: 'discord',      name: 'Discord',             category: 'Comunicação', monthlyBRL:  25.00 },
]

export const SUBSCRIPTION_CATEGORIES = ['SaaS IA', 'Design', 'Comunicação'] as const

export function totalMonthlySubscriptions() {
  return SUBSCRIPTIONS.reduce((s, x) => s + x.monthlyBRL, 0)
}
