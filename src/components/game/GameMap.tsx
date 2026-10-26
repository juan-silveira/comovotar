import { useState } from 'react'
import { fmtBRLFull, fmtNum, fmtSignedPct } from '../../lib/format'
import { diverging, sequential } from '../../lib/scales'
import { useThemeColors } from '../../lib/theme'
import type { Baseline } from '../../model/baseline'
import type { Partition } from '../../model/partition'
import type { YearResult } from '../../model/simulation'
import { ALL_UFS, type UF } from '../../model/states'
import { BrazilMap, weightedCentroid, type MapFlow, type MapMarker } from '../BrazilMap'
import { Segmented } from '../ui'

type Layer = 'blocos' | 'renda' | 'crescimento' | 'separacao' | 'clima'

const LAYERS: { value: Layer; label: string }[] = [
  { value: 'blocos', label: 'Blocos' },
  { value: 'renda', label: 'Renda' },
  { value: 'crescimento', label: 'Crescimento' },
  { value: 'separacao', label: 'vs. sem separação' },
  { value: 'clima', label: 'Clima' },
]

const LAYER_HELP: Record<Layer, (separated: boolean) => string> = {
  blocos: (sep) =>
    sep ? 'Cada cor é um dos dois países formados na separação.' : 'As duas macrorregiões: Centro-Sul e Norte-Nordeste.',
  renda: () => 'Renda média por pessoa (PIB per capita) de cada estado: quanto mais forte o azul, maior a renda.',
  crescimento: () => 'Quanto a economia de cada estado cresceu no ano: azul acima de 2%, vermelho abaixo.',
  separacao: () => 'Renda de cada estado comparada com a tendência histórica: azul acima, vermelho abaixo.',
  clima: () => 'Danos causados por secas, enchentes e queimadas nos últimos 5 anos: quanto mais forte, mais danos.',
}

function climateLoad(results: YearResult[], t: number, uf: UF) {
  let s = 0
  for (let k = Math.max(1, t - 4); k <= t; k++) s += results[k]?.uf[uf].climateDamage ?? 0
  return s
}

export function GameMap({
  results,
  t,
  partition,
  baseline,
  highlight,
  onSelect,
  separated = true,
  mapHeight,
}: {
  results: YearResult[]
  t: number
  partition: Partition
  baseline: Baseline
  highlight?: UF | null
  onSelect?: (uf: UF) => void
  /** País separado: mostra a fronteira e o rótulo "Blocos" */
  separated?: boolean
  /** Altura do mapa (CSS); sem valor, o mapa usa a largura disponível */
  mapHeight?: string
}) {
  const c = useThemeColors()
  const [layer, setLayer] = useState<Layer>('renda')
  const [picked, setPicked] = useState<UF | null>(null)
  const layers = LAYERS.map((l) => (l.value === 'blocos' && !separated ? { ...l, label: 'Macrorregiões' } : l))
  const r = results[t]
  const pcs = ALL_UFS.map((u) => r.uf[u].gdpPc)
  const minPc = Math.min(...pcs)
  const maxPc = Math.max(...pcs)
  const maxClimate = Math.max(1, ...ALL_UFS.map((u) => climateLoad(results, t, u)))

  const fill = (u: UF) => {
    const x = r.uf[u]
    switch (layer) {
      case 'blocos':
        return partition[u] === 'A' ? c['series-a'] : c['series-b']
      case 'renda':
        return sequential(Math.log(x.gdpPc / minPc) / Math.log(maxPc / minPc))
      case 'crescimento':
        return t === 0 ? diverging(0, 1) : diverging(x.growth - 2, 3)
      case 'separacao':
        return diverging(x.vsNoSeparation, 20)
      case 'clima':
        return sequential(climateLoad(results, t, u) / maxClimate)
    }
  }

  // Fluxos: migração (do bloco de menor renda para o de maior) e empresas.
  const flows: MapFlow[] = []
  if (t > 0) {
    const ufsA = ALL_UFS.filter((u) => partition[u] === 'A')
    const ufsB = ALL_UFS.filter((u) => partition[u] === 'B')
    const cA = weightedCentroid(ufsA, (u) => r.uf[u].pop)
    const cB = weightedCentroid(ufsB, (u) => r.uf[u].pop)
    const mig = r.A.netMigration
    if (Math.abs(mig) > 500) {
      flows.push({
        from: mig > 0 ? cB : cA,
        to: mig > 0 ? cA : cB,
        weight: Math.abs(mig) / 200_000,
        label: `${fmtNum(Math.abs(mig) / 1000, 0)} mil pessoas`,
        kind: 'migracao',
      })
    }
    const firms = r.A.firmFlow
    if (Math.abs(firms) > 1e8) {
      flows.push({
        from: firms > 0 ? weightedCentroid(ufsB, (u) => r.uf[u].gdp) : weightedCentroid(ufsA, (u) => r.uf[u].gdp),
        to: firms > 0 ? weightedCentroid(ufsA, (u) => r.uf[u].gdp) : weightedCentroid(ufsB, (u) => r.uf[u].gdp),
        weight: Math.abs(firms) / 2e10,
        label: `empresas: R$ ${fmtNum(Math.abs(firms) / 1e9, 1)} bi`,
        kind: 'empresas',
      })
    }
  }
  const markers: MapMarker[] = r.climateEvents.map((e) => ({ uf: e.uf, kind: e.kind, title: e.title }))

  const tooltip = (u: UF) => {
    const x = r.uf[u]
    return `${baseline.states[u].name} (${u}) · ${separated ? `Bloco ${partition[u]}` : 'Brasil'} · PIB per capita ${fmtBRLFull(x.gdpPc)} · crescimento ${
      t === 0 ? '—' : fmtSignedPct(x.growth, 1)
    } · vs. sem separação ${fmtSignedPct(x.vsNoSeparation, 1)}`
  }

  return (
    <div>
      <div className="mb-2 overflow-x-auto">
        <Segmented label="Camada do mapa" value={layer} onChange={setLayer} options={layers} />
      </div>
      <BrazilMap
        zoomable
        ariaLabel={`Mapa do Brasil em ${r.year}, camada ${LAYERS.find((l) => l.value === layer)?.label}`}
        fill={fill}
        partition={partition}
        selected={picked ?? highlight}
        onSelect={(u) => {
          setPicked((p) => (p === u ? null : u))
          onSelect?.(u)
        }}
        flows={flows}
        markers={markers}
        tooltip={tooltip}
        showBorder={separated}
        height={mapHeight}
      />
      {picked && (
        <div className="tnum mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg bg-surface-2 p-3 text-xs text-ink-2 sm:grid-cols-4">
          <div className="col-span-2 text-sm font-semibold text-ink sm:col-span-4">
            {baseline.states[picked].name} ({picked}){separated ? ` · Bloco ${partition[picked]}` : ''}
          </div>
          <div>
            Renda por pessoa: <strong className="text-ink">{fmtBRLFull(r.uf[picked].gdpPc)}</strong>
          </div>
          <div>
            Crescimento: <strong className="text-ink">{t === 0 ? '—' : fmtSignedPct(r.uf[picked].growth, 1)}</strong>
          </div>
          <div>
            vs. tendência: <strong className="text-ink">{fmtSignedPct(r.uf[picked].vsNoSeparation, 1)}</strong>
          </div>
          <div>
            População: <strong className="text-ink">{fmtNum(r.uf[picked].pop / 1e6, 1)} mi</strong>
          </div>
        </div>
      )}
      <p className="mt-1 text-xs text-ink-2">{LAYER_HELP[layer](separated)}</p>
      <Legend layer={layer} minPc={minPc} maxPc={maxPc} separated={separated} />
      <p className="mt-1 text-[11px] text-muted">
        {separated ? 'Linha grossa: fronteira entre os blocos. ' : ''}Seta de traço longo: pessoas migrando; traço curto: empresas
        mudando de região. Ícones: desastres do ano. Toque num estado para ver os números.
      </p>
    </div>
  )
}

function Legend({ layer, minPc, maxPc, separated }: { layer: Layer; minPc: number; maxPc: number; separated: boolean }) {
  const c = useThemeColors()
  if (layer === 'blocos')
    return (
      <div className="mt-2 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c['series-a'] }} /> {separated ? 'Bloco A' : 'Centro-Sul'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c['series-b'] }} /> {separated ? 'Bloco B' : 'Norte e Nordeste'}
        </span>
      </div>
    )
  const div = layer === 'crescimento' || layer === 'separacao'
  const stops = Array.from({ length: 9 }, (_, i) => i / 8)
  const labels: Record<Exclude<Layer, 'blocos'>, [string, string, string]> = {
    renda: [fmtBRLFull(minPc), 'PIB per capita (escala log)', fmtBRLFull(maxPc)],
    crescimento: ['−1%', 'crescimento do ano (centro em 2%)', '+5%'],
    separacao: ['−20%', 'PIB per capita vs. sem separação', '+20%'],
    clima: ['sem danos', 'danos climáticos nos últimos 5 anos', 'mais danos'],
  }
  const [lo, mid, hi] = labels[layer]
  return (
    <div className="mt-2 text-xs text-ink-2">
      <div className="flex h-2.5 overflow-hidden rounded-sm" aria-hidden>
        {stops.map((s) => (
          <span key={s} className="flex-1" style={{ background: div ? diverging(s * 2 - 1, 1) : sequential(s) }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between">
        <span>{lo}</span>
        <span className="text-muted">{mid}</span>
        <span>{hi}</span>
      </div>
    </div>
  )
}
