'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { RiAddLine, RiFocus3Line, RiSubtractLine } from '@remixicon/react'
import type { FarmData, FarmUser } from '@/types/insta2figma'
import { fmtDateTime } from '@/lib/insta2figma/constants'
import { planLabel } from '@/lib/insta2figma/labels'
import { cn } from '@/utils/cn'

/* ── Isometric base ──────────────────────────────────────────────── */

const TW = 64 // tile width (px)
const TH = 32 // tile height (px)
const MARGIN = 7 // ground tiles around the plantation

function iso(x: number, y: number) {
  return { sx: ((x - y) * TW) / 2, sy: ((x + y) * TH) / 2 }
}

function diamond(x: number, y: number, inset = 0): string {
  const c = iso(x + 0.5, y + 0.5)
  const w = (TW / 2) * (1 - inset)
  const h = (TH / 2) * (1 - inset)
  return `${c.sx},${c.sy - h} ${c.sx + w},${c.sy} ${c.sx},${c.sy + h} ${c.sx - w},${c.sy}`
}

/* Deterministic PRNG so the scenery is stable between renders. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── Palette (game art — intentionally not DS tokens) ────────────── */

const P = {
  grass: '#8fce6e',
  grassLine: '#7ab85c',
  soil: '#c98a4b',
  soilDark: '#a96f38',
  soilLine: '#b57a3f',
  sprout: '#4c9b3c',
  growing: '#5fae3f',
  wheat: '#f4b23c',
  wheatDark: '#d99527',
  wheatTile: '#f6c159',
  water: '#5aa7e8',
  waterLight: '#8cc3f0',
  wood: '#8a5a33',
  woodDark: '#6e4526',
  trunk: '#7a4f2b',
  leaf1: '#3f9646',
  leaf2: '#57ab4b',
  leaf3: '#2f7f3c',
  siloBody: '#d9dee3',
  siloShade: '#aeb6bd',
  siloTop: '#3aa05c',
  turbine: '#f4f6f8',
  turbineShade: '#c9cfd4',
  panel: '#2b3f66',
  panelLight: '#3d5挂80',
  rock: '#9aa1a8',
}

/* ── Scenery generation ──────────────────────────────────────────── */

type Deco =
  | { kind: 'tree'; x: number; y: number; s: number }
  | { kind: 'rock'; x: number; y: number }
  | { kind: 'turbine'; x: number; y: number; delay: number }
  | { kind: 'panels'; x: number; y: number }
  | { kind: 'silo'; x: number; y: number }

type Scenery = { river: Set<string>; decos: Deco[] }

function buildScenery(side: number): Scenery {
  const rand = mulberry32(side * 2654435761)
  const lo = -MARGIN
  const hi = side + MARGIN
  const key = (x: number, y: number) => `${x},${y}`
  const inPlantation = (x: number, y: number) =>
    x >= -1 && x <= side && y >= -1 && y <= side // +1 buffer for the fence

  // River: a drifting band crossing the top-left corner of the map.
  const river = new Set<string>()
  let ry = lo + Math.floor(MARGIN / 2)
  for (let x = lo; x < hi; x++) {
    ry += rand() < 0.4 ? (rand() < 0.5 ? 1 : -1) : 0
    ry = Math.max(lo, Math.min(-2, ry))
    river.add(key(x, ry))
    river.add(key(x, ry + 1))
  }

  const used = new Set<string>(river)
  const decos: Deco[] = []
  const take = (x: number, y: number) => {
    if (x < lo || y < lo || x >= hi || y >= hi) return false
    if (inPlantation(x, y) || used.has(key(x, y))) return false
    used.add(key(x, y))
    return true
  }

  // Silo: fixed spot by the top-right edge of the plantation.
  const siloX = side + 2
  const siloY = -3
  if (take(siloX, siloY)) decos.push({ kind: 'silo', x: siloX, y: siloY })

  // Wind turbines scattered on the far ring.
  let placed = 0
  for (let tries = 0; tries < 200 && placed < 5; tries++) {
    const x = lo + Math.floor(rand() * (hi - lo))
    const y = lo + Math.floor(rand() * (hi - lo))
    const far = x < -3 || y < -3 || x > side + 2 || y > side + 2
    if (far && take(x, y)) {
      decos.push({ kind: 'turbine', x, y, delay: rand() * 4 })
      placed++
    }
  }

  // Solar panel clusters (2×3 cells each).
  let clusters = 0
  for (let tries = 0; tries < 200 && clusters < 4; tries++) {
    const x = lo + 1 + Math.floor(rand() * (hi - lo - 4))
    const y = lo + 1 + Math.floor(rand() * (hi - lo - 4))
    const cells: [number, number][] = []
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 3; dy++) cells.push([x + dx, y + dy])
    if (
      cells.every(
        ([cx, cy]) =>
          cx >= lo && cy >= lo && cx < hi && cy < hi && !inPlantation(cx, cy) && !used.has(key(cx, cy)),
      )
    ) {
      cells.forEach(([cx, cy]) => used.add(key(cx, cy)))
      cells.forEach(([cx, cy]) => decos.push({ kind: 'panels', x: cx, y: cy }))
      clusters++
    }
  }

  // Trees everywhere on the outskirts, rocks sparsely.
  for (let x = lo; x < hi; x++) {
    for (let y = lo; y < hi; y++) {
      if (inPlantation(x, y) || used.has(key(x, y))) continue
      const r = rand()
      if (r < 0.14) {
        used.add(key(x, y))
        decos.push({ kind: 'tree', x, y, s: 0.7 + rand() * 0.6 })
      } else if (r < 0.16) {
        used.add(key(x, y))
        decos.push({ kind: 'rock', x, y })
      }
    }
  }

  return { river, decos }
}

/* ── Sprites ─────────────────────────────────────────────────────── */

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={2} rx={10 * s} ry={4 * s} fill="rgba(0,0,0,0.12)" />
      <rect x={-1.5 * s} y={-8 * s} width={3 * s} height={10 * s} fill={P.trunk} />
      <circle cx={0} cy={-14 * s} r={8.5 * s} fill={P.leaf1} />
      <circle cx={-5 * s} cy={-9 * s} r={6 * s} fill={P.leaf2} />
      <circle cx={5 * s} cy={-10 * s} r={6.5 * s} fill={P.leaf3} />
    </g>
  )
}

function Rock({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={2} rx={7} ry={3} fill="rgba(0,0,0,0.1)" />
      <path d="M -6 1 L -3 -5 L 3 -6 L 7 0 L 3 3 L -3 3 Z" fill={P.rock} stroke="#7d848b" strokeWidth={1} />
    </g>
  )
}

function Turbine({ x, y, delay }: { x: number; y: number; delay: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={2} rx={8} ry={3.5} fill="rgba(0,0,0,0.12)" />
      <path d="M -2.5 0 L -1 -34 L 1 -34 L 2.5 0 Z" fill={P.turbine} stroke={P.turbineShade} strokeWidth={0.8} />
      <g transform="translate(0, -36)">
        <g className="farm-spin" style={{ animationDelay: `${-delay}s` }}>
          {[0, 120, 240].map((deg) => (
            <path
              key={deg}
              d="M 0 0 L -2 -4 L 0 -20 L 2 -4 Z"
              fill={P.turbine}
              stroke={P.turbineShade}
              strokeWidth={0.8}
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
        <circle r={2.4} fill={P.turbineShade} />
      </g>
    </g>
  )
}

function Panels({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <polygon points={diamond(-0.5, -0.5, 0.25)} fill={P.panel} stroke="#1e2e4d" strokeWidth={1} transform="translate(0,-3)" />
      <polygon points={diamond(-0.5, -0.5, 0.25)} fill="none" stroke="#4d6da0" strokeWidth={0.7} transform="translate(0,-4.5)" />
      <line x1={-8} y1={3} x2={-8} y2={-1} stroke="#6b7280" strokeWidth={1.5} />
      <line x1={8} y1={3} x2={8} y2={-1} stroke="#6b7280" strokeWidth={1.5} />
    </g>
  )
}

function Silo({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={4} rx={16} ry={7} fill="rgba(0,0,0,0.14)" />
      <path d="M -13 0 A 13 6 0 0 0 13 0 L 13 -42 L -13 -42 Z" fill={P.siloBody} />
      <path d="M 2 3.5 A 13 6 0 0 0 13 0 L 13 -42 L 2 -42 Z" fill={P.siloShade} opacity={0.55} />
      <ellipse cx={0} cy={-42} rx={13} ry={6} fill={P.siloShade} />
      <path d="M -13 -42 A 13 6 0 0 1 13 -42 A 13 13 0 0 0 0 -54 A 13 13 0 0 0 -13 -42 Z" fill={P.siloTop} />
      {[-30, -18, -6].map((yy) => (
        <path key={yy} d={`M -13 ${yy} A 13 6 0 0 0 13 ${yy}`} fill="none" stroke="#98a1a8" strokeWidth={1} />
      ))}
    </g>
  )
}

/* Wood fence segment along one plantation edge tile. */
function FenceEdge({ x, y, edge }: { x: number; y: number; edge: 'N' | 'S' | 'W' | 'E' }) {
  // corners of tile (x,y): N=(x,y) top corner in grid terms
  const corners = {
    NW: iso(x, y),
    NE: iso(x + 1, y),
    SW: iso(x, y + 1),
    SE: iso(x + 1, y + 1),
  }
  const [a, b] =
    edge === 'N' ? [corners.NW, corners.NE]
    : edge === 'S' ? [corners.SW, corners.SE]
    : edge === 'W' ? [corners.NW, corners.SW]
    : [corners.NE, corners.SE]
  const H = 10
  return (
    <g>
      {[a, b].map((p, i) => (
        <line key={i} x1={p.sx} y1={p.sy} x2={p.sx} y2={p.sy - H} stroke={P.woodDark} strokeWidth={2.5} strokeLinecap="round" />
      ))}
      <line x1={a.sx} y1={a.sy - H + 2} x2={b.sx} y2={b.sy - H + 2} stroke={P.wood} strokeWidth={2} />
      <line x1={a.sx} y1={a.sy - H + 6} x2={b.sx} y2={b.sy - H + 6} stroke={P.wood} strokeWidth={2} />
    </g>
  )
}

/* Crop tile for a user (or bare soil for empty slots). */
function CropTile({
  x,
  y,
  user,
  growthCap,
  hovered,
  onHover,
  onClick,
}: {
  x: number
  y: number
  user: FarmUser | null
  growthCap: number
  hovered: boolean
  onHover: (h: boolean) => void
  onClick: () => void
}) {
  const paid = user != null && user.planTier !== 'free'
  const growth = user ? Math.min(1, user.imagesUsed / growthCap) : 0

  const base = !user ? P.soil : paid ? P.wheatTile : P.soilDark
  const line = !user ? P.soilLine : paid ? P.wheatDark : P.soilLine

  // Stalk positions inside the tile (sub-grid).
  const stalks: { sx: number; sy: number }[] = []
  if (user) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const p = iso(x + 0.22 + i * 0.28, y + 0.22 + j * 0.28)
        stalks.push({ sx: p.sx, sy: p.sy })
      }
    }
  }
  const h = paid ? 14 : 2 + growth * 12
  const stalkColor = paid ? P.wheat : growth === 0 ? P.sprout : P.growing

  return (
    <g
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={user ? onClick : undefined}
      style={{ cursor: user ? 'pointer' : 'default' }}
    >
      <polygon points={diamond(x, y, 0.04)} fill={base} stroke={line} strokeWidth={1} />
      {/* furrow texture */}
      {[0.3, 0.55, 0.8].map((t) => {
        const a = iso(x + t, y + 0.08)
        const b = iso(x + t, y + 0.92)
        return <line key={t} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={line} strokeWidth={0.8} opacity={0.6} />
      })}
      {stalks.map((s, i) => (
        <g key={i}>
          <line x1={s.sx} y1={s.sy} x2={s.sx} y2={s.sy - h} stroke={stalkColor} strokeWidth={1.6} strokeLinecap="round" />
          {paid && (
            <ellipse cx={s.sx} cy={s.sy - h - 2} rx={1.8} ry={3.4} fill={P.wheat} stroke={P.wheatDark} strokeWidth={0.5} />
          )}
        </g>
      ))}
      {hovered && user && (
        <polygon points={diamond(x, y, 0.02)} fill="rgba(255,255,255,0.18)" stroke="#fff" strokeWidth={1.5} />
      )}
    </g>
  )
}

/* ── Main canvas ─────────────────────────────────────────────────── */

const PLAN_CHIP: Record<FarmUser['planTier'], string> = {
  free: 'bg-bg-weak-50 text-text-sub-600',
  pro: 'bg-information-base/10 text-information-base',
  max: 'bg-success-base/10 text-success-base',
}

export default function FarmCanvas({
  data,
  onOpenUser,
  className,
}: {
  data: FarmData
  onOpenUser: (userId: string) => void
  className?: string
}) {
  const users = data.users
  const side = Math.max(2, Math.ceil(Math.sqrt(Math.max(users.length, 1))))
  const scenery = useMemo(() => buildScenery(side), [side])

  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ user: FarmUser; x: number; y: number } | null>(null)

  const lo = -MARGIN
  const hi = side + MARGIN
  const originX = (hi - lo) * (TW / 2) // shift so all sx ≥ 0

  // Center the farm on mount.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const center = iso(side / 2, side / 2)
    setView({
      x: el.clientWidth / 2 - (center.sx + originX),
      y: el.clientHeight / 2 - center.sy - 40,
      k: 1,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = ev.clientX - rect.left
      const py = ev.clientY - rect.top
      setView((v) => {
        const k = Math.min(3, Math.max(0.35, v.k * Math.exp(-ev.deltaY * 0.0015)))
        return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (f: number) =>
    setView((v) => {
      const el = containerRef.current
      const cx = (el?.clientWidth ?? 600) / 2
      const cy = (el?.clientHeight ?? 400) / 2
      const k = Math.min(3, Math.max(0.35, v.k * f))
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k }
    })

  const recenter = () => {
    const el = containerRef.current
    if (!el) return
    const center = iso(side / 2, side / 2)
    setView({ x: el.clientWidth / 2 - (center.sx + originX), y: el.clientHeight / 2 - center.sy - 40, k: 1 })
  }

  /* Depth-sorted render list: plantation tiles, fence, decorations. */
  const items = useMemo(() => {
    const list: { depth: number; el: React.ReactNode }[] = []

    for (let i = 0; i < side * side; i++) {
      const x = i % side
      const y = Math.floor(i / side)
      const user = users[i] ?? null
      const id = user?.id ?? `empty-${i}`
      list.push({
        depth: x + y,
        el: (
          <CropTile
            key={`tile-${i}`}
            x={x}
            y={y}
            user={user}
            growthCap={data.growthCap}
            hovered={hoverId === id}
            onHover={(h) => setHoverId(h ? id : null)}
            onClick={() => user && setSelected({ user, x, y })}
          />
        ),
      })
    }

    for (let t = 0; t < side; t++) {
      list.push({ depth: t - 0.5, el: <FenceEdge key={`fn-${t}`} x={t} y={0} edge="N" /> })
      list.push({ depth: t - 0.5, el: <FenceEdge key={`fw-${t}`} x={0} y={t} edge="W" /> })
      list.push({ depth: t + side + 0.5, el: <FenceEdge key={`fs-${t}`} x={t} y={side - 1} edge="S" /> })
      list.push({ depth: t + side + 0.5, el: <FenceEdge key={`fe-${t}`} x={side - 1} y={t} edge="E" /> })
    }

    for (const d of scenery.decos) {
      const depth = d.x + d.y + 1
      if (d.kind === 'tree') list.push({ depth, el: <Tree key={`t${d.x},${d.y}`} {...d} /> })
      if (d.kind === 'rock') list.push({ depth, el: <Rock key={`r${d.x},${d.y}`} {...d} /> })
      if (d.kind === 'turbine') list.push({ depth, el: <Turbine key={`w${d.x},${d.y}`} {...d} /> })
      if (d.kind === 'panels') list.push({ depth, el: <Panels key={`p${d.x},${d.y}`} {...d} /> })
      if (d.kind === 'silo') list.push({ depth, el: <Silo key={`s${d.x},${d.y}`} {...d} /> })
    }

    return list.sort((a, b) => a.depth - b.depth).map((i) => i.el)
  }, [side, users, data.growthCap, hoverId, scenery])

  /* Ground cells (grass + river) — flat, always behind everything. */
  const ground = useMemo(() => {
    const cells: React.ReactNode[] = []
    for (let x = lo; x < hi; x++) {
      for (let y = lo; y < hi; y++) {
        const isRiver = scenery.river.has(`${x},${y}`)
        cells.push(
          <polygon
            key={`g${x},${y}`}
            points={diamond(x, y)}
            fill={isRiver ? P.water : P.grass}
            stroke={isRiver ? P.waterLight : P.grassLine}
            strokeWidth={0.6}
          />,
        )
      }
    }
    return cells
  }, [lo, hi, scenery])

  const cardPos = selected
    ? (() => {
        const c = iso(selected.x + 0.5, selected.y + 0.5)
        return { left: view.x + (c.sx + originX) * view.k, top: view.y + (c.sy - 18) * view.k }
      })()
    : null

  const paidCount = users.filter((u) => u.planTier !== 'free').length
  const exportedCount = users.filter((u) => u.planTier === 'free' && u.imagesUsed > 0).length

  return (
    <div className={cn('relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-stroke-soft-200', className)}>
      <style>{`
        @keyframes farm-spin { to { transform: rotate(360deg); } }
        .farm-spin { animation: farm-spin 5s linear infinite; transform-box: fill-box; transform-origin: 0px 0px; }
      `}</style>

      <div className="flex items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0 px-5 py-3">
        <div className="flex items-center gap-3">
          <p className="text-label-sm text-text-strong-950">Farm</p>
          <p className="text-paragraph-xs text-text-soft-400">
            {users.length} usuários · {side}×{side} lotes · {paidCount} 🌾 assinantes · {exportedCount} 🌱 crescendo
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => zoomBy(0.8)} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Diminuir zoom">
            <RiSubtractLine className="size-4" />
          </button>
          <button type="button" onClick={() => zoomBy(1.25)} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Aumentar zoom">
            <RiAddLine className="size-4" />
          </button>
          <button type="button" onClick={recenter} className="rounded-lg border border-stroke-soft-200 p-1.5 hover:bg-bg-weak-50" aria-label="Recentralizar">
            <RiFocus3Line className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 cursor-grab touch-none select-none active:cursor-grabbing"
        style={{ background: '#a5d98a' }}
        onPointerDown={(ev) => {
          drag.current = { px: ev.clientX, py: ev.clientY, ox: view.x, oy: view.y, moved: false }
        }}
        onPointerMove={(ev) => {
          if (!drag.current) return
          const d = drag.current
          if (Math.abs(ev.clientX - d.px) + Math.abs(ev.clientY - d.py) > 4) d.moved = true
          if (d.moved) setView((v) => ({ ...v, x: d.ox + ev.clientX - d.px, y: d.oy + ev.clientY - d.py }))
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <svg
          className="absolute left-0 top-0 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
            <g transform={`translate(${originX}, 0)`}>
              {ground}
              {items}
            </g>
          </g>
        </svg>

        {selected && cardPos && (
          <div
            className="absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-xl border border-stroke-soft-200 bg-bg-white-0 p-3 shadow-xl"
            style={{ left: cardPos.left, top: cardPos.top }}
            onPointerDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-label-sm text-text-strong-950">{selected.user.displayName}</p>
              <span className={cn('rounded-md px-1.5 py-0.5 text-paragraph-xs', PLAN_CHIP[selected.user.planTier])}>
                {planLabel(selected.user.planTier)}
              </span>
            </div>
            <dl className="mt-2 space-y-0.5 text-paragraph-xs text-text-sub-600">
              <div className="flex justify-between">
                <dt className="text-text-soft-400">Imagens importadas</dt>
                <dd>{selected.user.imagesUsed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-soft-400">Desde</dt>
                <dd>{fmtDateTime(selected.user.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-soft-400">Último import</dt>
                <dd>{selected.user.lastImportAt ? fmtDateTime(selected.user.lastImportAt) : '—'}</dd>
              </div>
            </dl>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onOpenUser(selected.user.id)}
                className="flex-1 rounded-lg bg-primary-base px-2 py-1.5 text-label-xs text-static-white hover:opacity-90"
              >
                Ver mais
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-stroke-soft-200 px-2 py-1.5 text-label-xs text-text-sub-600 hover:bg-bg-weak-50"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="border-t border-stroke-soft-200 bg-bg-white-0 px-5 py-2 text-paragraph-xs text-text-soft-400">
        Cada lote é um usuário · terra = slot vazio · 🌱 grama cresce com as imagens importadas · 🌾 trigo dourado = assinante · arraste para navegar, scroll para zoom
      </p>
    </div>
  )
}
