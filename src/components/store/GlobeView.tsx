'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { COUNTRY_CENTROIDS } from '@/lib/insta2figma/country-centroids'
import type { GlobeData } from '@/types/insta2figma'

export type GlobeMode = 'live' | 'analytics'

type Badge = {
  country: string
  lat: number
  lng: number
  label: string
  sub?: string
}

function badgesForMode(data: GlobeData, mode: GlobeMode): Badge[] {
  if (mode === 'live') {
    return data.live
      .filter((p) => COUNTRY_CENTROIDS[p.country])
      .map((p) => {
        const [lat, lng] = COUNTRY_CENTROIDS[p.country]
        const parts = [
          p.importing > 0 ? `${p.importing} importando` : null,
          p.searching > 0 ? `${p.searching} buscando` : null,
        ].filter(Boolean)
        return {
          country: p.country,
          lat,
          lng,
          label: `${Math.max(p.online, p.searching, p.importing)} online`,
          sub: parts.join(' · ') || undefined,
        }
      })
  }
  return data.analytics
    .filter((p) => p.images > 0 && COUNTRY_CENTROIDS[p.country])
    .map((p) => {
      const [lat, lng] = COUNTRY_CENTROIDS[p.country]
      return {
        country: p.country,
        lat,
        lng,
        label: p.images.toLocaleString('pt-BR'),
        sub: 'imagens',
      }
    })
}

/**
 * Projeção ortográfica lat/lng → tela, acompanhando a rotação (phi) e a
 * inclinação (theta) do cobe. Badge escondido quando o ponto está no
 * hemisfério de trás (z <= 0).
 * ponytail: sinais de phi/theta calibrados à mão contra o render do cobe —
 * se os marcadores derivarem dos pontos, ajustar aqui.
 */
function project(
  lat: number,
  lng: number,
  phi: number,
  theta: number,
  size: number,
): { x: number; y: number; visible: boolean } {
  const latR = (lat * Math.PI) / 180
  const lngR = (lng * Math.PI) / 180
  const a = phi + lngR - Math.PI / 2
  let x = Math.cos(latR) * Math.cos(a)
  let y = Math.sin(latR)
  let z = Math.cos(latR) * Math.sin(a) * -1

  const yT = y * Math.cos(theta) - z * Math.sin(theta) * -1
  const zT = y * Math.sin(theta) * -1 + z * Math.cos(theta)
  y = yT
  z = zT

  const r = size / 2
  return {
    x: size / 2 + x * r * -1,
    y: size / 2 - y * r,
    visible: z > 0.05,
  }
}

const THETA = 0.25

export default function GlobeView({
  data,
  mode,
  size = 720,
}: {
  data: GlobeData
  mode: GlobeMode
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const phiRef = useRef(0)
  // Arrasto: pointerId ativo (null = solto) + última posição x + velocidade p/ inércia.
  const dragRef = useRef<{ pointerId: number | null; lastX: number; velocity: number }>({
    pointerId: null,
    lastX: 0,
    velocity: 0,
  })

  const markerColor: [number, number, number] =
    mode === 'live' ? [0.9, 0.15, 0.15] : [0.2, 0.75, 0.35]

  useEffect(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    if (!canvas || !overlay) return

    const badges = badgesForMode(data, mode)
    const badgeEls = Array.from(
      overlay.querySelectorAll<HTMLDivElement>('[data-globe-badge]'),
    )

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: phiRef.current,
      theta: THETA,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 24_000,
      mapBrightness: 4,
      baseColor: [0.95, 0.95, 0.95],
      markerColor,
      glowColor: [1, 1, 1],
      opacity: 0.9,
      markers: badges.map((b) => ({
        location: [b.lat, b.lng],
        size: 0.06,
      })),
    })

    // Rotação contínua via rAF (cobe v2 não tem onRender): gira o globo e
    // reposiciona os badges HTML na mesma projeção a cada frame.
    let raf = 0
    const frame = () => {
      const drag = dragRef.current
      if (drag.pointerId === null) {
        // Solto: inércia decai até voltar à rotação automática.
        drag.velocity *= 0.95
        phiRef.current += 0.003 + drag.velocity
      }
      globe.update({ phi: phiRef.current })

      for (let i = 0; i < badges.length; i++) {
        const el = badgeEls[i]
        if (!el) continue
        const { x, y, visible } = project(
          badges[i].lat,
          badges[i].lng,
          phiRef.current,
          THETA,
          size,
        )
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -130%)`
        el.style.opacity = visible ? '1' : '0'
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      globe.destroy()
    }
  }, [data, mode, size, markerColor[0], markerColor[1], markerColor[2]])

  const badges = badgesForMode(data, mode)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block cursor-grab touch-none active:cursor-grabbing"
        aria-label="Globo de atividade por país"
        onPointerDown={(e) => {
          dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, velocity: 0 }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current
          if (drag.pointerId !== e.pointerId) return
          const delta = e.clientX - drag.lastX
          drag.lastX = e.clientX
          drag.velocity = delta * 0.005
          phiRef.current += delta * 0.005
        }}
        onPointerUp={(e) => {
          if (dragRef.current.pointerId === e.pointerId) dragRef.current.pointerId = null
        }}
        onPointerCancel={(e) => {
          if (dragRef.current.pointerId === e.pointerId) dragRef.current.pointerId = null
        }}
      />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {badges.map((b) => (
          <div
            key={`${mode}-${b.country}`}
            data-globe-badge
            className="absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap rounded-lg bg-neutral-900/90 px-3 py-1.5 font-mono text-xs text-white shadow-lg transition-opacity duration-150"
            style={{ opacity: 0 }}
          >
            {mode === 'live' ? (
              <>
                <span className="flex items-center gap-1.5 font-semibold tracking-wider text-red-500">
                  <span className="inline-block size-2 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
                <span className="text-neutral-500">|</span>
                <span>
                  {b.label}
                  {b.sub ? <span className="text-neutral-400"> · {b.sub}</span> : null}
                </span>
              </>
            ) : (
              <>
                <span className="inline-block size-2 rounded-full bg-green-500" />
                <span className="font-semibold">{b.label}</span>
                <span className="text-neutral-400">{b.sub}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
