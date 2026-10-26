import { geoMercator, geoPath } from 'd3-geo'
import { useMemo, useState } from 'react'
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
}

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

export function BrazilMap({ fill, partition, selected, onSelect, flows = [], markers = [], tooltip, ariaLabel, height, showBorder = true }: MapProps) {
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

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="h-full w-full">
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
                onClick={() => onSelect?.(uf)}
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
