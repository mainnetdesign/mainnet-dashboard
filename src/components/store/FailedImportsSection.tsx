'use client'

import {
  Avatar,
  Badge,
  DataTable,
  DataTableTextCell,
  DataTableUserCell,
  WidgetCard,
} from '@/components/ds'
import type { FailedImport, ImportErrorSummary } from '@/types/insta2figma'
import { fmtDateTime } from '@/lib/insta2figma/constants'
import { formatJobError } from '@/lib/insta2figma/labels'
import { pseudonymColor } from '@/lib/insta2figma/pseudonym'
import { PlatformTableCell } from '@/components/store/PlatformIcon'
import ScrapeSourceBadge from '@/components/store/ScrapeSourceBadge'

type FailedImportsSectionProps = {
  failedImports: FailedImport[]
  errorSummary: ImportErrorSummary[]
  onRowClick?: (row: FailedImport) => void
  className?: string
}

export default function FailedImportsSection({
  failedImports,
  errorSummary,
  onRowClick,
  className,
}: FailedImportsSectionProps) {
  return (
    <div className={className}>
      {errorSummary.length > 0 && (
        <WidgetCard className="mb-4">
          <p className="mb-3 text-label-sm text-text-strong-950">Erros por tipo</p>
          <ul className="space-y-2">
            {errorSummary.map((item) => (
              <li
                key={`${item.errorCode ?? 'none'}-${item.errorMessage}`}
                className="flex items-start justify-between gap-3 text-paragraph-sm"
              >
                <span className="min-w-0 break-words font-mono text-text-sub-600">
                  {formatJobError(item.errorCode, item.errorMessage)}
                </span>
                <Badge variant="error" className="shrink-0">
                  {item.count}
                </Badge>
              </li>
            ))}
          </ul>
        </WidgetCard>
      )}

      <WidgetCard>
        <div className="mb-4">
          <p className="text-label-sm text-text-strong-950">Importações com erro</p>
          <p className="mt-0.5 text-paragraph-xs text-text-soft-400">
            Mensagem retornada pelo job (`error_message` / `error_code`)
          </p>
        </div>

        {failedImports.length === 0 ? (
          <p className="py-8 text-center text-paragraph-sm text-text-soft-400">
            Nenhuma importação com erro no período
          </p>
        ) : (
          <DataTable
            columns={[
              {
                id: 'when',
                header: 'Horário',
                width: 130,
                cell: (row) => <DataTableTextCell>{fmtDateTime(row.createdAt)}</DataTableTextCell>,
              },
              {
                id: 'user',
                header: 'Usuário',
                width: 160,
                cell: (row) => (
                  <DataTableUserCell
                    avatar={<Avatar colorKey={pseudonymColor(row.userId)} size={32} />}
                    label={row.displayName}
                  />
                ),
              },
              {
                id: 'profile',
                header: 'Perfil',
                width: 120,
                cell: (row) => (
                  <DataTableTextCell strong>
                    {row.profileUsername ? `@${row.profileUsername}` : '—'}
                  </DataTableTextCell>
                ),
              },
              {
                id: 'platform',
                header: 'Plataforma',
                width: 120,
                cell: (row) => <PlatformTableCell platform={row.platform} />,
              },
              {
                id: 'origin',
                header: 'Origem',
                width: 130,
                cell: (row) => <ScrapeSourceBadge source={row.scrapeSource} />,
              },
              {
                id: 'error',
                header: 'Erro',
                width: 'flex',
                cell: (row) => (
                  <span className="block break-all font-mono text-paragraph-xs text-text-sub-600">
                    {formatJobError(row.errorCode, row.errorMessage)}
                  </span>
                ),
              },
            ]}
            data={failedImports}
            keyExtractor={(row) => row.id}
            onRowClick={onRowClick}
            emptyMessage="Nenhuma importação com erro no período"
          />
        )}
      </WidgetCard>
    </div>
  )
}
