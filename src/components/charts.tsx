import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtNum, fmtPp } from '../lib/format'
import { useThemeColors, type ThemeColors } from '../lib/theme'
import { COMPONENT_KEYS, COMPONENT_LABELS, type Components, type YearResult } from '../model/simulation'

export interface SeriesDef {
  key: string
  label: string
  color: string
  dashed?: boolean
  /** Sem rótulo direto (a legenda identifica a série) */
  noLabel?: boolean
  /** Rótulo curto no fim da linha (padrão: o rótulo sem "Bloco ") */
  shortLabel?: string
}

type Row = Record<string, number | string | null>

interface TooltipPayload {
  dataKey?: string | number
  value?: number | string
  color?: string
  name?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  format,
  labelPrefix,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
  series: SeriesDef[]
  format: (v: number) => string
  labelPrefix?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">
        {labelPrefix}
        {label}
      </div>
      <ul className="space-y-0.5">
        {series.map((s) => {
          const p = payload.find((x) => x.dataKey === s.key)
          if (!p || p.value === null || p.value === undefined) return null
          return (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-ink-2">
                <span className="inline-block h-0.5 w-3" style={{ background: s.color }} aria-hidden />
                {s.label}
              </span>
              <span className="tnum font-medium text-ink">{format(Number(p.value))}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="18"
              y2="4"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dashed ? '4 3' : undefined}
            />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  )
}

/** Gráfico de linhas ao longo dos anos, com legenda, rótulos diretos e tooltip. */
export function TimeSeriesChart({
  data,
  series,
  format,
  axisFormat,
  height = 260,
  zeroLine = false,
  xKey = 'year',
  fromZero = false,
}: {
  /** Eixo vertical começando em zero (evita exagerar variações pequenas) */
  fromZero?: boolean
  data: Row[]
  series: SeriesDef[]
  format: (v: number) => string
  axisFormat?: (v: number) => string
  height?: number
  zeroLine?: boolean
  xKey?: string
}) {
  const c = useThemeColors()
  const lastIndex = data.length - 1
  const directLabels = series.length <= 4 && data.length > 1
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: directLabels ? 44 : 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: c.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: c.axis }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: c.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => (axisFormat ?? format)(v)}
              domain={fromZero ? [0, 'auto'] : ['auto', 'auto']}
            />
            {zeroLine && <ReferenceLine y={0} stroke={c.axis} />}
            <Tooltip
              cursor={{ stroke: c.axis, strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as TooltipPayload[] | undefined}
                  label={props.label as string | number | undefined}
                  series={series}
                  format={format}
                />
              )}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                dot={data.length <= 2 ? { r: 4, fill: s.color, stroke: c.surface, strokeWidth: 2 } : false}
                activeDot={{ r: 5, fill: s.color, stroke: c.surface, strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
                label={
                  directLabels && !s.noLabel
                    ? (props: { index?: number; x?: number | string; y?: number | string }) =>
                        props.index === lastIndex ? (
                          <text
                            x={Number(props.x) + 6}
                            y={Number(props.y)}
                            dy={4}
                            fontSize={11}
                            fill={c['ink-2']}
                            key={`lbl-${s.key}`}
                          >
                            {s.shortLabel ?? s.label.replace('Bloco ', '')}
                          </text>
                        ) : (
                          <g key={`lbl-${s.key}-${props.index}`} />
                        )
                    : undefined
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function componentColors(c: ThemeColors): Record<keyof Components, string> {
  return {
    base: c['series-united'],
    fiscal: c['c-fiscal'],
    trade: c['c-trade'],
    transition: c['c-transition'],
    demography: c['c-demography'],
    resources: c['c-resources'],
    events: c['c-events'],
  }
}

/** Barras empilhadas (positivo para cima, negativo para baixo) decompondo o crescimento do ano. */
export function ComponentsChart({ result }: { result: YearResult }) {
  const c = useThemeColors()
  const colors = componentColors(c)
  const data = (['A', 'B'] as const).map((b) => ({
    name: `Bloco ${b}`,
    total: result[b].growth,
    ...result[b].components,
  }))
  const series: SeriesDef[] = COMPONENT_KEYS.map((k) => ({ key: k, label: COMPONENT_LABELS[k], color: colors[k] }))
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
            {s.label}
          </li>
        ))}
      </ul>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} stackOffset="sign" margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke={c.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: c['ink-2'], fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: c.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => `${fmtNum(v, 1)}`}
              unit=" p.p."
            />
            <ReferenceLine y={0} stroke={c.axis} />
            <Tooltip
              cursor={{ fill: c.grid, opacity: 0.4 }}
              content={(props) => {
                const p = props.payload?.[0]?.payload as (typeof data)[number] | undefined
                if (!props.active || !p) return null
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                    <div className="mb-1 font-semibold text-ink">
                      {p.name}: crescimento de {fmtNum(p.total, 2)}%
                    </div>
                    <ul className="space-y-0.5">
                      {series.map((s) => (
                        <li key={s.key} className="flex justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-ink-2">
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <span className="tnum text-ink">{fmtPp(p[s.key as keyof Components])}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId="g"
                fill={s.color}
                stroke={c.surface}
                strokeWidth={2}
                isAnimationActive={false}
                maxBarSize={88}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
