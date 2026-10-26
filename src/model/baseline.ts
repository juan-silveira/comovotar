// Dados de base do simulador (ano 0 = 2023), por UF.
// Percentuais em pontos percentuais (ex.: 53 = 53%). Cada número tem a
// fonte comentada ao lado; "estimativa" indica valor a calibrar.

import type { IbgeDataset } from './ibge'
import snapshot from './ibge-snapshot.json'
import { ALL_UFS, REGION_NAMES, STATE_META, type EnergyProfile, type RegionId, type UF } from './states'

export type { RegionId, UF } from './states'

/** Valores regionais de referência do enunciado. */
export interface RegionReference {
  id: RegionId
  name: string
  /** Participação no PIB nacional (%) */
  gdpShare: number
  /** Participação na população nacional (%) */
  popShare: number
  /** Crescimento médio anual do PIB real 2002–2023 (%) */
  gdpGrowth: number
  /** Crescimento populacional anual 2010–2022 (%) */
  popGrowth: number
  /** Idosos 65+ (%), quando informado */
  elderlyShare: number | null
}

export const REGION_REFERENCE: Record<RegionId, RegionReference> = {
  SE: {
    id: 'SE',
    name: 'Sudeste',
    gdpShare: 53.0, // IBGE, Contas Regionais 2023
    popShare: 41.88, // IBGE, Censo 2022
    gdpGrowth: 1.7, // IBGE/FGV, média anual 2002–2023
    popGrowth: 0.45, // IBGE, Censo 2010–2022
    elderlyShare: 12.2, // IBGE, Censo 2022
  },
  S: {
    id: 'S',
    name: 'Sul',
    gdpShare: 16.8, // IBGE, Contas Regionais 2023
    popShare: 14.7, // IBGE, Censo 2022
    gdpGrowth: 1.7, // IBGE/FGV, média anual 2002–2023
    popGrowth: 0.7, // IBGE, Censo 2010–2022 (aprox.)
    elderlyShare: 12.1, // IBGE, Censo 2022
  },
  CO: {
    id: 'CO',
    name: 'Centro-Oeste',
    gdpShare: 10.6, // IBGE, Contas Regionais 2023
    popShare: 8.02, // IBGE, Censo 2022
    gdpGrowth: 3.4, // IBGE/FGV, média anual 2002–2023
    popGrowth: 1.23, // IBGE, Censo 2010–2022
    elderlyShare: null,
  },
  NE: {
    id: 'NE',
    name: 'Nordeste',
    gdpShare: 13.8, // IBGE, Contas Regionais 2023
    popShare: 26.9, // IBGE, Censo 2022
    gdpGrowth: 2.4, // IBGE/FGV, média anual 2002–2023
    popGrowth: 0.24, // IBGE, Censo 2010–2022
    elderlyShare: null,
  },
  N: {
    id: 'N',
    name: 'Norte',
    gdpShare: 5.8, // IBGE, Contas Regionais 2023
    popShare: 8.5, // IBGE, Censo 2022
    gdpGrowth: 3.2, // IBGE/FGV, média anual 2002–2023
    popGrowth: 0.75, // IBGE, Censo 2010–2022
    elderlyShare: 7, // IBGE, Censo 2022 (~7%)
  },
}

export interface StateData {
  uf: UF
  ibgeId: number
  name: string
  region: RegionId
  /** População residente (Censo 2022) */
  pop: number
  /** Participação no PIB nacional (%), último ano das Contas Regionais */
  gdpShare: number
  /** Crescimento real anual do PIB (%), ver deriveGrowth() */
  gdpGrowth: number
  /** Crescimento populacional anual 2010–2022 (%) */
  popGrowth: number
  /** Idosos 65+ (%), Censo 2022 */
  elderlyShare: number
  energy: EnergyProfile
  resources: number
}

export type DataOrigin = 'embutido' | 'firebase' | 'ibge'

export interface Baseline {
  baseYear: number
  /** PIB do Brasil no ano base, em R$ */
  gdpBrazil: number
  /** População do Brasil (soma das UFs) */
  popBrazil: number
  /** Percentual nacional de idosos (65+), referência do arrasto demográfico */
  elderlyBrazil: number
  /** Dívida bruta do governo geral (% do PIB) */
  debtBrazil: number
  states: Record<UF, StateData>
  source: { origin: DataOrigin; fetchedAt: string; gdpYears: string }
}

export const GDP_BRAZIL_2023 = 10.9e12 // IBGE, Contas Nacionais — PIB 2023: R$ 10,9 trilhões
export const ELDERLY_BRAZIL = 10.9 // IBGE, Censo 2022: 10,9% com 65 anos ou mais
export const DEBT_BRAZIL = 74.4 // Banco Central, DBGG dez/2023: ~74,4% do PIB

/**
 * Monta a base a partir dos dados do IBGE por UF.
 *
 * Crescimento real por UF: a API do IBGE dá o PIB a preços correntes; o
 * crescimento real de cada UF é estimado como a taxa real da sua região
 * (IBGE/FGV, 2002–2023) somada à diferença entre o crescimento nominal da
 * UF e o da região no mesmo período. Assim a média regional é preservada e
 * as UFs mais dinâmicas da região crescem mais.
 */
export function buildBaseline(data: IbgeDataset, origin: DataOrigin = 'embutido'): Baseline {
  const years = Math.max(1, data.gdpEndYear - data.gdpStartYear)
  const gdpTotal = data.states.reduce((s, x) => s + x.gdpEnd, 0)
  const regionNominal = {} as Record<RegionId, { start: number; end: number }>
  for (const s of data.states) {
    const r = STATE_META[s.uf].region
    regionNominal[r] ??= { start: 0, end: 0 }
    regionNominal[r].start += s.gdpStart
    regionNominal[r].end += s.gdpEnd
  }
  const cagr = (start: number, end: number) => (Math.pow(end / start, 1 / years) - 1) * 100

  const states = {} as Record<UF, StateData>
  for (const s of data.states) {
    const meta = STATE_META[s.uf]
    const reg = regionNominal[meta.region]
    states[s.uf] = {
      uf: s.uf,
      ibgeId: s.ibgeId,
      name: s.name,
      region: meta.region,
      pop: s.pop2022,
      gdpShare: (s.gdpEnd / gdpTotal) * 100,
      gdpGrowth:
        REGION_REFERENCE[meta.region].gdpGrowth + cagr(s.gdpStart, s.gdpEnd) - cagr(reg.start, reg.end),
      popGrowth: (Math.pow(s.pop2022 / s.pop2010, 1 / 12) - 1) * 100,
      elderlyShare: s.elderlyShare,
      energy: meta.energy,
      resources: meta.resources,
    }
  }
  return {
    baseYear: 2023,
    gdpBrazil: GDP_BRAZIL_2023,
    popBrazil: data.states.reduce((s, x) => s + x.pop2022, 0),
    elderlyBrazil: ELDERLY_BRAZIL,
    debtBrazil: DEBT_BRAZIL,
    states,
    source: { origin, fetchedAt: data.fetchedAt, gdpYears: `${data.gdpStartYear}–${data.gdpEndYear}` },
  }
}

export const DEFAULT_BASELINE: Baseline = buildBaseline(snapshot as IbgeDataset)

export interface BlockAggregate {
  ufs: UF[]
  gdp: number
  pop: number
  gdpShare: number
  popShare: number
  /** Crescimento base do PIB (%), ponderado pelo PIB das UFs */
  gdpGrowth: number
  /** Crescimento populacional (%), ponderado pela população */
  popGrowth: number
  /** Idosos (%), ponderado pela população */
  elderlyShare: number
  /** PIB das UFs exportadoras líquidas de energia */
  energyExporterGdp: number
  /** Intensidade de recursos, média ponderada pelo PIB (0 a 1) */
  resources: number
}

/** Agrega UFs num bloco: crescimento ponderado pelo PIB, demografia pela população. */
export function aggregateBlock(baseline: Baseline, ufs: UF[]): BlockAggregate {
  const st = ufs.map((u) => baseline.states[u])
  const gdpShare = sum(st.map((s) => s.gdpShare))
  const popAbs = sum(st.map((s) => s.pop))
  const byGdp = (f: (s: StateData) => number) => (gdpShare === 0 ? 0 : sum(st.map((s) => f(s) * s.gdpShare)) / gdpShare)
  const byPop = (f: (s: StateData) => number) => (popAbs === 0 ? 0 : sum(st.map((s) => f(s) * s.pop)) / popAbs)
  const totalShare = sum(ALL_UFS.map((u) => baseline.states[u].gdpShare))
  const gdp = (baseline.gdpBrazil * gdpShare) / totalShare
  return {
    ufs,
    gdp,
    pop: popAbs,
    gdpShare,
    popShare: (popAbs / baseline.popBrazil) * 100,
    gdpGrowth: byGdp((s) => s.gdpGrowth),
    popGrowth: byPop((s) => s.popGrowth),
    elderlyShare: byPop((s) => s.elderlyShare),
    energyExporterGdp: (baseline.gdpBrazil * sum(st.filter((s) => s.energy === 'exportador').map((s) => s.gdpShare))) / totalShare,
    resources: byGdp((s) => s.resources),
  }
}

export function regionUfs(region: RegionId): UF[] {
  return ALL_UFS.filter((u) => STATE_META[u].region === region)
}

export function regionName(region: RegionId) {
  return REGION_NAMES[region]
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}
