'use client'

import {
  RiArrowDownSLine,
  RiArrowLeftDoubleLine,
  RiArrowLeftSLine,
  RiArrowRightDoubleLine,
  RiArrowRightSLine,
} from '@remixicon/react'
import { cn } from '@/utils/cn'

type DataPaginationProps = {
  page: number
  totalPages: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

function buildPageItems(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: (number | 'ellipsis')[] = [1]

  if (page > 3) items.push('ellipsis')

  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  for (let i = start; i <= end; i++) items.push(i)

  if (page < totalPages - 2) items.push('ellipsis')

  items.push(totalPages)
  return items
}

function PageCell({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex min-w-8 items-center justify-center rounded-lg p-1.5 text-label-sm transition-colors',
        active
          ? 'bg-bg-weak-50 text-text-sub-600'
          : 'border border-stroke-soft-200 bg-bg-white-0 text-text-sub-600 hover:bg-bg-weak-50',
      )}
    >
      {children}
    </button>
  )
}

function NavButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-1.5 text-text-sub-600 transition-colors hover:bg-bg-weak-50 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export default function DataPagination({
  page,
  totalPages,
  pageSize,
  pageSizeOptions = [7, 10, 25, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: DataPaginationProps) {
  const items = buildPageItems(page, totalPages)

  return (
    <div className={cn('flex flex-wrap items-center gap-6', className)}>
      <p className="w-[200px] shrink-0 text-paragraph-sm text-text-sub-600">
        Página {page} de {totalPages}
      </p>

      <div className="flex flex-1 items-center justify-center gap-2">
        <NavButton label="Primeira página" onClick={() => onPageChange(1)} disabled={page <= 1}>
          <RiArrowLeftDoubleLine className="size-5" />
        </NavButton>
        <NavButton label="Página anterior" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <RiArrowLeftSLine className="size-5" />
        </NavButton>

        <div className="flex items-center gap-2">
          {items.map((item, i) =>
            item === 'ellipsis' ? (
              <PageCell key={`e-${i}`}>...</PageCell>
            ) : (
              <PageCell
                key={item}
                active={item === page}
                onClick={() => onPageChange(item)}
              >
                {item}
              </PageCell>
            ),
          )}
        </div>

        <NavButton
          label="Próxima página"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <RiArrowRightSLine className="size-5" />
        </NavButton>
        <NavButton
          label="Última página"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <RiArrowRightDoubleLine className="size-5" />
        </NavButton>
      </div>

      {onPageSizeChange && (
        <div className="flex w-[200px] shrink-0 justify-end">
          <label className="flex items-center gap-0.5 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-1.5 pl-2.5 pr-1.5 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="cursor-pointer appearance-none bg-transparent pr-5 text-paragraph-sm text-text-sub-600 outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n} / página
                </option>
              ))}
            </select>
            <RiArrowDownSLine className="pointer-events-none -ml-5 size-5 text-text-soft-400" />
          </label>
        </div>
      )}
    </div>
  )
}
