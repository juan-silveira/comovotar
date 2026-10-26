import { useState } from 'react'
import { fmtBRLFull, fmtNum, fmtPct } from '../lib/format'
import { useThemeColors } from '../lib/theme'
import type { Baseline } from '../model/baseline'
import {
  blockAggregates,
  blockLabel,
  flipPartition,
  isValidPartition,
  makePartition,
  PARTITION_PRESETS,
  partitionByPopulation,
  regionsToUfs,
  samePartition,
  type Partition,
  type PopulationOrder,
} from '../model/partition'
import { REGION_NAMES, REGION_ORDER, type RegionId, type UF } from '../model/states'
import { BrazilMap } from './BrazilMap'
import { BlockTag, Button, Segmented, Slider } from './ui'

export function PartitionEditor({
  baseline,
  partition,
  onChange,
  notice,
}: {
  baseline: Baseline
  partition: Partition
  onChange: (p: Partition) => void
  notice?: string
}) {
  const c = useThemeColors()
  const [target, setTarget] = useState(50)
  const [order, setOrder] = useState<PopulationOrder>('renda')
  const valid = isValidPartition(partition)
  const agg = valid ? blockAggregates(baseline, partition) : null

  const toggleUf = (u: UF) => {
    const next = { ...partition, [u]: partition[u] === 'A' ? 'B' : 'A' } as Partition
    if (isValidPartition(next)) onChange(next)
  }
  const setRegion = (r: RegionId, side: 'A' | 'B') => {
    const next = { ...partition }
    for (const u of regionsToUfs([r])) next[u] = side
    if (isValidPartition(next)) onChange(next)
  }
  const regionState = (r: RegionId): 'A' | 'B' | 'misto' => {
    const ufs = regionsToUfs([r])
    const a = ufs.filter((u) => partition[u] === 'A').length
    return a === ufs.length ? 'A' : a === 0 ? 'B' : 'misto'
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <BrazilMap
          ariaLabel="Mapa da divisão: clique numa UF para trocá-la de bloco"
          partition={partition}
          fill={(u) => (partition[u] === 'A' ? c['series-a'] : c['series-b'])}
          onSelect={toggleUf}
          tooltip={(u) => `${baseline.states[u].name} (${u}): Bloco ${partition[u]}. Clique para trocar.`}
          height={420}
        />
        <p className="mt-1 text-xs text-muted">Clique numa UF para movê-la para o outro bloco.</p>
      </div>
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Divisões prontas</h3>
          <div className="flex flex-wrap gap-2">
            {PARTITION_PRESETS.map((p) => {
              const built = p.build(baseline)
              const active = samePartition(built, partition) || samePartition(flipPartition(built), partition)
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.description}
                  onClick={() => onChange(built)}
                  className={`min-h-9 rounded-md border px-3 text-xs ${active ? 'border-accent bg-surface-2 font-semibold text-ink' : 'border-line text-ink-2 hover:bg-surface-2'}`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Por região</h3>
          <div className="space-y-1.5">
            {REGION_ORDER.map((r) => (
              <div key={r} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink">
                  {REGION_NAMES[r]}
                  {regionState(r) === 'misto' && <span className="ml-1 text-xs text-muted">(dividida)</span>}
                </span>
                <Segmented
                  label={`Bloco da região ${REGION_NAMES[r]}`}
                  value={regionState(r) === 'misto' ? ('' as 'A') : regionState(r)}
                  onChange={(v) => setRegion(r, v as 'A' | 'B')}
                  options={[
                    { value: 'A', label: 'A' },
                    { value: 'B', label: 'B' },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Por população</h3>
          <Slider label="Parcela da população no Bloco A" value={target} min={10} max={90} step={5} unit="%" onChange={setTarget} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Segmented
              label="Critério de ordenação"
              value={order}
              onChange={setOrder}
              options={[
                { value: 'renda', label: 'Mais ricas primeiro' },
                { value: 'latitude', label: 'Do sul para o norte' },
              ]}
            />
            <Button onClick={() => onChange(partitionByPopulation(baseline, target, order))}>Aplicar</Button>
          </div>
          <p className="mt-1 text-xs text-muted">Usa a população do Censo 2022 (IBGE) de cada UF.</p>
        </div>
        {agg && (
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            {(['A', 'B'] as const).map((side) => {
              const x = agg[side]
              return (
                <div key={side} className="tnum flex flex-wrap justify-between gap-2 py-1">
                  <BlockTag block={side}>{`${side}: ${blockLabel(partition, side)}`}</BlockTag>
                  <span className="text-ink-2">
                    {fmtPct(x.popShare, 0)} da pop. · {fmtPct(x.gdpShare, 0)} do PIB · {fmtBRLFull(x.gdp / x.pop)} per capita ·
                    cresc. base {fmtNum(x.gdpGrowth, 1)}%
                  </span>
                </div>
              )
            })}
            {notice && <p className="mt-2 text-xs text-warn-ink">{notice}</p>}
          </div>
        )}
        <Button variant="ghost" onClick={() => onChange(makePartition(regionsToUfs(['S', 'SE', 'CO'])))}>
          Voltar à divisão original
        </Button>
      </div>
    </div>
  )
}
