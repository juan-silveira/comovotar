// Eventos climáticos localizados por UF: secas, chuvas excessivas e
// enchentes, queimadas, falta de energia e falta de água. O dano depende do
// preparo de cada bloco (investimento em adaptação e defesa civil) e da
// qualidade da resposta (perfil do ministério). A frequência cresce ao longo
// do tempo, refletindo a tendência de eventos extremos mais frequentes.

import type { BlockId } from './simulation'
import { mulberry32 } from './events'
import { STATE_META, type UF } from './states'

export type ClimateKind = 'seca' | 'enchente' | 'queimada' | 'apagao' | 'falta-agua'
export type Preparedness = 'baixo' | 'medio' | 'alto'

export const CLIMATE_LABELS: Record<ClimateKind, string> = {
  seca: 'Seca',
  enchente: 'Chuvas excessivas e enchentes',
  queimada: 'Queimadas',
  apagao: 'Falta de energia',
  'falta-agua': 'Falta de água',
}

export const PREPAREDNESS_LABELS: Record<Preparedness, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' }

export const PREPAREDNESS_DESCRIPTIONS: Record<Preparedness, string> = {
  baixo: 'Pouco investimento em prevenção: sem sistemas de alerta e com obras de drenagem e contenção atrasadas. Custa 0,05% do PIB ao ano; os danos ficam integrais.',
  medio: 'Nível de 2023: defesa civil estruturada e algumas obras de prevenção. Custa 0,15% do PIB ao ano e reduz os danos em 30%.',
  alto: 'Plano de adaptação: alertas, drenagem, reservatórios, brigadas contra incêndio e redundância elétrica. Custa 0,35% do PIB ao ano e reduz os danos em 55%.',
}

export const PREPAREDNESS_COST: Record<Preparedness, number> = { baixo: 0.05, medio: 0.15, alto: 0.35 }
const PREPAREDNESS_FACTOR: Record<Preparedness, number> = { baixo: 1, medio: 0.7, alto: 0.45 }

/** Dano típico, % do PIB da UF atingida. */
const BASE_DAMAGE: Record<ClimateKind, number> = {
  seca: 1.5,
  enchente: 3,
  queimada: 0.8,
  apagao: 0.6,
  'falta-agua': 1,
}

/** Propensão de cada UF a cada tipo de evento (0 a 1), estimativa a calibrar com base em registros recentes. */
export const PROPENSITY: Record<UF, Partial<Record<ClimateKind, number>>> = {
  RO: { queimada: 1, seca: 0.3, enchente: 0.3 },
  AC: { queimada: 0.8, enchente: 0.7, seca: 0.3 },
  AM: { queimada: 0.7, seca: 0.6, enchente: 0.5 },
  RR: { queimada: 0.5, seca: 0.3 },
  PA: { queimada: 1, seca: 0.4, enchente: 0.3 },
  AP: { apagao: 0.7, queimada: 0.3, enchente: 0.3 },
  TO: { queimada: 0.8, seca: 0.5 },
  MA: { queimada: 0.6, seca: 0.5, enchente: 0.4 },
  PI: { seca: 0.9, queimada: 0.4 },
  CE: { seca: 1, 'falta-agua': 0.6 },
  RN: { seca: 1, 'falta-agua': 0.5 },
  PB: { seca: 1, 'falta-agua': 0.5 },
  PE: { seca: 0.8, enchente: 0.6, 'falta-agua': 0.4 },
  AL: { seca: 0.7, enchente: 0.5 },
  SE: { seca: 0.6, enchente: 0.3 },
  BA: { seca: 0.9, enchente: 0.5, queimada: 0.3 },
  MG: { enchente: 0.6, seca: 0.4, 'falta-agua': 0.3, apagao: 0.3 },
  ES: { enchente: 0.5, seca: 0.3 },
  RJ: { enchente: 0.7, 'falta-agua': 0.4, apagao: 0.3 },
  SP: { 'falta-agua': 0.8, enchente: 0.6, apagao: 0.4 },
  PR: { enchente: 0.5, seca: 0.4 },
  SC: { enchente: 0.8, seca: 0.3 },
  RS: { enchente: 1, seca: 0.5 },
  MS: { queimada: 0.8, seca: 0.5 },
  MT: { queimada: 1, seca: 0.5 },
  GO: { queimada: 0.5, seca: 0.4, 'falta-agua': 0.3 },
  DF: { 'falta-agua': 0.6, queimada: 0.3 },
}

export interface ClimateEvent {
  kind: ClimateKind
  uf: UF
  block: BlockId
  year: number
  /** Dano, % do PIB da UF */
  damage: number
  /** Efeito no crescimento do bloco, p.p. */
  effect: number
  title: string
  explanation: string
}

export interface ClimateInput {
  t: number
  seed: number
  /** Probabilidade anual de evento por bloco no ano 1, % */
  frequency: number
  /** Aumento anual da frequência, p.p. */
  trend: number
  ufsByBlock: Record<BlockId, UF[]>
  /** PIB de cada UF no ano anterior */
  ufGdp: (uf: UF) => number
  blockGdp: Record<BlockId, number>
  preparedness: Record<BlockId, Preparedness>
  /** Fator de qualidade de resposta do ministério (técnico > político) */
  response: Record<BlockId, number>
  /** A energia de A depende de geração em B (sem contrato de longo prazo) */
  energyDependent: boolean
}

function weightedPick<T>(items: { item: T; w: number }[], r: number): T | undefined {
  const total = items.reduce((s, x) => s + x.w, 0)
  if (total <= 0) return undefined
  let acc = 0
  for (const x of items) {
    acc += x.w / total
    if (r < acc) return x.item
  }
  return items[items.length - 1]?.item
}

function responseText(prep: Preparedness, response: number): string {
  if (prep === 'alto' && response >= 1)
    return 'Alertas antecipados, obras de prevenção e equipes técnicas reduziram as perdas e aceleraram a reconstrução.'
  if (prep === 'baixo' || response < 1)
    return 'A falta de prevenção e a coordenação lenta entre União, estado e municípios ampliaram as perdas.'
  return 'A defesa civil atuou, mas a infraestrutura de prevenção limitou a redução de danos.'
}

/** Sorteia os eventos climáticos do ano para os dois blocos. */
export function drawClimate(x: ClimateInput): ClimateEvent[] {
  const rng = mulberry32(((x.seed ^ 0x165667b1) + x.t * 2246822519) >>> 0)
  const out: ClimateEvent[] = []
  const prob = (x.frequency + x.trend * (x.t - 1)) / 100

  for (const block of ['A', 'B'] as BlockId[]) {
    const roll = rng()
    const pickR = rng()
    const sevR = rng()
    if (roll >= prob) continue
    const candidates = x.ufsByBlock[block].flatMap((uf) =>
      (Object.entries(PROPENSITY[uf]) as [ClimateKind, number][]).map(([kind, w]) => ({ item: { uf, kind }, w })),
    )
    const pick = weightedPick(candidates, pickR)
    if (!pick) continue
    out.push(build(x, block, pick.uf, pick.kind, 0.5 + sevR))
  }

  // Seca em UF exportadora de energia de B pode faltar energia em A.
  const droughtInExporter = out.find(
    (e) => e.block === 'B' && e.kind === 'seca' && STATE_META[e.uf].energy === 'exportador',
  )
  if (droughtInExporter && x.energyDependent && rng() < 0.5) {
    const importers = x.ufsByBlock.A.filter((u) => STATE_META[u].energy === 'importador')
    const uf = importers.sort((a, b) => x.ufGdp(b) - x.ufGdp(a))[0]
    if (uf) out.push(build(x, 'A', uf, 'apagao', 1, droughtInExporter.uf))
  }
  return out
}

function build(x: ClimateInput, block: BlockId, uf: UF, kind: ClimateKind, severity: number, cause?: UF): ClimateEvent {
  const prep = x.preparedness[block]
  const response = x.response[block]
  const damage = (BASE_DAMAGE[kind] * severity * PREPAREDNESS_FACTOR[prep]) / response
  const effect = -(damage * x.ufGdp(uf)) / x.blockGdp[block]
  const what: Record<ClimateKind, string> = {
    seca: `Estiagem prolongada reduz a produção agrícola e o nível dos reservatórios em ${uf}.`,
    enchente: `Chuvas muito acima da média provocam enchentes e deslizamentos em ${uf}, com danos a casas, estradas e indústrias.`,
    queimada: `Focos de incêndio em vegetação seca se espalham em ${uf}, afetando a produção, a saúde e o turismo.`,
    apagao: cause
      ? `A seca em ${cause} reduziu a geração hidrelétrica exportada para o Bloco A; ${uf} sofre cortes de energia.`
      : `Falhas na transmissão e geração insuficiente causam cortes de energia em ${uf}.`,
    'falta-agua': `Reservatórios em nível crítico levam a racionamento de água em ${uf}.`,
  }
  return {
    kind,
    uf,
    block,
    year: x.t,
    damage,
    effect,
    title: `${CLIMATE_LABELS[kind]} em ${uf}`,
    explanation: `${what[kind]} ${responseText(prep, response)}`,
  }
}
