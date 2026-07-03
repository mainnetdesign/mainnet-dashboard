'use client'

import { useEffect, useRef, useState } from 'react'
import {
  RiAddLine,
  RiCloseLine,
  RiAlarmWarningLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCloudLine,
  RiCpuLine,
  RiDownload2Line,
  RiEqualizer3Line,
  RiFocus3Line,
  RiImageLine,
  RiLogoutBoxRLine,
  RiSearchLine,
  RiSubtractLine,
  RiUserSmileLine,
  RiVipCrownLine,
} from '@remixicon/react'
import type { FlowJourneyData, FlowNodeDetail, ImportJobRow } from '@/types/insta2figma'
import { fmtDateTime } from '@/lib/insta2figma/constants'
import { jobStatusLabel } from '@/lib/insta2figma/labels'
import { cn } from '@/utils/cn'

type Tone = 'ok' | 'error' | 'warning' | 'info' | 'neutral'

const NODE_W = 230
const NODE_H = 86
const WORLD_W = 980
const WORLD_H = 1290

type NodeDef = {
  id: string
  x: number
  y: number
  title: string
  count: number
  sub?: string
  tone: Tone
  icon: typeof RiSearchLine
}

type EdgeDef = {
  from: string
  to: string
  fromSide: 'bottom' | 'right'
  toSide: 'top' | 'left'
  tone: 'ok' | 'error' | 'warning' | 'neutral'
  label?: string
}

const TONE_NODE: Record<Tone, string> = {
  ok: 'border-success-base/50 i2f-glow',
  error: 'border-error-base/40',
  warning: 'border-warning-base/40',
  info: 'border-information-base/40',
  neutral: 'border-stroke-soft-200',
}

const TONE_CHIP: Record<Tone, string> = {
  ok: 'bg-success-base/10 text-success-base',
  error: 'bg-error-base/10 text-error-base',
  warning: 'bg-warning-base/10 text-warning-base',
  info: 'bg-information-base/10 text-information-base',
  neutral: 'bg-bg-weak-50 text-text-sub-600',
}

const EDGE_COLOR = {
  ok: 'var(--color-success-base, #38c77a)',
  error: 'var(--color-error-base, #fb3748)',
  warning: 'var(--color-warning-base, #f6b51e)',
  neutral: 'var(--color-stroke-soft-200, #3a3a44)',
}

function buildGraph(data: FlowJourneyData): { nodes: NodeDef[]; edges: EdgeDef[] } {
  const e = data.events
  const preview = data.telemetry.find((t) => t.endpoint === 'profile-preview')
  const feed = data.telemetry.find((t) => t.endpoint === 'feed-pagination')
  const jobs = data.jobsByStatus
  const scrapeErrors = preview
    ? preview.authErrors + preview.notFound + preview.network + preview.otherErrors
    : 0
  const failCodes = data.failedByCode.map((f) => `${f.code} ×${f.count}`).join(' · ')

  const MAIN_X = 90
  const SIDE_X = 560

  const nodes: NodeDef[] = [
    { id: 'sessions', x: MAIN_X, y: 30, title: 'Sessões no plugin', count: e.session_start ?? 0, sub: 'usuário abre o Insta2Figma', tone: 'ok', icon: RiUserSmileLine },
    { id: 'search', x: MAIN_X, y: 180, title: 'Busca de perfil', count: e.profile_search ?? 0, sub: 'digita @username', tone: 'ok', icon: RiSearchLine },
    { id: 'scrape', x: MAIN_X, y: 330, title: 'Scrape do perfil', count: preview?.total ?? 0, sub: preview ? `${preview.cacheHits} via cache · ~${preview.avgLatencyMs}ms` : undefined, tone: 'ok', icon: RiCpuLine },
    { id: 'scrape-errors', x: SIDE_X, y: 260, title: 'Erros de scrape', count: scrapeErrors, sub: preview ? `auth ${preview.authErrors} · 404 ${preview.notFound} · rede ${preview.network}` : undefined, tone: 'error', icon: RiAlarmWarningLine },
    { id: 'preview-failed', x: SIDE_X, y: 410, title: 'Preview falhou', count: e.preview_failed ?? 0, sub: 'usuário vê erro na busca', tone: 'error', icon: RiCloseCircleLine },
    { id: 'preview', x: MAIN_X, y: 480, title: 'Preview carregado', count: e.preview_loaded ?? 0, sub: `privado ${e.preview_private_account ?? 0} · vazio ${e.preview_empty ?? 0}`, tone: 'ok', icon: RiImageLine },
    { id: 'config', x: MAIN_X, y: 630, title: 'Configuração', count: e.post_count_adjusted ?? 0, sub: 'ajustes de posts, reels, carrossel', tone: 'ok', icon: RiEqualizer3Line },
    { id: 'load-more', x: SIDE_X, y: 560, title: 'Load more', count: e.load_more_clicked ?? 0, sub: feed ? `${feed.total} scrapes de feed · ${feed.authErrors} erros` : undefined, tone: 'info', icon: RiAddLine },
    { id: 'upgrade', x: SIDE_X, y: 710, title: 'Limite do plano', count: e.preview_limit_reached ?? 0, sub: `overlay de upgrade ${e.upgrade_overlay_opened ?? 0}×`, tone: 'warning', icon: RiVipCrownLine },
    { id: 'abandon', x: SIDE_X, y: 860, title: 'Abandonou', count: e.import_abandoned ?? 0, sub: 'fechou sem importar', tone: 'neutral', icon: RiLogoutBoxRLine },
    { id: 'import', x: MAIN_X, y: 790, title: 'Import iniciado', count: e.import_started ?? 0, sub: 'cria o job de importação', tone: 'ok', icon: RiDownload2Line },
    { id: 'worker', x: MAIN_X, y: 950, title: 'Gate Worker', count: data.gates.worker, sub: 'scraper próprio tenta primeiro', tone: 'ok', icon: RiCpuLine },
    { id: 'apify', x: SIDE_X, y: 1020, title: 'Gate Apify', count: data.gates.apify, sub: 'fallback quando o worker falha', tone: data.gates.apify > 0 ? 'warning' : 'neutral', icon: RiCloudLine },
    { id: 'done', x: MAIN_X, y: 1140, title: 'Concluído', count: jobs.succeeded ?? 0, sub: 'imagens entregues no Figma', tone: 'ok', icon: RiCheckboxCircleLine },
    { id: 'failed', x: SIDE_X, y: 1170, title: 'Falhou', count: jobs.failed ?? 0, sub: failCodes || undefined, tone: 'error', icon: RiCloseCircleLine },
  ]

  const edges: EdgeDef[] = [
    { from: 'sessions', to: 'search', fromSide: 'bottom', toSide: 'top', tone: 'ok' },
    { from: 'search', to: 'scrape', fromSide: 'bottom', toSide: 'top', tone: 'ok' },
    { from: 'scrape', to: 'scrape-errors', fromSide: 'right', toSide: 'left', tone: 'error', label: 'HTTP 4xx / rede' },
    { from: 'scrape-errors', to: 'preview-failed', fromSide: 'bottom', toSide: 'top', tone: 'error', label: 'sem retry restante' },
    { from: 'scrape', to: 'preview', fromSide: 'bottom', toSide: 'top', tone: 'ok', label: 'HTTP 200' },
    { from: 'preview', to: 'config', fromSide: 'bottom', toSide: 'top', tone: 'ok' },
    { from: 'config', to: 'load-more', fromSide: 'right', toSide: 'left', tone: 'neutral', label: 'quer mais posts' },
    { from: 'config', to: 'upgrade', fromSide: 'right', toSide: 'left', tone: 'warning', label: 'plano free no limite' },
    { from: 'config', to: 'abandon', fromSide: 'right', toSide: 'left', tone: 'neutral' },
    { from: 'config', to: 'import', fromSide: 'bottom', toSide: 'top', tone: 'ok', label: 'clica Importar' },
    { from: 'import', to: 'worker', fromSide: 'bottom', toSide: 'top', tone: 'ok' },
    { from: 'worker', to: 'apify', fromSide: 'right', toSide: 'left', tone: 'warning', label: 'worker falhou → gate abre' },
    { from: 'worker', to: 'done', fromSide: 'bottom', toSide: 'top', tone: 'ok', label: 'sucesso direto' },
    { from: 'apify', to: 'failed', fromSide: 'bottom', toSide: 'top', tone: 'error', label: 'resposta do Apify' },
  ]

  return { nodes, edges }
}

function anchor(n: NodeDef, side: EdgeDef['fromSide'] | EdgeDef['toSide']) {
  if (side === 'bottom') return { x: n.x + NODE_W / 2, y: n.y + NODE_H }
  if (side === 'top') return { x: n.x + NODE_W / 2, y: n.y }
  if (side === 'right') return { x: n.x + NODE_W, y: n.y + NODE_H / 2 }
  return { x: n.x, y: n.y + NODE_H / 2 }
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, fromSide: string) {
  if (fromSide === 'bottom') {
    const dy = Math.max(40, (b.y - a.y) / 2)
    return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy}, ${b.x} ${b.y - dy}, ${b.x} ${b.y}`
  }
  const dx = Math.max(40, (b.x - a.x) / 2)
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`
}

function CanvasNode({
  node,
  selected,
  onSelect,
}: {
  node: NodeDef
  selected: boolean
  onSelect: () => void
}) {
  const Icon = node.icon
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(ev) => ev.stopPropagation()}
      onClick={onSelect}
      onKeyDown={(ev) => ev.key === 'Enter' && onSelect()}
      className={cn(
        'absolute cursor-pointer rounded-xl border bg-bg-white-0 shadow-sm transition-shadow hover:shadow-md',
        TONE_NODE[node.tone],
        selected && 'ring-2 ring-information-base',
      )}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
    >
      <div className="flex h-full items-center gap-3 px-3.5">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[node.tone])}>
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-label-sm text-text-strong-950">{node.title}</p>
            <p className="text-label-md tabular-nums text-text-strong-950">
              {node.count.toLocaleString('pt-BR')}
            </p>
          </div>
          {node.sub && (
            <p className="mt-0.5 truncate text-paragraph-xs text-text-soft-400">{node.sub}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const OCC_DOT = {
  ok: 'bg-success-base',
  error: 'bg-error-base',
  warning: 'bg-warning-base',
  neutral: 'bg-text-soft-400',
} as const

const JOB_STATUS_CHIP = {
  succeeded: 'bg-success-base/10 text-success-base',
  failed: 'bg-error-base/10 text-error-base',
  running: 'bg-information-base/10 text-information-base',
  queued: 'bg-bg-weak-50 text-text-sub-600',
  canceled: 'bg-bg-weak-50 text-text-sub-600',
} as const

function NodePanel({
  node,
  detail,
  loading,
  onClose,
  onJobClick,
}: {
  node: NodeDef
  detail: FlowNodeDetail | null
  loading: boolean
  onClose: () => void
  onJobClick?: (job: ImportJobRow) => void
}) {
  const Icon = node.icon
  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-80 flex-col border-l border-stroke-soft-200 bg-bg-white-0 shadow-xl">
      <div className="flex items-center gap-2.5 border-b border-stroke-soft-200 px-4 py-3">
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[node.tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-sm text-text-strong-950">{node.title}</p>
          <p className="text-paragraph-xs text-text-soft-400">
            {node.count.toLocaleString('pt-BR')} no período
          </p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-bg-weak-50" aria-label="Fechar">
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-paragraph-xs text-text-soft-400">Carregando...</p>}

        {!loading && detail?.kind === 'jobs' && (
          <ul>
            {detail.jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => onJobClick?.(job)}
                  className="flex w-full items-center gap-2 border-b border-stroke-soft-200 px-4 py-2.5 text-left hover:bg-bg-weak-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-paragraph-sm text-text-strong-950">
                      {job.profileUsername ? `@${job.profileUsername}` : '(sem perfil)'}
                    </p>
                    <p className="truncate text-paragraph-xs text-text-soft-400">
                      {job.displayName} · {fmtDateTime(job.createdAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-1.5 py-0.5 text-paragraph-xs',
                      JOB_STATUS_CHIP[job.status as keyof typeof JOB_STATUS_CHIP] ??
                        'bg-bg-weak-50 text-text-sub-600',
                    )}
                  >
                    {jobStatusLabel(job.status)}
                  </span>
                </button>
              </li>
            ))}
            {detail.jobs.length === 0 && (
              <li className="p-4 text-paragraph-xs text-text-soft-400">Nenhuma importação nesta etapa.</li>
            )}
            {detail.total > detail.jobs.length && (
              <li className="p-4 text-paragraph-xs text-text-soft-400">
                Mostrando {detail.jobs.length} de {detail.total} — refine o período para ver o resto.
              </li>
            )}
          </ul>
        )}

        {!loading && detail?.kind === 'occurrences' && (
          <ul>
            {detail.occurrences.map((occ) => (
              <li key={occ.id} className="flex items-start gap-2 border-b border-stroke-soft-200 px-4 py-2.5">
                <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', OCC_DOT[occ.status])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-paragraph-sm text-text-strong-950">{occ.title}</p>
                    <p className="shrink-0 text-paragraph-xs text-text-soft-400">{fmtDateTime(occ.when)}</p>
                  </div>
                  {occ.detail && (
                    <p className="truncate text-paragraph-xs text-text-soft-400">{occ.detail}</p>
                  )}
                </div>
              </li>
            ))}
            {detail.occurrences.length === 0 && (
              <li className="p-4 text-paragraph-xs text-text-soft-400">Nenhuma ocorrência nesta etapa.</li>
            )}
          </ul>
        )}
      </div>
    </aside>
  )
}

export default function ImportJourneyMap({
  data,
  start,
  end,
  onJobClick,
  className,
}: {
  data: FlowJourneyData
  start: string
  end: string
  onJobClick?: (job: ImportJobRow) => void
  className?: string
}) {
  const { nodes, edges } = buildGraph(data)
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 20, y: 20, k: 0.72 })
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FlowNodeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setDetailLoading(true)
    setDetail(null)
    const params = new URLSearchParams({ node: selectedId, start, end })
    fetch(`/api/store/insta2figma/flow/node?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (d.error) throw new Error(d.error)
        setDetail(d)
      })
      .catch(() => !cancelled && setDetail(null))
      .finally(() => !cancelled && setDetailLoading(false))
    return () => {
      cancelled = true
    }
  }, [selectedId, start, end])

  const selectedNode = selectedId ? nodes.find((n) => n.id === selectedId) : null

  // React registers wheel listeners as passive — attach manually to preventDefault.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = ev.clientX - rect.left
      const py = ev.clientY - rect.top
      setView((v) => {
        const k = Math.min(1.6, Math.max(0.3, v.k * Math.exp(-ev.deltaY * 0.0015)))
        return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (factor: number) =>
    setView((v) => {
      const el = containerRef.current
      const cx = (el?.clientWidth ?? 600) / 2
      const cy = (el?.clientHeight ?? 300) / 2
      const k = Math.min(1.6, Math.max(0.3, v.k * factor))
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k }
    })

  return (
    <div className={cn('relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0', className)}>
      <style>{`
        @keyframes i2f-glow {
          0%, 100% { box-shadow: 0 0 4px 0 rgba(56, 199, 122, 0.15); }
          50% { box-shadow: 0 0 12px 2px rgba(56, 199, 122, 0.3); }
        }
        .i2f-glow { animation: i2f-glow 2.4s ease-in-out infinite; }
        @keyframes i2f-dash { to { stroke-dashoffset: -20; } }
        .i2f-flow { stroke-dasharray: 7 5; animation: i2f-dash 0.9s linear infinite; }
      `}</style>

      <div className="flex items-center justify-between border-b border-stroke-soft-200 px-5 py-3">
        <p className="text-label-sm text-text-strong-950">Jornada de importação</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => zoomBy(0.8)} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Diminuir zoom">
            <RiSubtractLine className="size-4" />
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Aumentar zoom">
            <RiAddLine className="size-4" />
          </button>
          <button type="button" onClick={() => setView({ x: 20, y: 20, k: 0.72 })} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Recentralizar">
            <RiFocus3Line className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 cursor-grab touch-none select-none bg-bg-weak-50 active:cursor-grabbing"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--color-stroke-sub-300) 32%, transparent) 1px, transparent 1px)',
          backgroundSize: `${24 * view.k}px ${24 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDown={(ev) => {
          drag.current = { px: ev.clientX, py: ev.clientY, ox: view.x, oy: view.y }
          ;(ev.target as HTMLElement).setPointerCapture?.(ev.pointerId)
        }}
        onPointerMove={(ev) => {
          if (!drag.current) return
          const d = drag.current
          setView((v) => ({ ...v, x: d.ox + ev.clientX - d.px, y: d.oy + ev.clientY - d.py }))
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: WORLD_W,
            height: WORLD_H,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: '0 0',
          }}
        >
          <svg width={WORLD_W} height={WORLD_H} className="pointer-events-none absolute left-0 top-0">
            {edges.map((edge) => {
              const from = byId.get(edge.from)!
              const to = byId.get(edge.to)!
              const a = anchor(from, edge.fromSide)
              const b = anchor(to, edge.toSide)
              const color = EDGE_COLOR[edge.tone]
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <path
                    d={edgePath(a, b, edge.fromSide)}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    className={edge.tone === 'ok' ? 'i2f-flow' : undefined}
                    strokeDasharray={edge.tone === 'ok' ? undefined : '4 4'}
                    opacity={0.8}
                  />
                  <circle cx={a.x} cy={a.y} r={4} fill="var(--color-bg-white-0, #17171c)" stroke={color} strokeWidth={1.5} />
                  <circle cx={b.x} cy={b.y} r={3} fill={color} />
                  {edge.label && (
                    <text
                      x={mid.x}
                      y={mid.y - 6}
                      textAnchor="middle"
                      className="fill-text-soft-400"
                      fontSize={11}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {nodes.map((node) => (
            <CanvasNode
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              onSelect={() => setSelectedId((cur) => (cur === node.id ? null : node.id))}
            />
          ))}
        </div>

        {selectedNode && (
          <NodePanel
            node={selectedNode}
            detail={detail}
            loading={detailLoading}
            onClose={() => setSelectedId(null)}
            onJobClick={onJobClick}
          />
        )}
      </div>

      <p className="border-t border-stroke-soft-200 px-5 py-2 text-paragraph-xs text-text-soft-400">
        Arraste para navegar · scroll para zoom · clique num card para ver as ocorrências · linhas verdes = caminho feliz
      </p>
    </div>
  )
}
