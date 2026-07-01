'use client'

import { useMemo, useState } from 'react'
import {
  RiArrowLeftDownLine,
  RiGlobalLine,
  RiGroupLine,
} from '@remixicon/react'
import PageHeader from '@/components/shell/PageHeader'
import {
  Avatar,
  Badge,
  DataPagination,
  DataTable,
  DataTableActionsCell,
  DataTableIconCell,
  DataTableTextCell,
  DataTableUserCell,
  FilterBar,
  MetricHeader,
  SectionHeader,
  StatWidget,
  WidgetCard,
} from '@/components/ds'

import { pseudonym, pseudonymInitials } from '@/lib/insta2figma/pseudonym'
import { PLAN_LABELS } from '@/lib/insta2figma/labels'

type DemoUser = {
  id: string
  displayName: string
  plan: 'free' | 'pro' | 'max'
  verified: boolean
  platform: 'figma' | 'framer'
  images: number
  joined: string
}

const DEMO_IDS = ['demo-1', 'demo-2', 'demo-3', 'demo-4', 'demo-5', 'demo-6', 'demo-7']

const DEMO_USERS: DemoUser[] = [
  { id: DEMO_IDS[0], displayName: pseudonym(DEMO_IDS[0]), plan: 'pro', verified: true, platform: 'figma', images: 142, joined: '12 Set' },
  { id: DEMO_IDS[1], displayName: pseudonym(DEMO_IDS[1]), plan: 'free', verified: false, platform: 'framer', images: 8, joined: '10 Set' },
  { id: DEMO_IDS[2], displayName: pseudonym(DEMO_IDS[2]), plan: 'max', verified: true, platform: 'figma', images: 890, joined: '8 Set' },
  { id: DEMO_IDS[3], displayName: pseudonym(DEMO_IDS[3]), plan: 'free', verified: true, platform: 'figma', images: 24, joined: '5 Set' },
  { id: DEMO_IDS[4], displayName: pseudonym(DEMO_IDS[4]), plan: 'pro', verified: true, platform: 'framer', images: 56, joined: '3 Set' },
  { id: DEMO_IDS[5], displayName: pseudonym(DEMO_IDS[5]), plan: 'free', verified: false, platform: 'figma', images: 0, joined: '1 Set' },
  { id: DEMO_IDS[6], displayName: pseudonym(DEMO_IDS[6]), plan: 'free', verified: true, platform: 'framer', images: 12, joined: '28 Ago' },
]

const PLAN_BADGE: Record<DemoUser['plan'], { label: string; variant: 'neutral' | 'info' | 'success' }> = {
  free: { label: PLAN_LABELS.free, variant: 'neutral' },
  pro: { label: PLAN_LABELS.pro, variant: 'info' },
  max: { label: PLAN_LABELS.max, variant: 'success' },
}

export default function DesignSystemPage() {
  const [segment, setSegment] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortCol, setSortCol] = useState<string>()

  const filtered = useMemo(() => {
    let rows = DEMO_USERS
    if (segment === 'verified') rows = rows.filter((u) => u.verified)
    if (segment === 'paid') rows = rows.filter((u) => u.plan !== 'free')
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((u) => u.displayName.toLowerCase().includes(q))
    }
    return rows
  }, [segment, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const columns = useMemo(
    () => [
      {
        id: 'user',
        header: 'Usuário',
        sortable: true,
        width: 'flex' as const,
        cell: (row: DemoUser) => (
          <DataTableUserCell
            avatar={<Avatar initials={pseudonymInitials(row.displayName)} size={32} />}
            label={row.displayName}
            sublabel={row.verified ? 'Verificado' : 'Não verificado'}
          />
        ),
      },
      {
        id: 'plan',
        header: 'Plano',
        width: 100,
        cell: (row: DemoUser) => {
          const p = PLAN_BADGE[row.plan]
          return <Badge variant={p.variant}>{p.label}</Badge>
        },
      },
      {
        id: 'platform',
        header: 'Plataforma',
        width: 160,
        cell: (row: DemoUser) => (
          <DataTableIconCell
            icon={<RiGlobalLine className="size-4 text-text-sub-600" />}
            label={row.platform === 'figma' ? 'Figma' : 'Framer'}
          />
        ),
      },
      {
        id: 'images',
        header: 'Imagens',
        sortable: true,
        width: 100,
        align: 'right' as const,
        cell: (row: DemoUser) => <DataTableTextCell>{row.images}</DataTableTextCell>,
      },
      {
        id: 'joined',
        header: 'Entrou',
        width: 120,
        cell: (row: DemoUser) => <DataTableTextCell>{row.joined}</DataTableTextCell>,
      },
      {
        id: 'actions',
        header: '',
        width: 'actions' as const,
        align: 'center' as const,
        cell: () => <DataTableActionsCell />,
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader title="Sistema de design" />
      <main className="flex flex-col gap-8 p-5">
        <SectionHeader
          title="Widgets e KPIs"
          description="Finance & Banking — node 199682:51655"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatWidget
            label="Saldo total"
            value="$14,480.24"
            delta="+5%"
            deltaVariant="success"
            sparklineData={[12, 18, 14, 22, 19, 28, 24, 32]}
          />
          <StatWidget
            label="Despesas totais"
            value="$6,240.28"
            delta="-2%"
            deltaVariant="error"
            icon={<RiArrowLeftDownLine className="size-5 text-text-sub-600" />}
            sparklineData={[30, 28, 32, 26, 24, 22, 20, 18]}
            sparklinePosition="top"
          />
          <WidgetCard>
            <MetricHeader
              label="Vendas totais"
              value="8,944"
              delta="+2.1%"
              deltaVariant="success"
              suffix="vs. semana passada"
            />
          </WidgetCard>
        </div>

        <SectionHeader
          title="Tabela de usuários"
          description="Transactions [Finance & Banking] — node 3965:46276"
        />

        <FilterBar
          segments={[
            { value: 'all', label: 'Todos' },
            { value: 'verified', label: 'Verificados' },
            { value: 'paid', label: 'Pagantes' },
          ]}
          segmentValue={segment}
          onSegmentChange={(v) => {
            setSegment(v)
            setPage(1)
          }}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          searchPlaceholder="Buscar por nome..."
          onFilterClick={() => {}}
          onSortClick={() => {}}
        />

        <DataTable
          columns={columns}
          data={paged}
          keyExtractor={(r) => r.id}
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          sortColumn={sortCol}
          onSort={setSortCol}
        />

        <DataPagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
        />

        <WidgetCard className="border-dashed">
          <div className="flex items-start gap-3">
            <RiGroupLine className="mt-0.5 size-5 shrink-0 text-text-soft-400" />
            <div>
              <p className="text-label-sm text-text-strong-950">Como usar</p>
              <p className="mt-1 text-paragraph-sm text-text-sub-600">
                Importe de{' '}
                <code className="rounded bg-bg-weak-50 px-1 py-0.5 text-label-xs">@/components/ds</code>.
                Tokens em{' '}
                <code className="rounded bg-bg-weak-50 px-1 py-0.5 text-label-xs">@/lib/design-system/tokens</code>.
                UI primitivos (Input, Button, SegmentedControl) continuam em{' '}
                <code className="rounded bg-bg-weak-50 px-1 py-0.5 text-label-xs">@/components/ui</code>.
              </p>
            </div>
          </div>
        </WidgetCard>
      </main>
    </>
  )
}
