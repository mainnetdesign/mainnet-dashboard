'use client'

import { RiArrowUpDownLine, RiFilter3Line, RiSearch2Line } from '@remixicon/react'
import * as SegmentedControl from '@/components/ui/segmented-control'
import { cn } from '@/utils/cn'

type FilterBarProps = {
  segments?: { value: string; label: string }[]
  segmentValue?: string
  onSegmentChange?: (value: string) => void
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  onFilterClick?: () => void
  sortLabel?: string
  onSortClick?: () => void
  className?: string
}

export default function FilterBar({
  segments,
  segmentValue,
  onSegmentChange,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  onFilterClick,
  sortLabel = 'Ordenar por',
  onSortClick,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-start gap-3', className)}>
      {segments && segments.length > 0 && onSegmentChange && (
        <SegmentedControl.Root
          value={segmentValue}
          onValueChange={onSegmentChange}
          className="w-full max-w-xs"
        >
          <SegmentedControl.List>
            {segments.map((seg) => (
              <SegmentedControl.Trigger key={seg.value} value={seg.value}>
                {seg.label}
              </SegmentedControl.Trigger>
            ))}
          </SegmentedControl.List>
        </SegmentedControl.Root>
      )}

      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        {onSearchChange && (
          <div className="relative w-full max-w-[300px]">
            <RiSearch2Line className="pointer-events-none absolute left-2.5 top-1/2 size-5 -translate-y-1/2 text-text-soft-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-10 pr-2 text-paragraph-sm text-text-strong-950 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] outline-none placeholder:text-text-soft-400 focus:border-stroke-sub-300"
            />
          </div>
        )}

        {onFilterClick && (
          <button
            type="button"
            onClick={onFilterClick}
            className="inline-flex items-center gap-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-2 text-label-sm text-text-sub-600 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] transition-colors hover:bg-bg-weak-50"
          >
            <RiFilter3Line className="size-5" />
            Filtrar
          </button>
        )}

        {onSortClick && (
          <button
            type="button"
            onClick={onSortClick}
            className="inline-flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-2.5 pr-2 text-paragraph-sm text-text-sub-600 shadow-[0_1px_2px_0_rgba(10,13,20,0.03)] transition-colors hover:bg-bg-weak-50"
          >
            <RiArrowUpDownLine className="size-5" />
            {sortLabel}
          </button>
        )}
      </div>
    </div>
  )
}
