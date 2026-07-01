'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiCalendarLine,
} from '@remixicon/react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  CLOCKIFY_MIN_DATE,
  clampStart,
  DATE_RANGE_PRESETS,
  formatMonthYear,
  formatRangeLabel,
  matchPreset,
  toDateStr,
  type DateRangePresetId,
} from '@/lib/date-range'

interface Props {
  start: string
  end: string
  onChange: (start: string, end: string) => void
  minDate?: string
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function CalendarMonth({
  month,
  minDate,
  rangeStart,
  rangeEnd,
  onDayClick,
  onPrev,
  onNext,
  showPrev,
  showNext,
}: {
  month: Date
  minDate: string
  rangeStart: string
  rangeEnd: string
  onDayClick: (day: Date) => void
  onPrev?: () => void
  onNext?: () => void
  showPrev?: boolean
  showNext?: boolean
}) {
  const monthStart = startOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const min = parseISO(minDate)

  return (
    <div className="w-[252px] px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        {showPrev ? (
          <button
            type="button"
            onClick={onPrev}
            className="flex size-7 items-center justify-center rounded-md text-text-soft-400 hover:bg-bg-weak-50 hover:text-text-strong-950"
            aria-label="Mês anterior"
          >
            <RiArrowLeftSLine className="size-4" />
          </button>
        ) : (
          <span className="size-7" />
        )}
        <p className="text-label-sm text-text-strong-950">{formatMonthYear(month)}</p>
        {showNext ? (
          <button
            type="button"
            onClick={onNext}
            className="flex size-7 items-center justify-center rounded-md text-text-soft-400 hover:bg-bg-weak-50 hover:text-text-strong-950"
            aria-label="Próximo mês"
          >
            <RiArrowRightSLine className="size-4" />
          </button>
        ) : (
          <span className="size-7" />
        )}
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex h-8 items-center justify-center text-label-xs text-text-soft-400">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth()
          const disabled = isBefore(day, min)
          const ds = toDateStr(day)
          const selectedStart = rangeStart && ds === rangeStart
          const selectedEnd = rangeEnd && ds === rangeEnd
          const selected = selectedStart || selectedEnd
          const inRange =
            rangeStart &&
            rangeEnd &&
            isWithinInterval(day, {
              start: parseISO(rangeStart < rangeEnd ? rangeStart : rangeEnd),
              end: parseISO(rangeStart < rangeEnd ? rangeEnd : rangeStart),
            })

          return (
            <button
              key={ds}
              type="button"
              disabled={disabled || !inMonth}
              onClick={() => onDayClick(day)}
              className={[
                'relative flex h-8 w-full items-center justify-center text-label-sm transition-colors',
                !inMonth && 'invisible',
                disabled && inMonth && 'cursor-not-allowed text-text-disabled-300',
                !disabled && inMonth && !selected && !inRange && 'text-text-strong-950 hover:bg-bg-weak-50',
                inRange && !selected && 'bg-primary-lighter text-text-strong-950',
                selected && 'rounded-md bg-primary-base font-medium text-text-white-0',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ start, end, onChange, minDate }: Props) {
  const min = minDate ?? CLOCKIFY_MIN_DATE
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(start)
  const [draftEnd, setDraftEnd] = useState(end)
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(parseISO(start)))
  const rootRef = useRef<HTMLDivElement>(null)

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth])
  const activePreset = useMemo(() => matchPreset(start, end, min), [start, end, min])
  const buttonLabel = useMemo(() => formatRangeLabel(start, end, min), [start, end, min])

  useEffect(() => {
    if (!open) return
    setDraftStart(start)
    setDraftEnd(end)
    setLeftMonth(startOfMonth(parseISO(end || start)))
  }, [open, start, end])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const applyPreset = useCallback(
    (id: DateRangePresetId) => {
      const preset = DATE_RANGE_PRESETS.find((p) => p.id === id)
      if (!preset) return
      const range = preset.get(min)
      onChange(range.start, range.end)
      setOpen(false)
    },
    [min, onChange],
  )

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const preset = DATE_RANGE_PRESETS.find(
        (p) => p.shortcut.toLowerCase() === e.key.toLowerCase(),
      )
      if (preset) {
        e.preventDefault()
        applyPreset(preset.id)
      }
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, applyPreset])

  function handleDayClick(day: Date) {
    const ds = toDateStr(day)
    if (ds < min) return

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(ds)
      setDraftEnd('')
      return
    }

    let nextStart = draftStart
    let nextEnd = ds
    if (isBefore(parseISO(nextEnd), parseISO(nextStart))) {
      ;[nextStart, nextEnd] = [nextEnd, nextStart]
    }

    nextStart = clampStart(nextStart, min)
    onChange(nextStart, nextEnd)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-label-sm text-text-strong-950 transition-colors hover:border-stroke-sub-300"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <RiCalendarLine className="size-4 text-text-sub-600" />
        <span>{buttonLabel}</span>
        {open ? (
          <RiArrowUpSLine className="size-4 text-text-soft-400" />
        ) : (
          <RiArrowDownSLine className="size-4 text-text-soft-400" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-[0_12px_32px_rgba(14,18,27,0.12)]">
          <CalendarMonth
            month={leftMonth}
            minDate={min}
            rangeStart={draftStart}
            rangeEnd={draftEnd}
            onDayClick={handleDayClick}
            showPrev
            onPrev={() => setLeftMonth((m) => subMonths(m, 1))}
          />

          <div className="w-px bg-stroke-soft-200" />

          <CalendarMonth
            month={rightMonth}
            minDate={min}
            rangeStart={draftStart}
            rangeEnd={draftEnd}
            onDayClick={handleDayClick}
            showNext
            onNext={() => setLeftMonth((m) => addMonths(m, 1))}
          />

          <div className="w-px bg-stroke-soft-200" />

          <div className="flex w-[196px] flex-col py-2">
            {DATE_RANGE_PRESETS.map((preset) => {
              const isActive = activePreset?.id === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={[
                    'flex items-center justify-between px-4 py-2 text-left text-label-sm transition-colors hover:bg-bg-weak-50',
                    isActive ? 'font-medium text-text-strong-950' : 'text-text-sub-600',
                  ].join(' ')}
                >
                  <span>{preset.label}</span>
                  <kbd className="flex min-w-[22px] items-center justify-center rounded border border-stroke-soft-200 bg-bg-weak-50 px-1.5 py-0.5 text-label-xs text-text-soft-400">
                    {preset.shortcut}
                  </kbd>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
