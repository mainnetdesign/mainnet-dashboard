import type { ChartConfig } from './types'
import { SERIES_PALETTE } from './catalog'

// Default charts each page opens with (editable; persisted to localStorage on
// first change). Seeded to mirror the charts we already show today.
export const PAGE_PRESETS: Record<string, ChartConfig[]> = {
  overview: [
    {
      id: 'ov-jobs-time',
      title: 'Importações por dia',
      type: 'line',
      size: '2x1',
      dimension: 'time',
      series: [{ measure: 'jobs', color: SERIES_PALETTE[0] }],
    },
    {
      id: 'ov-jobs-platform',
      title: 'Jobs por plataforma',
      type: 'pie',
      size: '1x1',
      dimension: 'platform',
      series: [{ measure: 'jobs', color: SERIES_PALETTE[1] }],
    },
    {
      id: 'ov-users-plan',
      title: 'Usuários por plano',
      type: 'bar',
      size: '1x1',
      dimension: 'plan_tier',
      series: [{ measure: 'users', color: SERIES_PALETTE[2] }],
    },
  ],
  users: [
    {
      id: 'us-users-time',
      title: 'Novos usuários por dia',
      type: 'line',
      size: '2x1',
      dimension: 'time',
      series: [{ measure: 'users', color: SERIES_PALETTE[0] }],
    },
    {
      id: 'us-users-plan',
      title: 'Distribuição por plano',
      type: 'pie',
      size: '1x1',
      dimension: 'plan_tier',
      series: [{ measure: 'users', color: SERIES_PALETTE[3] }],
    },
  ],
  earnings: [
    {
      id: 'ea-jobs-time',
      title: 'Importações por dia',
      type: 'bar',
      size: '2x1',
      dimension: 'time',
      series: [{ measure: 'jobs', color: SERIES_PALETTE[0] }],
    },
  ],
  analytics: [
    {
      id: 'an-events-name',
      title: 'Eventos por tipo',
      type: 'bar',
      size: '2x1',
      dimension: 'event_name',
      series: [{ measure: 'events', color: SERIES_PALETTE[0] }],
    },
    {
      id: 'an-events-platform',
      title: 'Eventos por plataforma',
      type: 'pie',
      size: '1x1',
      dimension: 'platform',
      series: [{ measure: 'events', color: SERIES_PALETTE[4] }],
    },
  ],
}
