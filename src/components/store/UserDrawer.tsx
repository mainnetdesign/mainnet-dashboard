'use client'

import { RiCloseLine } from '@remixicon/react'
import Badge from '@/components/ds/Badge'
import { DataTable, DataTableTextCell, WidgetCard } from '@/components/ds'
import type { UserDetail } from '@/types/insta2figma'
import { fmtDate, fmtDateTime } from '@/lib/insta2figma/constants'
import {
  jobStatusLabel,
  planLabel,
  platformLabel,
  subscriptionStatusLabel,
} from '@/lib/insta2figma/labels'

type UserDrawerProps = {
  user: UserDetail | null
  loading?: boolean
  onClose: () => void
}

const PLAN_VARIANT = {
  free: 'neutral',
  pro: 'info',
  max: 'success',
} as const

export default function UserDrawer({ user, loading, onClose }: UserDrawerProps) {
  if (!user && !loading) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-stroke-soft-200 bg-bg-white-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-stroke-soft-200 px-5 py-4">
          <h2 className="text-label-lg text-text-strong-950">Detalhes do usuário</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-bg-weak-50">
            <RiCloseLine className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-paragraph-sm text-text-soft-400">Carregando...</p>}

          {user && (
            <div className="space-y-5">
              <WidgetCard>
                <div className="space-y-3">
                  <div>
                    <p className="text-label-md text-text-strong-950">{user.displayName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={PLAN_VARIANT[user.planTier]}>{planLabel(user.planTier)}</Badge>
                      <Badge variant={user.emailVerified ? 'success' : 'warning'}>
                        {user.emailVerified ? 'Verificado' : 'Não verificado'}
                      </Badge>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-paragraph-xs">
                    <div><dt className="text-text-soft-400">Entrou</dt><dd>{fmtDate(user.createdAt)}</dd></div>
                    <div><dt className="text-text-soft-400">Figma ID</dt><dd className="truncate">{user.figmaUserId ?? '—'}</dd></div>
                    <div><dt className="text-text-soft-400">Framer ID</dt><dd className="truncate">{user.framerUserId ?? '—'}</dd></div>
                    <div><dt className="text-text-soft-400">Polar</dt><dd className="truncate">{user.polarCustomerId ?? '—'}</dd></div>
                  </dl>
                  {user.subscription && (
                    <p className="text-paragraph-xs text-text-sub-600">
                      Assinatura {subscriptionStatusLabel(user.subscription.status)} · renova {fmtDate(user.subscription.currentPeriodEnd)}
                    </p>
                  )}
                  {user.usage && (
                    <p className="text-paragraph-xs text-text-sub-600">
                      Uso do período ({user.usage.periodStart}): {user.usage.imagesUsed} imagens
                    </p>
                  )}
                </div>
              </WidgetCard>

              <div>
                <p className="mb-3 text-label-sm text-text-strong-950">Importações ({user.jobs.length})</p>
                <DataTable
                  columns={[
                    {
                      id: 'when',
                      header: 'Horário',
                      width: 130,
                      cell: (j) => <DataTableTextCell>{fmtDateTime(j.createdAt)}</DataTableTextCell>,
                    },
                    {
                      id: 'profile',
                      header: 'Perfil',
                      width: 'flex',
                      cell: (j) => <DataTableTextCell strong>@{j.profileUsername ?? '—'}</DataTableTextCell>,
                    },
                    {
                      id: 'platform',
                      header: 'Plataforma',
                      width: 80,
                      cell: (j) => <DataTableTextCell>{platformLabel(j.platform)}</DataTableTextCell>,
                    },
                    {
                      id: 'images',
                      header: 'Imagens',
                      width: 50,
                      align: 'right',
                      cell: (j) => <DataTableTextCell>{j.imageCount}</DataTableTextCell>,
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      width: 90,
                      cell: (j) => (
                        <Badge variant={j.status === 'succeeded' ? 'success' : j.status === 'failed' ? 'error' : 'neutral'}>
                          {jobStatusLabel(j.status)}
                        </Badge>
                      ),
                    },
                  ]}
                  data={user.jobs}
                  keyExtractor={(j) => j.id}
                  emptyMessage="Nenhum import"
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
