'use client'

import { RiArrowUpDownLine, RiMore2Line } from '@remixicon/react'
import * as Checkbox from '@/components/ui/checkbox'
import { cn } from '@/utils/cn'

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  sortable?: boolean
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
  onSort?: (columnId: string) => void
  sortColumn?: string
  emptyMessage?: string
  className?: string
}

function colWidthStyle(width: DataTableColumn<unknown>['width']) {
  if (width === 'flex') return { flex: '1 1 0%', minWidth: 0 }
  if (width === 'actions') return { width: 64, flexShrink: 0 }
  if (typeof width === 'number') return { width, flexShrink: 0 }
  return { flex: '1 1 0%', minWidth: 0 }
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  onSort,
  sortColumn,
  emptyMessage = 'Nenhum registro encontrado',
  className,
}: DataTableProps<T>) {
  const allKeys = data.map(keyExtractor)
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header */}
      <div className="flex items-start overflow-hidden rounded-lg bg-bg-weak-50">
        {columns.map((col, i) => {
          const isFirst = i === 0
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
              <div className="flex min-w-0 items-center gap-0.5">
                <span className="truncate text-paragraph-sm text-text-sub-600">{col.header}</span>
                {col.sortable && onSort && (
                  <button
                    type="button"
                    aria-label={`Sort by ${col.id}`}
                    onClick={() => onSort(col.id)}
                    className={cn(
                      'shrink-0 rounded p-0.5 text-text-soft-400 hover:text-text-sub-600',
                      sortColumn === col.id && 'text-text-strong-950',
                    )}
                  >
                    <RiArrowUpDownLine className="size-5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1">
        {data.length === 0 ? (
          <div className="py-12 text-center text-paragraph-sm text-text-soft-400">{emptyMessage}</div>
        ) : (
          data.map((row) => {
            const key = keyExtractor(row)
            const selected = selectedKeys.has(key)
            return (
              <div key={key}>
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
