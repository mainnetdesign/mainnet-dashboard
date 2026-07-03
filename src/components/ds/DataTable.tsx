'use client'

import { useMemo, useState } from 'react'
import { RiArrowDownSLine, RiArrowUpDownLine, RiArrowUpSLine, RiMore2Line } from '@remixicon/react'
import * as Checkbox from '@/components/ui/checkbox'
import { compareSortValues, type SortDirection } from '@/lib/table-sort'
import { cn } from '@/utils/cn'

export type { SortDirection }

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number | boolean | null | undefined
  width?: number | 'flex' | 'actions'
  align?: 'left' | 'center' | 'right'
  cell: (row: T) => React.ReactNode
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  selectable?: boolean
  selectedKeys?: Set<string>
  onSelectionChange?: (keys: Set<string>) => void
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (columnId: string, direction: SortDirection) => void
  defaultSort?: { columnId: string; direction?: SortDirection }
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

function colWidthStyle(width: DataTableColumn<unknown>['width']) {
  if (width === 'flex') return { flex: '1 1 0%', minWidth: 0 }
  if (width === 'actions') return { width: 64, flexShrink: 0 }
  if (typeof width === 'number') return { width, flexShrink: 0 }
  return { flex: '1 1 0%', minWidth: 0 }
}

function isColumnSortable<T>(col: DataTableColumn<T>) {
  if (col.width === 'actions') return false
  if (col.sortable === false) return false
  return Boolean(col.sortValue)
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSort,
  defaultSort,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  className,
}: DataTableProps<T>) {
  const [internalSortColumn, setInternalSortColumn] = useState<string | undefined>(
    defaultSort?.columnId,
  )
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(
    defaultSort?.direction ?? 'asc',
  )

  const isControlled = controlledSortColumn !== undefined
  const activeSortColumn = isControlled ? controlledSortColumn : internalSortColumn
  const activeSortDirection = controlledSortDirection ?? internalSortDirection

  const sortedData = useMemo(() => {
    if (!activeSortColumn) return data

    const column = columns.find((col) => col.id === activeSortColumn)
    if (!column?.sortValue) return data

    return [...data].sort((a, b) =>
      compareSortValues(column.sortValue!(a), column.sortValue!(b), activeSortDirection),
    )
  }, [activeSortColumn, activeSortDirection, columns, data])

  const allKeys = sortedData.map(keyExtractor)
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k))
  const someSelected = allKeys.some((k) => selectedKeys.has(k))

  function toggleAll() {
    if (!onSelectionChange) return
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(allKeys))
    }
  }

  function toggleRow(key: string) {
    if (!onSelectionChange) return
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectionChange(next)
  }

  function handleSort(columnId: string) {
    const column = columns.find((col) => col.id === columnId)
    if (!column || !isColumnSortable(column)) return

    const nextDirection: SortDirection =
      activeSortColumn === columnId && activeSortDirection === 'asc' ? 'desc' : 'asc'

    if (onSort) {
      onSort(columnId, nextDirection)
    }

    if (!isControlled) {
      setInternalSortColumn(columnId)
      setInternalSortDirection(nextDirection)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-start overflow-hidden rounded-lg bg-bg-weak-50">
        {columns.map((col, i) => {
          const isFirst = i === 0
          const sortable = isColumnSortable(col)
          const isActive = sortable && activeSortColumn === col.id

          return (
            <div
              key={col.id}
              style={colWidthStyle(col.width)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2',
                col.align === 'right' && 'justify-end',
                col.align === 'center' && 'justify-center',
              )}
            >
              {selectable && isFirst && (
                <Checkbox.Root
                  checked={someSelected && !allSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={toggleAll}
                  tone="neutral"
                />
              )}

              {sortable ? (
                <button
                  type="button"
                  onClick={() => handleSort(col.id)}
                  className={cn(
                    'flex min-w-0 items-center gap-0.5 rounded-md text-left transition-colors hover:text-text-strong-950',
                    isActive ? 'text-text-strong-950' : 'text-text-sub-600',
                  )}
                >
                  <span className="truncate text-paragraph-sm">{col.header}</span>
                  {isActive ? (
                    activeSortDirection === 'asc' ? (
                      <RiArrowUpSLine className="size-4 shrink-0" />
                    ) : (
                      <RiArrowDownSLine className="size-4 shrink-0" />
                    )
                  ) : (
                    <RiArrowUpDownLine className="size-4 shrink-0 text-text-soft-400" />
                  )}
                </button>
              ) : (
                <span className="truncate text-paragraph-sm text-text-sub-600">{col.header}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-1">
        {sortedData.length === 0 ? (
          <div className="py-12 text-center text-paragraph-sm text-text-soft-400">{emptyMessage}</div>
        ) : (
          sortedData.map((row) => {
            const key = keyExtractor(row)
            const selected = selectedKeys.has(key)
            const rowInner = (
              <div className="flex items-center">
                {columns.map((col, i) => (
                  <div
                    key={col.id}
                    style={colWidthStyle(col.width)}
                    className={cn(
                      'flex h-12 items-center gap-3 overflow-hidden px-3',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center',
                    )}
                  >
                    {selectable && i === 0 && (
                      <Checkbox.Root
                        checked={selected}
                        onCheckedChange={() => toggleRow(key)}
                        tone="neutral"
                      />
                    )}
                    <div className="min-w-0 flex-1">{col.cell(row)}</div>
                  </div>
                ))}
              </div>
            )

            return (
              <div key={key}>
                {onRowClick ? (
                  <button
                    type="button"
                    onClick={() => onRowClick(row)}
                    className="w-full cursor-pointer rounded-lg text-left transition-colors hover:bg-bg-weak-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
                  >
                    {rowInner}
                  </button>
                ) : (
                  rowInner
                )}
                <div className="mx-0 h-px bg-stroke-soft-200" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/** Célula com avatar/ícone + label — padrão "To / From" do Figma */
export function DataTableUserCell({
  avatar,
  label,
  sublabel,
}: {
  avatar?: React.ReactNode
  label: React.ReactNode
  sublabel?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-paragraph-sm text-text-strong-950">{label}</p>
        {sublabel && (
          <p className="truncate text-paragraph-xs text-text-soft-400">{sublabel}</p>
        )}
      </div>
    </div>
  )
}

/** Ícone circular com borda — padrão Key Icons do Figma */
export function DataTableIconCell({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-stroke-soft-200 bg-bg-white-0 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)]">
        {icon}
      </div>
      <span className="truncate text-paragraph-sm text-text-sub-600">{label}</span>
    </div>
  )
}

export function DataTableActionsCell({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Actions"
      onClick={onClick}
      className="rounded-md p-0.5 text-text-soft-400 transition-colors hover:bg-bg-weak-50 hover:text-text-sub-600"
    >
      <RiMore2Line className="size-5" />
    </button>
  )
}

export function DataTableTextCell({
  children,
  strong,
}: {
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <span
      className={cn(
        'block truncate text-paragraph-sm',
        strong ? 'text-text-strong-950' : 'text-text-sub-600',
      )}
    >
      {children}
    </span>
  )
}
