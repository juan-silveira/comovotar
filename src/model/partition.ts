// Divisão do país em dois blocos, estado por estado.
//
// Convenção do modelo: o Bloco A é sempre o de maior PIB per capita, isto
// é, o contribuinte líquido do orçamento federal (que deixa de transferir
// recursos). O Bloco B é o receptor líquido. normalizePartition() garante
// essa convenção trocando os rótulos quando necessário.

import { aggregateBlock, DEFAULT_BASELINE, regionUfs, type Baseline, type BlockAggregate } from './baseline'
import type { Params } from './params'
import { ALL_UFS, REGION_NAMES, REGION_ORDER, STATE_META, type RegionId, type UF } from './states'

export type BlockSide = 'A' | 'B'
export type Partition = Record<UF, BlockSide>

export function makePartition(ufsInA: UF[]): Partition {
  const set = new Set(ufsInA)
  return Object.fromEntries(ALL_UFS.map((u) => [u, set.has(u) ? 'A' : 'B'])) as Partition
}

export function ufsOf(p: Partition, side: BlockSide): UF[] {
  return ALL_UFS.filter((u) => p[u] === side)
}

export function regionsToUfs(regions: RegionId[]): UF[] {
  return regions.flatMap(regionUfs)
}

export const ORIGINAL_PARTITION: Partition = makePartition(regionsToUfs(['S', 'SE', 'CO']))

export function isValidPartition(p: Partition): boolean {
  return ufsOf(p, 'A').length > 0 && ufsOf(p, 'B').length > 0
}

export function samePartition(a: Partition, b: Partition): boolean {
  return ALL_UFS.every((u) => a[u] === b[u])
}

export function flipPartition(p: Partition): Partition {
  return Object.fromEntries(ALL_UFS.map((u) => [u, p[u] === 'A' ? 'B' : 'A'])) as Partition
}

export function blockAggregates(baseline: Baseline, p: Partition): { A: BlockAggregate; B: BlockAggregate } {
  return { A: aggregateBlock(baseline, ufsOf(p, 'A')), B: aggregateBlock(baseline, ufsOf(p, 'B')) }
}

/** Garante que A seja o bloco de maior PIB per capita. */
export function normalizePartition(baseline: Baseline, p: Partition): { partition: Partition; swapped: boolean } {
  if (!isValidPartition(p)) return { partition: p, swapped: false }
  const { A, B } = blockAggregates(baseline, p)
  if (A.gdp / A.pop >= B.gdp / B.pop) return { partition: p, swapped: false }
  return { partition: flipPartition(p), swapped: true }
}

/** Nome curto do bloco: regiões inteiras por sigla e UFs avulsas. */
export function blockLabel(p: Partition, side: BlockSide): string {
  const ufs = new Set(ufsOf(p, side))
  if (ufs.size === ALL_UFS.length) return 'Brasil'
  const parts: string[] = []
  const loose: UF[] = []
  for (const r of REGION_ORDER) {
    const inRegion = regionUfs(r)
    const mine = inRegion.filter((u) => ufs.has(u))
    if (mine.length === inRegion.length) parts.push(r)
    else if (mine.length > inRegion.length / 2) {
      parts.push(`${r} sem ${inRegion.filter((u) => !ufs.has(u)).join(', ')}`)
    } else loose.push(...mine)
  }
  if (loose.length) parts.push(loose.join(', '))
  return parts.join(' + ')
}

export function blockLongLabel(p: Partition, side: BlockSide): string {
  return blockLabel(p, side).replace(/\b(N|NE|SE|S|CO)\b(?! sem)/g, (r) => REGION_NAMES[r as RegionId] ?? r)
}

// Divisões prontas --------------------------------------------------------------

export interface PartitionPreset {
  id: string
  label: string
  description: string
  build: (baseline: Baseline) => Partition
}

export type PopulationOrder = 'renda' | 'latitude'

/**
 * Divisão por população: ordena as UFs por um critério e as atribui ao
 * Bloco A até que ele alcance a parcela-alvo da população.
 */
export function partitionByPopulation(baseline: Baseline, targetShareA: number, order: PopulationOrder): Partition {
  const sorted = [...ALL_UFS].sort((a, b) => {
    if (order === 'latitude') return STATE_META[a].lat - STATE_META[b].lat // do sul para o norte
    const pa = baseline.states[a]
    const pb = baseline.states[b]
    return pb.gdpShare / pb.pop - pa.gdpShare / pa.pop // maior renda per capita primeiro
  })
  const target = (baseline.popBrazil * targetShareA) / 100
  const inA: UF[] = []
  let acc = 0
  for (const u of sorted) {
    const pop = baseline.states[u].pop
    // Inclui a UF se isso aproxima o bloco do alvo.
    if (Math.abs(acc + pop - target) <= Math.abs(acc - target) || inA.length === 0) {
      inA.push(u)
      acc += pop
    } else break
  }
  if (inA.length === ALL_UFS.length) inA.pop()
  return makePartition(inA)
}

export const PARTITION_PRESETS: PartitionPreset[] = [
  {
    id: 'original',
    label: 'S + SE + CO × N + NE',
    description: 'A divisão original do simulador: Sul, Sudeste e Centro-Oeste de um lado; Norte e Nordeste do outro.',
    build: () => ORIGINAL_PARTITION,
  },
  {
    id: 'sul',
    label: 'Sul × demais',
    description: 'Paraná, Santa Catarina e Rio Grande do Sul separados do restante do país.',
    build: () => makePartition(regionsToUfs(['S'])),
  },
  {
    id: 'sudeste',
    label: 'Sudeste × demais',
    description: 'Minas Gerais, Espírito Santo, Rio de Janeiro e São Paulo separados do restante.',
    build: () => makePartition(regionsToUfs(['SE'])),
  },
  {
    id: 'sp',
    label: 'São Paulo × demais',
    description: 'Apenas o estado de São Paulo separado do restante do país.',
    build: () => makePartition(['SP']),
  },
  {
    id: 'nordeste',
    label: 'Nordeste × demais',
    description: 'Os nove estados do Nordeste separados do restante.',
    build: () => makePartition(regionsToUfs(['N', 'SE', 'S', 'CO'])),
  },
  {
    id: 'norte',
    label: 'Norte × demais',
    description: 'Os sete estados da região Norte separados do restante.',
    build: () => makePartition(regionsToUfs(['NE', 'SE', 'S', 'CO'])),
  },
  {
    id: 'metade-renda',
    label: 'Metade da população, por renda',
    description: 'UFs ordenadas por PIB per capita; o Bloco A reúne as mais ricas até somar metade da população.',
    build: (b) => partitionByPopulation(b, 50, 'renda'),
  },
  {
    id: 'metade-latitude',
    label: 'Metade da população, sul–norte',
    description: 'UFs ordenadas da mais ao sul para a mais ao norte até somar metade da população.',
    build: (b) => partitionByPopulation(b, 50, 'latitude'),
  },
]

// Sugestão de parâmetros ---------------------------------------------------------

const REF = blockAggregates(DEFAULT_BASELINE, ORIGINAL_PARTITION)
const pc = (x: BlockAggregate) => x.gdp / x.pop

/** Diferença de renda per capita (log) da divisão original, usada para calibrar a migração. */
export const REFERENCE_INCOME_GAP = Math.log(pc(REF.A) / pc(REF.B))

function transferIndex(x: { A: BlockAggregate; B: BlockAggregate }) {
  // Transferências crescem com a população do bloco receptor e com a diferença de renda.
  return (x.B.pop * Math.max(0, pc(x.A) - pc(x.B))) / x.A.gdp
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function round(v: number, step: number) {
  return Math.round(v / step) * step
}

/**
 * Parâmetros sugeridos para uma divisão qualquer. Cada parâmetro é escalado
 * em relação à divisão original, onde a sugestão reproduz exatamente os
 * valores padrão do enunciado. Proxies (todas hipóteses a calibrar):
 * - transferência A→B: população de B × diferença de renda per capita ÷ PIB de A;
 * - arrecadação migrada: 40% da transferência (1% de 2,5% na divisão original);
 * - exposição comercial de A: peso do PIB de B na economia;
 * - custo de energia de A: PIB das UFs exportadoras de energia em B ÷ PIB de A;
 * - bônus de recursos de B: intensidade média de recursos das UFs de B;
 * - dívida: dividida proporcionalmente ao PIB.
 */
export function suggestParams(baseline: Baseline, p: Partition): Partial<Params> {
  const x = blockAggregates(baseline, p)
  const transfer = clamp(round((2.5 * transferIndex(x)) / transferIndex(REF), 0.1), 0, 6)
  const exposure = clamp(round((8 * x.B.gdpShare) / REF.B.gdpShare, 0.5), 2, 15)
  const energyRef = REF.B.energyExporterGdp / REF.A.gdp
  const energy = clamp(round((0.3 * (x.B.energyExporterGdp / x.A.gdp)) / energyRef, 0.05), 0, 1)
  const resources = clamp(round((0.3 * x.B.resources) / REF.B.resources, 0.05), 0, 1)
  return {
    transferAtoB: transfer,
    taxMigration: round(transfer * 0.4, 0.1),
    tradeExposureA: exposure,
    energyCostA: energy,
    resourceBonusB: resources,
    debtShareB: round(x.B.gdpShare, 0.1),
  }
}
