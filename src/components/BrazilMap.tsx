import { geoMercator, geoPath } from 'd3-geo'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import { useThemeColors } from '../lib/theme'
import topo from '../model/br-uf.topo.json'
import type { ClimateKind } from '../model/climate'
import { UF_BY_ID } from '../model/ibge'
import type { UF } from '../model/states'

const WIDTH = 600
const HEIGHT = 600

type UfProps = { codarea: string }

const topology = topo as unknown as Topology<{ BRUF: GeometryCollection<UfProps> }>
const states = feature(topology, topology.objects.BRUF) as unknown as FeatureCollection<Geometry, UfProps>
const projection = geoMercator().fitExtent(
  [
    [12, 12],
    [WIDTH - 12, HEIGHT - 12],
  ],
  states,
)
const path = geoPath(projection)
const ufOf = (f: { properties: UfProps }): UF => UF_BY_ID[Number(f.properties.codarea)]
const CENTROIDS = Object.fromEntries(states.features.map((f) => [ufOf(f), path.centroid(f)])) as Record<UF, [number, number]>
// Ajustes de rótulo para estados pequenos ou de forma irregular.
const LABEL_OFFSET: Partial<Record<UF, [number, number]>> = {
  DF: [10, -6],
  SE: [12, 6],
  AL: [16, 2],
  PB: [18, 0],
  RN: [14, -6],
  PE: [20, 4],
  ES: [14, 4],
  RJ: [10, 10],
  SC: [16, 2],
}

export interface MapFlow {
  from: [number, number]
  to: [number, number]
  /** Espessura relativa, 0 a 1 */
  weight: number
  label: string
  kind: 'migracao' | 'empresas'
}

export interface MapMarker {
  uf: UF
  kind: ClimateKind | 'eleicao' | 'tribunal' | 'economia'
  title: string
}

export interface MapProps {
  /** Cor de preenchimento por UF */
  fill: (uf: UF) => string
  /** Lado de cada UF, para desenhar a fronteira entre blocos */
  partition: Record<UF, 'A' | 'B'>
  selected?: UF | null
  onSelect?: (uf: UF) => void
  flows?: MapFlow[]
  markers?: MapMarker[]
  /** Texto de dica por UF */
  tooltip?: (uf: UF) => string
  ariaLabel: string
  height?: number | string
  /** Desenha a fronteira entre os blocos (desligar com o país unido) */
  showBorder?: boolean
  /** Permite ampliar (pinça, roda do mouse, botões) e arrastar o mapa */
  zoomable?: boolean
}

interface View {
  k: number
  x: number
  y: number
}

const MAX_ZOOM = 6

const ICON: Record<MapMarker['kind'], string> = {
  seca: '☀',
  enchente: '☔',
  queimada: '🔥',
  apagao: '⚡',
  'falta-agua': '💧',
  eleicao: '🗳',
  tribunal: '⚖',
  economia: '📈',
}

/** Centro populacional aproximado de um conjunto de UFs (média ponderada dos centroides). */
export function weightedCentroid(ufs: UF[], weight: (uf: UF) => number): [number, number] {
  let x = 0
  let y = 0
  let w = 0
  for (const u of ufs) {
    const c = CENTROIDS[u]
    const k = weight(u)
    x += c[0] * k
    y += c[1] * k
    w += k
  }
  return w === 0 ? [WIDTH / 2, HEIGHT / 2] : [x / w, y / w]
}

export function BrazilMap({ fill, partition, selected, onSelect, flows = [], markers = [], tooltip, ariaLabel, height, showBorder = true, zoomable = false }: MapProps) {
  const c = useThemeColors()
  const [hover, setHover] = useState<UF | null>(null)

  const border = useMemo(
    () =>
      path(
        mesh(topology, topology.objects.BRUF, (a, b) => {
          const ua = UF_BY_ID[Number((a as unknown as { properties: UfProps }).properties.codarea)]
          const ub = UF_BY_ID[Number((b as unknown as { properties: UfProps }).properties.codarea)]
          return a !== b && partition[ua] !== partition[ub]
        }),
      ) ?? '',
    [partition],
  )

  const markersByUf = new Map<UF, MapMarker[]>()
  for (const m of markers) markersByUf.set(m.uf, [...(markersByUf.get(m.uf) ?? []), m])

  // Zoom e arraste -------------------------------------------------------------
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; view: View; mid: [number, number] } | null>(null)
  const moved = useRef(false)

  const clampView = (v: View): View => {
    const k = Math.min(MAX_ZOOM, Math.max(1, v.k))
    const w = WIDTH / k
    const h = HEIGHT / k
    return { k, x: Math.min(WIDTH - w, Math.max(0, v.x)), y: Math.min(HEIGHT - h, Math.max(0, v.y)) }
  }
  /** Converte coordenadas da tela para o sistema do mapa, respeitando o enquadramento do SVG. */
  const toMap = (clientX: number, clientY: number, v: View): [number, number] => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return [WIDTH / 2, HEIGHT / 2]
    const w = WIDTH / v.k
    const h = HEIGHT / v.k
    const scale = Math.min(r.width / w, r.height / h)
    const ox = (r.width - w * scale) / 2
    const oy = (r.height - h * scale) / 2
    return [v.x + (clientX - r.left - ox) / scale, v.y + (clientY - r.top - oy) / scale]
  }
  const zoomAt = (factor: number, center: [number, number], from: View = view) => {
    const k = Math.min(MAX_ZOOM, Math.max(1, from.k * factor))
    const ratio = from.k / k
    setView(clampView({ k, x: center[0] - (center[0] - from.x) * ratio, y: center[1] - (center[1] - from.y) * ratio }))
  }
  useEffect(() => {
    const el = svgRef.current
    if (!zoomable || !el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setView((v) => {
        const c = toMap(e.clientX, e.clientY, v)
        const k = Math.min(MAX_ZOOM, Math.max(1, v.k * (e.deltaY < 0 ? 1.25 : 0.8)))
        const ratio = v.k / k
        return clampView({ k, x: c[0] - (c[0] - v.x) * ratio, y: c[1] - (c[1] - v.y) * ratio })
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomable])

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!zoomable) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view, mid: toMap((a.x + b.x) / 2, (a.y + b.y) / 2, view) }
    }
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!zoomable || !pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)!
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()]
      const g = gesture.current
      moved.current = true
      zoomAt(Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, g.dist), g.mid, g.view)
      return
    }
    if (pointers.current.size === 1 && view.k > 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true
      const r = svgRef.current?.getBoundingClientRect()
      if (!r) return
      const scale = Math.min(r.width / (WIDTH / view.k), r.height / (HEIGHT / view.k))
      setView((v) => clampView({ ...v, x: v.x - dx / scale, y: v.y - dy / scale }))
    }
  }
  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) gesture.current = null
  }
  const select = (uf: UF) => {
    if (moved.current) return
    onSelect?.(uf)
  }
  const vb = `${view.x} ${view.y} ${WIDTH / view.k} ${HEIGHT / view.k}`

  return (
    <div className="relative" style={{ height }}>
      <svg
        ref={svgRef}
        viewBox={vb}
        role="img"
        aria-label={ariaLabel}
        className="h-full w-full"
        style={zoomable ? { touchAction: view.k > 1 ? 'none' : 'pan-y' } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <marker id="arrow-mig" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c.ink} />
          </marker>
          <marker id="arrow-emp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c['ink-2']} />
          </marker>
        </defs>
        <g>
          {states.features.map((f) => {
            const uf = ufOf(f)
            const isSel = selected === uf
            return (
              <path
                key={uf}
                d={path(f) ?? ''}
                fill={fill(uf)}
                stroke={isSel ? c.ink : c.surface}
                strokeWidth={isSel ? 2.5 : 1}
                className={onSelect ? 'cursor-pointer' : undefined}
                onMouseEnter={() => setHover(uf)}
                onMouseLeave={() => setHover((h) => (h === uf ? null : h))}
                onClick={() => select(uf)}
                tabIndex={onSelect ? 0 : -1}
                role={onSelect ? 'button' : undefined}
                aria-label={tooltip ? tooltip(uf) : uf}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelect(uf)
                  }
                }}
              />
            )
          })}
        </g>
        {showBorder && <path d={border} fill="none" stroke={c.ink} strokeWidth={2.5} strokeLinejoin="round" pointerEvents="none" />}
        <g pointerEvents="none">
          {states.features.map((f) => {
            const uf = ufOf(f)
            const [x, y] = CENTROIDS[uf]
            const [dx, dy] = LABEL_OFFSET[uf] ?? [0, 0]
            return (
              <text
                key={uf}
                x={x + dx}
                y={y + dy}
                textAnchor="middle"
                dy={4}
                fontSize={11}
                fontWeight={600}
                fill={c.ink}
                stroke={c.surface}
                strokeWidth={3}
                paintOrder="stroke"
              >
                {uf}
              </text>
            )
          })}
        </g>
        <g pointerEvents="none">
          {flows.map((fl, i) => {
            const [x1, y1] = fl.from
            const [x2, y2] = fl.to
            const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25
            const my = (y1 + y2) / 2 - (x2 - x1) * 0.25
            const w = 1.5 + 6 * Math.min(1, Math.max(0, fl.weight))
            const color = fl.kind === 'migracao' ? c.ink : c['ink-2']
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={w}
                  strokeOpacity={0.85}
                  strokeDasharray={fl.kind === 'migracao' ? '10 6' : '3 5'}
                  strokeLinecap="round"
                  className="map-flow"
                  markerEnd={`url(#${fl.kind === 'migracao' ? 'arrow-mig' : 'arrow-emp'})`}
                />
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  fontSize={11}
                  fill={c.ink}
                  stroke={c.surface}
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {fl.label}
                </text>
              </g>
            )
          })}
        </g>
        <g pointerEvents="none">
          {[...markersByUf.entries()].map(([uf, ms]) => {
            const [x, y] = CENTROIDS[uf]
            return ms.slice(0, 2).map((m, i) => {
              const cx = x + 14 + i * 18
              const cy = y - 14
              return (
                <g key={`${uf}-${i}`}>
                  <circle cx={cx} cy={cy} r={11} fill={c['c-events']} opacity={0.35} className="map-pulse" />
                  <circle cx={cx} cy={cy} r={10} fill={c.surface} stroke={c['c-events']} strokeWidth={2} />
                  <text x={cx} y={cy} textAnchor="middle" dy={4} fontSize={11}>
                    {ICON[m.kind]}
                  </text>
                </g>
              )
            })
          })}
        </g>
      </svg>
      {zoomable && (
        <div className="absolute right-2 bottom-2 flex flex-col overflow-hidden rounded-lg border border-line bg-surface/90 shadow">
          <button type="button" aria-label="Ampliar o mapa" className="grid size-9 place-items-center text-lg text-ink hover:bg-surface-2" onClick={() => zoomAt(1.5, [view.x + WIDTH / view.k / 2, view.y + HEIGHT / view.k / 2])}>
            +
          </button>
          <button type="button" aria-label="Reduzir o mapa" className="grid size-9 place-items-center border-t border-line text-lg text-ink hover:bg-surface-2" onClick={() => zoomAt(1 / 1.5, [view.x + WIDTH / view.k / 2, view.y + HEIGHT / view.k / 2])}>
            −
          </button>
          {view.k > 1 && (
            <button type="button" aria-label="Ver o Brasil inteiro" className="grid size-9 place-items-center border-t border-line text-sm text-ink hover:bg-surface-2" onClick={() => setView({ k: 1, x: 0, y: 0 })}>
              ⟲
            </button>
          )}
        </div>
      )}
      {hover && tooltip && (
        <div className="pointer-events-none absolute top-2 left-2 max-w-[70%] rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-lg">
          {tooltip(hover)}
          {markersByUf.get(hover)?.map((m) => (
            <div key={m.title} className="mt-1 text-ink-2">
              {ICON[m.kind]} {m.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
