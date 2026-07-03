'use client'

import { RiArrowDownSLine } from '@remixicon/react'
import { cn } from '@/utils/cn'

type FilterSelectOption = {
  value: string
  label: string
}

type FilterSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly FilterSelectOption[] | FilterSelectOption[]
  className?: string
  'aria-label'?: string
}

export default function FilterSelect({
  value,
  onChange,
  options,
  className,
  'aria-label': ariaLabel,
}: FilterSelectProps) {
  return (
    <label
      className={cn(
        'inline-flex items-center rounded-lg border border-stroke-soft-200 bg-bg-white-0 py-2 pl-3 pr-2 text-label-sm text-text-strong-950 transition-colors hover:border-stroke-sub-300',
        className,
      )}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="cursor-pointer appearance-none bg-transparent pr-5 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <RiArrowDownSLine className="pointer-events-none -ml-5 size-4 shrink-0 text-text-soft-400" />
    </label>
  )
}
