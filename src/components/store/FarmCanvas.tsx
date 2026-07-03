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
const ISLAND_DEPTH = 120 // dirt wall height below the grass top

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

/* Stateless hash for jagged island edges. */
function jag(i: number) {
  const f = Math.sin(i * 12.9898) * 43758.5453
  return f - Math.floor(f)
}

/* ── Palette (game art — intentionally not DS tokens) ────────────── */

const P = {
  grass: '#7fc462',
  grassLine: '#6fb254',
  grassLip: '#5a9c46',
  dirt: '#8a5f3c',
  dirtDark: '#6f4a2d',
  dirtLine: '#7b5334',
  soil: '#c98a4b',
  soilLine: '#b0773d',
  sprout: '#4c9b3c',
  growing: '#5fae3f',
  growingDark: '#478c2f',
  wheat: '#f4b23c',
  wheatDark: '#c78a1f',
  wheatTile: '#eaa945',
  water: '#4d9fe0',
  waterDeep: '#3c8bcc',
  waterLight: '#a8d4f2',
  wood: '#8a5a33',
  woodDark: '#66421f',
  trunk: '#6f4a2b',
  siloBody: '#dde2e6',
  siloShade: '#a8b1b9',
  siloTop: '#3aa05c',
  turbine: '#f4f6f8',
  turbineShade: '#c2c9cf',
  panel: '#22375c',
  rock: '#98a0a7',
  rockDark: '#7c848c',
}

const TREE_TONES: [string, string, string][] = [
  ['#2e7d3a', '#419a4b', '#57b45c'],
  ['#276f36', '#3a8f46', '#4fae55'],
  ['#356e2c', '#4a9440', '#63b054'],
]

/* ── Scenery generation ──────────────────────────────────────────── */

type Deco =
  | { kind: 'tree'; x: number; y: number; s: number; tone: number }
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

  // River: a drifting band crossing the top-left corner of the island.
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

  const siloX = side + 2
  const siloY = -3
  if (take(siloX, siloY)) decos.push({ kind: 'silo', x: siloX, y: siloY })

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

  for (let x = lo; x < hi; x++) {
    for (let y = lo; y < hi; y++) {
      if (inPlantation(x, y) || used.has(key(x, y))) continue
      const r = rand()
      if (r < 0.14) {
        used.add(key(x, y))
        decos.push({ kind: 'tree', x, y, s: 0.7 + rand() * 0.6, tone: Math.floor(rand() * 3) })
      } else if (r < 0.16) {
        used.add(key(x, y))
        decos.push({ kind: 'rock', x, y })
      }
    }
  }

  return { river, decos }
}

/* ── Island walls (grass lip + thick dirt, jagged bottom) ────────── */

function IslandSides({ lo, hi }: { lo: number; hi: number }) {
  const W = iso(lo, hi)
  const S = iso(hi, hi)
  const E = iso(hi, lo)

  // Jagged bottom outline for one face, from corner a to corner b.
  const jaggedFace = (a: { sx: number; sy: number }, b: { sx: number; sy: number }, seed: number) => {
    const steps = 9
    const pts: string[] = [`${a.sx},${a.sy}`, `${b.sx},${b.sy}`]
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const x = a.sx + (b.sx - a.sx) * t
      const y = a.sy + (b.sy - a.sy) * t
      const depth = ISLAND_DEPTH - 14 - jag(seed + i) * 34 - Math.sin(t * Math.PI) * -8
      pts.push(`${x},${y + depth}`)
    }
    return pts.join(' ')
  }

  return (
    <g>
      {/* dirt walls */}
      <polygon points={jaggedFace(W, S, 7)} fill={P.dirt} />
      <polygon points={jaggedFace(S, E, 31)} fill={P.dirtDark} />
      {/* strata lines for texture */}
      {[26, 52, 80].map((d, i) => (
        <g key={d} opacity={0.5 - i * 0.12}>
          <line x1={W.sx} y1={W.sy + d} x2={S.sx} y2={S.sy + d} stroke={P.dirtLine} strokeWidth={1.4} />
          <line x1={S.sx} y1={S.sy + d} x2={E.sx} y2={E.sy + d} stroke={P.dirtLine} strokeWidth={1.4} />
        </g>
      ))}
      {/* embedded rocks on the walls */}
      {[0.18, 0.42, 0.66, 0.88].map((t, i) => {
        const x = W.sx + (S.sx - W.sx) * t
        const y = W.sy + (S.sy - W.sy) * t + 30 + jag(i + 3) * 40
        return <ellipse key={`wl${i}`} cx={x} cy={y} rx={5 + jag(i) * 4} ry={3.5} fill={P.dirtDark} opacity={0.7} />
      })}
      {[0.22, 0.5, 0.78].map((t, i) => {
        const x = S.sx + (E.sx - S.sx) * t
        const y = S.sy + (E.sy - S.sy) * t + 34 + jag(i + 11) * 36
        return <ellipse key={`wr${i}`} cx={x} cy={y} rx={5 + jag(i + 5) * 4} ry={3.5} fill="#5c3d24" opacity={0.7} />
      })}
      {/* grass lip hanging over the edge */}
      <polygon points={`${W.sx},${W.sy} ${S.sx},${S.sy} ${S.sx},${S.sy + 12} ${W.sx},${W.sy + 12}`} fill={P.grassLip} />
      <polygon points={`${S.sx},${S.sy} ${E.sx},${E.sy} ${E.sx},${E.sy + 12} ${S.sx},${S.sy + 12}`} fill="#4c8a3b" />
    </g>
  )
}

/* ── Sprites ─────────────────────────────────────────────────────── */

function Tree({ x, y, s, tone }: { x: number; y: number; s: number; tone: number }) {
  const c = iso(x + 0.5, y + 0.5)
  const [dark, mid, light] = TREE_TONES[tone % TREE_TONES.length]
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={3} rx={11 * s} ry={4.5 * s} fill="rgba(30,60,20,0.22)" />
      <path d={`M ${-2 * s} 0 L ${-1.2 * s} ${-9 * s} L ${1.2 * s} ${-9 * s} L ${2 * s} 0 Z`} fill={P.trunk} />
      {/* canopy: dark base, mid body, light top + highlight */}
      <circle cx={0} cy={-13 * s} r={9.5 * s} fill={dark} />
      <circle cx={-4.5 * s} cy={-16 * s} r={7 * s} fill={mid} />
      <circle cx={4 * s} cy={-16 * s} r={6.5 * s} fill={mid} />
      <circle cx={0} cy={-20 * s} r={6.5 * s} fill={light} />
      <circle cx={-2.5 * s} cy={-21.5 * s} r={2.6 * s} fill="rgba(255,255,255,0.28)" />
    </g>
  )
}

function Rock({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={2.5} rx={8} ry={3.2} fill="rgba(30,60,20,0.2)" />
      <path d="M -6 1 L -4 -4 L 0 -6 L 5 -4 L 7 0 L 3 3 L -3 3 Z" fill={P.rock} />
      <path d="M 0 -6 L 5 -4 L 7 0 L 3 3 L 1 3 Z" fill={P.rockDark} />
    </g>
  )
}

function Turbine({ x, y, delay }: { x: number; y: number; delay: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={2} rx={9} ry={3.5} fill="rgba(30,60,20,0.2)" />
      <path d="M -3 0 L -1.2 -40 L 1.2 -40 L 3 0 Z" fill={P.turbine} stroke={P.turbineShade} strokeWidth={0.8} />
      {/* nacelle + rotor; rotor plane slightly squashed for perspective */}
      <g transform="translate(0, -42)">
        <ellipse cx={0} cy={2} rx={3.4} ry={2.4} fill={P.turbineShade} />
        <g transform="scale(0.88 1)">
          {/* SMIL rotate spins around the local origin = the hub itself */}
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="4.5s"
              begin={`${-delay}s`}
              repeatCount="indefinite"
            />
            {[0, 120, 240].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <path d="M 0 0 L -2.4 -5 L -0.8 -24 L 1.6 -24 L 2.4 -5 Z" fill={P.turbine} stroke={P.turbineShade} strokeWidth={0.7} />
              </g>
            ))}
          </g>
        </g>
        <circle r={2.6} fill="#eef1f4" stroke={P.turbineShade} strokeWidth={0.8} />
      </g>
    </g>
  )
}

function Panels({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={3} rx={13} ry={4} fill="rgba(30,60,20,0.16)" />
      <line x1={-9} y1={3} x2={-9} y2={-2} stroke="#5d666e" strokeWidth={1.6} />
      <line x1={9} y1={3} x2={9} y2={-2} stroke="#5d666e" strokeWidth={1.6} />
      <polygon points={diamond(-0.5, -0.5, 0.22)} fill={P.panel} stroke="#16233d" strokeWidth={1} transform="translate(0,-4)" />
      {/* cell grid + glare */}
      <polygon points={diamond(-0.5, -0.5, 0.36)} fill="none" stroke="#41598a" strokeWidth={0.8} transform="translate(0,-4)" />
      <line x1={-12} y1={-4} x2={12} y2={-4} stroke="#41598a" strokeWidth={0.7} />
      <line x1={-5} y1={-9} x2={4} y2={-6} stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  )
}

function Silo({ x, y }: { x: number; y: number }) {
  const c = iso(x + 0.5, y + 0.5)
  return (
    <g transform={`translate(${c.sx}, ${c.sy})`}>
      <ellipse cx={0} cy={4} rx={17} ry={7} fill="rgba(30,60,20,0.22)" />
      <path d="M -13 0 A 13 6 0 0 0 13 0 L 13 -44 L -13 -44 Z" fill={P.siloBody} />
      <path d="M 1 3.8 A 13 6 0 0 0 13 0 L 13 -44 L 1 -44 Z" fill={P.siloShade} opacity={0.5} />
      <path d="M -13 0 L -13 -44 L -9 -44 L -9 -1.5 Z" fill="#ffffff" opacity={0.45} />
      <ellipse cx={0} cy={-44} rx={13} ry={6} fill={P.siloShade} />
      <path d="M -13 -44 A 13 6 0 0 1 13 -44 A 13 13 0 0 0 0 -57 A 13 13 0 0 0 -13 -44 Z" fill={P.siloTop} />
      <path d="M -13 -44 A 13 13 0 0 1 -4 -56 L -4 -49 A 13 6 0 0 0 -13 -44 Z" fill="#5cbf7c" opacity={0.8} />
      {[-32, -20, -8].map((yy) => (
        <path key={yy} d={`M -13 ${yy} A 13 6 0 0 0 13 ${yy}`} fill="none" stroke="#949ea6" strokeWidth={1} />
      ))}
      <rect x={-2.5} y={-12} width={5} height={12} rx={1} fill="#7d8790" />
    </g>
  )
}

function FenceEdge({ x, y, edge }: { x: number; y: number; edge: 'N' | 'S' | 'W' | 'E' }) {
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
  const H = 11
  return (
    <g>
      {[a, b].map((p, i) => (
        <g key={i}>
          <line x1={p.sx} y1={p.sy} x2={p.sx} y2={p.sy - H} stroke={P.woodDark} strokeWidth={3} strokeLinecap="round" />
          <line x1={p.sx - 0.8} y1={p.sy - 1} x2={p.sx - 0.8} y2={p.sy - H + 1} stroke={P.wood} strokeWidth={1} strokeLinecap="round" />
        </g>
      ))}
      <line x1={a.sx} y1={a.sy - H + 2.5} x2={b.sx} y2={b.sy - H + 2.5} stroke={P.wood} strokeWidth={2.2} />
      <line x1={a.sx} y1={a.sy - H + 6.5} x2={b.sx} y2={b.sy - H + 6.5} stroke={P.woodDark} strokeWidth={2.2} />
    </g>
  )
}

/* Crop tile: bare soil for empty slots AND never-exported users;
   grass grows only after the first import; golden wheat = subscriber. */
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
  const exported = user != null && user.imagesUsed > 0
  const growth = user ? Math.min(1, user.imagesUsed / growthCap) : 0

  const base = paid ? P.wheatTile : P.soil
  const line = paid ? P.wheatDark : P.soilLine

  const stalks: { sx: number; sy: number; v: number }[] = []
  if (paid || exported) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const p = iso(x + 0.2 + i * 0.3, y + 0.2 + j * 0.3)
        stalks.push({ sx: p.sx, sy: p.sy, v: jag(x * 31 + y * 17 + i * 3 + j) })
      }
    }
  }
  const h = paid ? 15 : 3 + growth * 11

  return (
    <g
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={user ? onClick : undefined}
      style={{ cursor: user ? 'pointer' : 'default' }}
    >
      <polygon points={diamond(x, y, 0.04)} fill={base} stroke={line} strokeWidth={1} />
      {[0.3, 0.55, 0.8].map((t) => {
        const a = iso(x + t, y + 0.08)
        const b = iso(x + t, y + 0.92)
        return <line key={t} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={line} strokeWidth={0.8} opacity={0.55} />
      })}
      {stalks.map((s, i) => {
        const hh = h * (0.85 + s.v * 0.3)
        const lean = (s.v - 0.5) * 2.4
        const color = paid ? (s.v > 0.5 ? P.wheat : P.wheatDark) : s.v > 0.5 ? P.growing : P.growingDark
        return (
          <g key={i}>
            <line x1={s.sx} y1={s.sy} x2={s.sx + lean} y2={s.sy - hh} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
            {paid && (
              <g transform={`translate(${s.sx + lean}, ${s.sy - hh - 2})`}>
                <ellipse rx={1.9} ry={3.6} fill={P.wheat} stroke={P.wheatDark} strokeWidth={0.6} />
                <line x1={0} y1={-3} x2={1.6} y2={-5.5} stroke={P.wheatDark} strokeWidth={0.6} />
                <line x1={0} y1={-3} x2={-1.6} y2={-5.5} stroke={P.wheatDark} strokeWidth={0.6} />
              </g>
            )}
          </g>
        )
      })}
      {hovered && user && (
        <polygon points={diamond(x, y, 0.02)} fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth={1.5} />
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
  const originX = (hi - lo) * (TW / 2)

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

  const ground = useMemo(() => {
    const cells: React.ReactNode[] = []
    for (let x = lo; x < hi; x++) {
      for (let y = lo; y < hi; y++) {
        const isRiver = scenery.river.has(`${x},${y}`)
        if (isRiver) {
          const c = iso(x + 0.5, y + 0.5)
          cells.push(
            <g key={`g${x},${y}`}>
              <polygon points={diamond(x, y)} fill={P.waterDeep} />
              <polygon points={diamond(x, y, 0.12)} fill={P.water} />
              <line
                x1={c.sx - 12}
                y1={c.sy}
                x2={c.sx + 12}
                y2={c.sy}
                stroke={P.waterLight}
                strokeWidth={1.4}
                strokeLinecap="round"
                className="farm-wave"
              />
            </g>,
          )
        } else {
          cells.push(
            <polygon
              key={`g${x},${y}`}
              points={diamond(x, y)}
              fill={P.grass}
              stroke={P.grassLine}
              strokeWidth={0.5}
            />,
          )
        }
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
        @keyframes farm-bob { from { transform: translateY(0); } to { transform: translateY(7px); } }
        .farm-island { animation: farm-bob 5.5s ease-in-out infinite alternate; }
        @keyframes farm-wave { to { stroke-dashoffset: -18; } }
        .farm-wave { stroke-dasharray: 5 4; animation: farm-wave 2.4s linear infinite; opacity: 0.85; }
        @keyframes farm-cloud { from { transform: translateX(-8%); } to { transform: translateX(8%); } }
        .farm-cloud { animation: farm-cloud 24s ease-in-out infinite alternate; }
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
        style={{ background: 'linear-gradient(180deg, #8ec8ec 0%, #b6ddf4 55%, #d4ecf9 100%)' }}
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
        {/* clouds drifting behind the island */}
        {[
          { top: '12%', left: '8%', s: 1, o: 0.9, d: '0s' },
          { top: '28%', left: '68%', s: 1.4, o: 0.75, d: '-8s' },
          { top: '62%', left: '18%', s: 0.8, o: 0.6, d: '-15s' },
          { top: '70%', left: '75%', s: 1.1, o: 0.7, d: '-4s' },
        ].map((cl, i) => (
          <div
            key={i}
            className="farm-cloud pointer-events-none absolute"
            style={{ top: cl.top, left: cl.left, opacity: cl.o, animationDelay: cl.d, transform: `scale(${cl.s})` }}
          >
            <div className="relative h-8 w-28 rounded-full bg-white/90 blur-[1px]">
              <div className="absolute -top-4 left-5 size-10 rounded-full bg-white/90" />
              <div className="absolute -top-2 left-14 size-8 rounded-full bg-white/85" />
            </div>
          </div>
        ))}

        <svg className="absolute left-0 top-0 h-full w-full" style={{ overflow: 'visible' }}>
          <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
            <g className="farm-island">
              <g transform={`translate(${originX}, 0)`}>
                {/* shadow far below the floating island */}
                <ellipse
                  cx={iso(side / 2, side / 2).sx}
                  cy={iso(side / 2, side / 2).sy + ISLAND_DEPTH + 110}
                  rx={(hi - lo) * 16}
                  ry={26}
                  fill="rgba(40,70,110,0.18)"
                />
                <IslandSides lo={lo} hi={hi} />
                {ground}
                {items}
              </g>
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
        Cada lote é um usuário · solo nu = vazio ou sem imports · 🌱 grama cresce com as imagens importadas · 🌾 trigo dourado = assinante · arraste para navegar, scroll para zoom
      </p>
    </div>
  )
}
