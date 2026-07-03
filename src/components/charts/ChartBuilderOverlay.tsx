'use client'
import { useState } from 'react'
import { RiCloseLine, RiAddLine, RiBarChartLine, RiLineChartLine, RiPieChartLine } from '@remixicon/react'
import type { ChartConfig, ChartType, TileSize } from '@/lib/charts/types'
import {
  measuresForPage,
  commonDimensions,
  sameUnit,
  MEASURES,
  SERIES_PALETTE,
  STATE_COLORS,
} from '@/lib/charts/catalog'
import { ChartCanvas } from './ChartCard'
import { cn } from '@/utils/cn'

// Deterministic mock keys per dimension (preview only, not real data).
const MOCK_KEYS: Record<string, string[]> = {
  time: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  platform: ['figma', 'framer'],
  plan_tier: ['free', 'pro', 'max'],
  job_status: ['succeeded', 'failed', 'queued'],
  event_name: ['session', 'search', 'preview', 'import'],
  verified: ['Verificado', 'Não verif.'],
}
const MOCK_CURVE = [12, 18, 9, 22, 15, 28, 20]

function mockRows(cfg: ChartConfig): Record<string, string | number>[] {
  const keys = MOCK_KEYS[cfg.dimension] ?? MOCK_KEYS.time
  return keys.map((key, i) => {
    const row: Record<string, string | number> = { key }
    cfg.series.forEach((s, si) => {
      row[s.measure] = MOCK_CURVE[(i + si * 2) % MOCK_CURVE.length] + si * 3
    })
    return row
  })
}

const TYPES: { id: ChartType; label: string; Icon: typeof RiBarChartLine }[] = [
  { id: 'bar', label: 'Barra', Icon: RiBarChartLine },
  { id: 'line', label: 'Linha', Icon: RiLineChartLine },
  { id: 'pie', label: 'Pizza', Icon: RiPieChartLine },
]

const SIZES: TileSize[] = ['1x1', '2x1', '2x2', '1x2']

function emptyConfig(page: string): ChartConfig {
  const first = measuresForPage(page)[0]
  return {
    id: `c_${Date.now()}`,
    title: 'Novo gráfico',
    type: 'bar',
    size: '2x1',
    dimension: 'time',
    series: [{ measure: first.id, color: SERIES_PALETTE[0] }],
  }
}

export default function ChartBuilderOverlay({
  page,
  initial,
  onSave,
  onClose,
}: {
  page: string
  initial: ChartConfig | null
  onSave: (c: ChartConfig) => void
  onClose: () => void
}) {
  const [cfg, setCfg] = useState<ChartConfig>(initial ?? emptyConfig(page))
  const available = measuresForPage(page)
  const chosenMeasures = cfg.series.map((s) => s.measure)
  const dims = commonDimensions(chosenMeasures)

  // pie uses a single series; only offer "add" if an unused same-unit measure exists
  const hasSpareMeasure = available.some(
    (m) => !chosenMeasures.includes(m.id) && sameUnit([...chosenMeasures, m.id]),
  )
  const canAddSeries = cfg.type !== 'pie' && cfg.series.length < 4 && hasSpareMeasure

  const dimValid = dims.some((d) => d.id === cfg.dimension)

  // Live preview data (mock). Recomputed as the config changes.
  const previewCfg: ChartConfig = {
    ...cfg,
    dimension: dimValid ? cfg.dimension : dims[0]?.id ?? 'time',
    series: cfg.type === 'pie' ? cfg.series.slice(0, 1) : cfg.series,
  }
  const previewRows = mockRows(previewCfg)

  function patch(p: Partial<ChartConfig>) {
    setCfg((c) => ({ ...c, ...p }))
  }

  function setMeasure(idx: number, measure: string) {
    setCfg((c) => {
      const series = c.series.map((s, i) => (i === idx ? { ...s, measure } : s))
      // if units now clash, keep only the changed one
      if (!sameUnit(series.map((s) => s.measure))) {
        return { ...c, series: [series[idx]] }
      }
      return { ...c, series }
    })
  }

  function addSeries() {
    const used = new Set(chosenMeasures)
    const next = available.find(
      (m) => !used.has(m.id) && sameUnit([...chosenMeasures, m.id]),
    )
    if (!next) return
    const usedColors = new Set(cfg.series.map((s) => s.color))
    const color = SERIES_PALETTE.find((c) => !usedColors.has(c)) ?? SERIES_PALETTE[0]
    setCfg((c) => ({
      ...c,
      series: [...c.series, { measure: next.id, color }],
    }))
  }

  function save() {
    const finalCfg = { ...cfg, series: cfg.type === 'pie' ? [cfg.series[0]] : cfg.series }
    if (!dims.some((d) => d.id === finalCfg.dimension)) {
      finalCfg.dimension = dims[0]?.id ?? 'time'
    }
    onSave(finalCfg)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl bg-bg-white-0 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-label-md text-text-strong-950">
            {initial ? 'Editar gráfico' : 'Criar gráfico'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-text-sub-600 hover:bg-bg-weak-50">
            <RiCloseLine size={18} />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Coluna esquerda: editor */}
          <div className="flex flex-col gap-4">
          {/* Título */}
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-text-sub-600">Título</span>
            <input
              value={cfg.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950 focus:outline-none focus:ring-2 focus:ring-primary-base/40"
            />
          </label>

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <span className="text-label-sm text-text-sub-600">Tipo</span>
            <div className="flex gap-2">
              {TYPES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => patch({ type: id })}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-label-sm',
                    cfg.type === id
                      ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                      : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
                  )}
                >
                  <Icon size={20} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamanho */}
          <div className="flex flex-col gap-1">
            <span className="text-label-sm text-text-sub-600">Tamanho</span>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => patch({ size: s })}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-label-sm',
                    cfg.size === s
                      ? 'border-primary-base bg-primary-alpha-10 text-primary-base'
                      : 'border-stroke-soft-200 text-text-sub-600 hover:bg-bg-weak-50',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Séries */}
          <div className="flex flex-col gap-2">
            <span className="text-label-sm text-text-sub-600">
              {cfg.type === 'pie' ? 'Variável' : 'Variáveis (mesma unidade)'}
            </span>
            {(cfg.type === 'pie' ? cfg.series.slice(0, 1) : cfg.series).map((s, i) => {
              // exclusivity: measures/colors used by OTHER series are off-limits
              const usedMeasures = new Set(
                cfg.series.filter((_, j) => j !== i).map((x) => x.measure),
              )
              const usedColors = new Set(
                cfg.series.filter((_, j) => j !== i).map((x) => x.color),
              )
              return (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-stroke-soft-200 p-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={s.measure}
                      onChange={(e) => setMeasure(i, e.target.value)}
                      className="flex-1 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950"
                    >
                      {available
                        .filter(
                          (m) =>
                            (m.unit === MEASURES[s.measure].unit || m.id === s.measure) &&
                            !usedMeasures.has(m.id),
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                    </select>
                    {cfg.series.length > 1 && cfg.type !== 'pie' && (
                      <button
                        onClick={() => setCfg((c) => ({ ...c, series: c.series.filter((_, j) => j !== i) }))}
                        className="rounded p-1 text-text-sub-600 hover:bg-bg-weak-50 hover:text-error-base"
                      >
                        <RiCloseLine size={16} />
                      </button>
                    )}
                  </div>
                  {/* Cor: tokens de estado do DS (usados por outra série ficam bloqueados) */}
                  <div className="flex flex-wrap gap-1.5">
                    {STATE_COLORS.map((tok) => {
                      const taken = usedColors.has(tok.value)
                      return (
                        <button
                          key={tok.value}
                          title={taken ? `${tok.label} (em uso)` : tok.label}
                          aria-label={tok.label}
                          disabled={taken}
                          onClick={() =>
                            setCfg((c) => ({
                              ...c,
                              series: c.series.map((x, j) => (j === i ? { ...x, color: tok.value } : x)),
                            }))
                          }
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition',
                            s.color === tok.value ? 'border-text-strong-950' : 'border-transparent',
                            taken && 'cursor-not-allowed opacity-25',
                          )}
                          style={{ background: tok.value }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {canAddSeries && (
              <button
                onClick={addSeries}
                className="flex items-center gap-1 self-start rounded-lg px-2 py-1 text-label-sm text-primary-base hover:bg-primary-alpha-10"
              >
                <RiAddLine size={16} /> Adicionar variável
              </button>
            )}
          </div>

          {/* Dimensão */}
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-text-sub-600">Agrupar por</span>
            <select
              value={dimValid ? cfg.dimension : dims[0]?.id}
              onChange={(e) => patch({ dimension: e.target.value })}
              className="rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950"
            >
              {dims.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          </div>

          {/* Coluna direita: preview ao vivo (mock, janela estilo macOS) */}
          <div className="md:sticky md:top-0 md:self-start">
            <div className="overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-weak-50">
              <div className="flex items-center gap-1.5 border-b border-stroke-soft-200 bg-bg-white-0 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-error-base" />
                <span className="h-2.5 w-2.5 rounded-full bg-away-base" />
                <span className="h-2.5 w-2.5 rounded-full bg-success-base" />
                <span className="ml-auto text-label-xs text-text-soft-400">Preview</span>
              </div>
              <div className="p-3">
                <p className="mb-1 text-label-sm text-text-strong-950">{cfg.title || 'Sem título'}</p>
                <div className="h-56">
                  <ChartCanvas config={previewCfg} rows={previewRows} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-label-sm text-text-sub-600 hover:bg-bg-weak-50">
            Cancelar
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-primary-base px-4 py-2 text-label-sm font-medium text-white hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
