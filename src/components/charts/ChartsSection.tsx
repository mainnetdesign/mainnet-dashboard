'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { RiAddLine, RiCheckLine, RiEditLine } from '@remixicon/react'
import RainbowButton from './RainbowButton'
import ChartCard from './ChartCard'
import ChartBuilderOverlay from './ChartBuilderOverlay'
import type { ChartConfig } from '@/lib/charts/types'
import { loadCharts, saveCharts, resetCharts } from '@/lib/charts/storage'
import { cn } from '@/utils/cn'

// One hook drives both the header toolbar and the body grid.
export function useChartBuilder(page: string, presets: ChartConfig[]) {
  const [configs, setConfigs] = useState<ChartConfig[]>(presets)
  const [editing, setEditing] = useState(false)
  const [overlay, setOverlay] = useState<{ open: boolean; edit: ChartConfig | null }>({
    open: false,
    edit: null,
  })
  const loaded = useRef(false)

  const hydrate = useCallback(() => {
    setConfigs(loadCharts(page, presets))
    loaded.current = true
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (loaded.current) saveCharts(page, configs)
  }, [page, configs])

  return {
    page,
    presets,
    configs,
    setConfigs,
    editing,
    setEditing,
    overlay,
    openCreate: () => setOverlay({ open: true, edit: null }),
    openEdit: (c: ChartConfig) => setOverlay({ open: true, edit: c }),
    closeOverlay: () => setOverlay({ open: false, edit: null }),
    upsert: (c: ChartConfig) =>
      setConfigs((list) =>
        list.some((x) => x.id === c.id) ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c],
      ),
    remove: (id: string) => setConfigs((list) => list.filter((x) => x.id !== id)),
    reset: () => {
      resetCharts(page)
      setConfigs(presets)
    },
  }
}

export type ChartBuilder = ReturnType<typeof useChartBuilder>

export function ChartToolbar({ builder }: { builder: ChartBuilder }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => builder.setEditing((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-label-sm',
          builder.editing
            ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
            : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
        )}
      >
        {builder.editing ? <RiCheckLine size={16} /> : <RiEditLine size={16} />}
        {builder.editing ? 'Concluir' : 'Editar'}
      </button>
      <RainbowButton onClick={builder.openCreate}>
        <RiAddLine size={16} /> Criar Gráfico
      </RainbowButton>
    </div>
  )
}

export function ChartGrid({
  builder,
  start,
  end,
}: {
  builder: ChartBuilder
  start: string
  end: string
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  function onDrop(target: number) {
    if (dragIdx === null || dragIdx === target) return
    builder.setConfigs((list) => {
      const next = [...list]
      ;[next[dragIdx], next[target]] = [next[target], next[dragIdx]] // iOS-style swap
      return next
    })
    setDragIdx(null)
  }

  return (
    <>
      {builder.configs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stroke-soft-200 py-12 text-text-sub-600">
          <p className="text-paragraph-sm">Nenhum gráfico ainda</p>
          <RainbowButton onClick={builder.openCreate}>
            <RiAddLine size={16} /> Criar Gráfico
          </RainbowButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 [grid-auto-rows:176px]">
          {builder.configs.map((c, i) => (
            <div
              key={c.id}
              draggable={builder.editing}
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className={cn(builder.editing && 'cursor-move', dragIdx === i && 'opacity-40')}
              style={{
                gridColumn: `span ${c.size.startsWith('2') ? 2 : 1}`,
                gridRow: `span ${c.size.endsWith('2') ? 2 : 1}`,
              }}
            >
              <ChartCard
                config={c}
                start={start}
                end={end}
                editing={builder.editing}
                onEdit={() => builder.openEdit(c)}
                onRemove={() => builder.remove(c.id)}
              />
            </div>
          ))}
        </div>
      )}

      {builder.editing && builder.configs.length > 0 && (
        <button
          onClick={builder.reset}
          className="mt-3 text-label-sm text-text-sub-600 underline hover:text-text-strong-950"
        >
          Resetar para o padrão
        </button>
      )}

      {builder.overlay.open && (
        <ChartBuilderOverlay
          page={builder.page}
          initial={builder.overlay.edit}
          onClose={builder.closeOverlay}
          onSave={(c) => {
            builder.upsert(c)
            builder.closeOverlay()
          }}
        />
      )}
    </>
  )
}
