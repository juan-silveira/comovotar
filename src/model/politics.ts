// Camada política: calendário eleitoral, aprovação do governo, influência da
// mídia, fundos eleitoral e partidário, emendas parlamentares,
// transparência do gasto e impostos. Linguagem neutra: não há partidos nem
// ideologias, apenas "governo" (incumbente) e "oposição".
//
// Os valores de 2023 (fundos, emendas, carga tributária) já estão embutidos
// no saldo primário de base; o modelo só contabiliza as MUDANÇAS em relação
// a eles, além do ciclo eleitoral e do custo de governabilidade.

import { lowerFirst } from '../lib/format'
import { mulberry32 } from './events'

export type ElectionType = 'municipal' | 'geral'
export type Transparency = 'alta' | 'atual' | 'baixa'

export const TRANSPARENCY_LABELS: Record<Transparency, string> = {
  alta: 'Alta',
  atual: 'Atual',
  baixa: 'Baixa',
}

export const TRANSPARENCY_DESCRIPTIONS: Record<Transparency, string> = {
  alta: 'Emendas rastreáveis por beneficiário final, fim dos sigilos sobre gastos com cartões corporativos e contratos. Gasto mais eficiente, menos escândalos e prêmio de risco 0,1 p.p. menor.',
  atual: 'Regras de 2023: parte das emendas e dos gastos corporativos com rastreabilidade limitada ou sigilo.',
  baixa: 'Ampliação de sigilos e emendas sem identificação de autor ou destino. Gasto menos eficiente, mais escândalos e prêmio de risco 0,25 p.p. maior.',
}

/** Calendário brasileiro: municipais em anos múltiplos de 4 (2024, 2028…), gerais dois anos depois (2026, 2030…). */
export function electionType(year: number): ElectionType | null {
  if (year % 2 !== 0) return null
  return year % 4 === 0 ? 'municipal' : 'geral'
}

export const ELECTION_LABELS: Record<ElectionType, string> = {
  municipal: 'Eleições municipais (prefeitos e vereadores)',
  geral: 'Eleições gerais (presidente, governadores, senadores e deputados)',
}

export interface PoliticsParams {
  politicsEnabled: boolean
  /** Influência da mídia sobre a aprovação, % (0 = nenhuma amplificação) */
  mediaInfluence: number
  transparency: Transparency
  /** Emendas parlamentares, % do PIB ao ano */
  emendas: number
  /** Fundo eleitoral (FEFC), % do PIB em cada ano eleitoral */
  electoralFund: number
  /** Fundo partidário, % do PIB ao ano */
  partyFund: number
  /** Variação da carga tributária após a separação, p.p. do PIB */
  taxChangeA: number
  taxChangeB: number
}

export interface PoliticsCoefficients {
  /** Gasto extra em ano de eleição municipal, % do PIB */
  cycleMunicipal: number
  /** Gasto extra em ano de eleição geral, % do PIB */
  cycleGeneral: number
  /** Multiplicador do gasto eleitoral sobre o crescimento */
  cycleMultiplier: number
  /** Multiplicador das emendas sobre o crescimento, com transparência atual */
  emendaMultiplier: number
  /** Perda de crescimento por p.p. de aumento da carga tributária */
  taxDrag: number
  /** Perda de crescimento no ano seguinte a uma alternância de governo, p.p. */
  alternationShock: number
}

// Valores de 2023/2024, referência para medir mudanças.
export const POLITICS_2023 = {
  emendas: 0.42, // LOA 2024: ~R$ 49 bi em emendas ÷ PIB ~R$ 11,7 tri
  electoralFund: 0.045, // FEFC 2024: R$ 4,96 bi (TSE)
  partyFund: 0.01, // Fundo partidário 2024: ~R$ 1,2 bi (TSE)
  taxBurden: 32.4, // Tesouro Nacional, carga tributária bruta 2023: ~32,4% do PIB
}

export const DEFAULT_POLITICS_PARAMS: PoliticsParams = {
  politicsEnabled: true,
  mediaInfluence: 50,
  transparency: 'atual',
  emendas: POLITICS_2023.emendas,
  electoralFund: POLITICS_2023.electoralFund,
  partyFund: POLITICS_2023.partyFund,
  taxChangeA: 0,
  taxChangeB: 0,
}

export const DEFAULT_POLITICS_COEFFICIENTS: PoliticsCoefficients = {
  cycleMunicipal: 0.15,
  cycleGeneral: 0.4,
  cycleMultiplier: 0.3,
  emendaMultiplier: 0.15,
  taxDrag: 0.1,
  alternationShock: 0.3,
}

const EFFICIENCY: Record<Transparency, number> = { alta: 1, atual: 0.7, baixa: 0.4 }
export const TRANSPARENCY_PREMIUM: Record<Transparency, number> = { alta: -0.1, atual: 0, baixa: 0.25 }
const SCANDAL_PROBABILITY: Record<Transparency, number> = { alta: 0.04, atual: 0.1, baixa: 0.2 }

/** Aprovação abaixo da qual o governo amplia emendas para manter a base no congresso. */
export const GOVERNABILITY_THRESHOLD = 40
/** Emendas extras quando a aprovação está abaixo do limite, % do PIB. */
export const GOVERNABILITY_EMENDAS = 0.1

export interface PoliticalEvent {
  kind: 'eleicao-geral' | 'eleicao-municipal' | 'escandalo'
  block: 'A' | 'B'
  year: number
  title: string
  explanation: string
}

export interface PoliticsState {
  /** Aprovação do governo, 0 a 100 */
  approval: number
  /** Anos desde a última alternância de governo */
  yearsSinceAlternation: number
  /** Houve alternância na última eleição geral? (gera choque no ano seguinte) */
  alternationLastYear: boolean
}

export const INITIAL_POLITICS: PoliticsState = { approval: 50, yearsSinceAlternation: 0, alternationLastYear: false }

export interface PoliticsYear {
  state: PoliticsState
  /** Efeito sobre o crescimento, p.p. (entra no componente fiscal) */
  growth: { cycle: number; emendas: number; taxes: number; alternation: number; scandal: number }
  /** Efeito sobre o saldo primário, % do PIB */
  balance: { cycle: number; funds: number; emendas: number; taxes: number }
  /** Custos da política no ano, R$ */
  costs: { electoralFund: number; partyFund: number; emendas: number; cycle: number }
  election: ElectionType | null
  emendasTotal: number
  events: PoliticalEvent[]
}

export interface PoliticsInput {
  block: 'A' | 'B'
  t: number
  year: number
  seed: number
  gdp: number
  /** Crescimento econômico do ano, sem os efeitos políticos */
  growth: number
  /** Efeito dos eventos econômicos do ano sobre o crescimento (p.p.) */
  eventsEffect: number
  taxChange: number
  params: PoliticsParams
  coef: PoliticsCoefficients
  prev: PoliticsState
  /** Teto para o total de emendas, % do PIB */
  emendasCap?: number
  /** Nome do território nas notícias (padrão: "Bloco X") */
  name?: string
}

/** Calcula o efeito político de um ano para um bloco. Função pura. */
export function politicsYear(x: PoliticsInput): PoliticsYear {
  const { params: p, coef: c, prev } = x
  const rng = mulberry32(((x.seed ^ 0x5bd1e995) + x.t * 7919 + (x.block === 'A' ? 0 : 104729)) >>> 0)
  const media = 1 + p.mediaInfluence / 100
  const election = electionType(x.year)
  const events: PoliticalEvent[] = []
  const where = x.name ?? `Bloco ${x.block}`

  // Ciclo político-orçamentário: gasto extra em ano eleitoral.
  const cycleSpend = election === 'geral' ? c.cycleGeneral : election === 'municipal' ? c.cycleMunicipal : 0
  const cycleGrowth = cycleSpend * c.cycleMultiplier

  // Emendas: governos com baixa aprovação ampliam emendas para manter a base.
  const governabilityExtra = prev.approval < GOVERNABILITY_THRESHOLD ? GOVERNABILITY_EMENDAS : 0
  const emendasTotal = Math.min(p.emendas + governabilityExtra, x.emendasCap ?? Infinity)
  // Eficiência relativa à situação de 2023 (transparência atual, volume de 2023).
  const emendasGrowth =
    emendasTotal * c.emendaMultiplier * EFFICIENCY[p.transparency] -
    POLITICS_2023.emendas * c.emendaMultiplier * EFFICIENCY.atual

  // Impostos: mais carga tributária melhora o saldo e reduz o crescimento.
  const taxGrowth = -x.taxChange * c.taxDrag

  const alternationGrowth = prev.alternationLastYear ? -c.alternationShock : 0

  // Escândalo: chance depende da transparência; a mídia amplia o impacto.
  let scandalGrowth = 0
  let scandalApproval = 0
  if (rng() < SCANDAL_PROBABILITY[p.transparency]) {
    scandalGrowth = -0.1
    scandalApproval = -6 * media
    events.push({
      kind: 'escandalo',
      block: x.block,
      year: x.t,
      title: `Escândalo de gastos: ${where}`,
      explanation:
        'Reportagens revelam irregularidades em gastos sob sigilo ou em emendas sem rastreio. A aprovação do governo cai, com intensidade proporcional à influência da mídia, e a incerteza reduz levemente o investimento.',
    })
  }

  // Aprovação: reage ao crescimento (frente a uma expectativa de 2%), aos
  // eventos, ao gasto eleitoral e aos impostos, com desgaste natural.
  const totalGrowth = x.growth + cycleGrowth + emendasGrowth + taxGrowth + alternationGrowth + scandalGrowth
  let approval =
    prev.approval +
    1.5 * (totalGrowth - 2) * media +
    1.5 * x.eventsEffect * media +
    (cycleSpend > 0 ? 2 : 0) -
    (x.t === 1 ? x.taxChange * 2 : 0) +
    scandalApproval -
    1.5
  approval = Math.min(90, Math.max(10, approval))

  let alternation = false
  if (election === 'geral') {
    const noise = (rng() - 0.5) * 10
    alternation = approval + noise < 50
    const result = alternation
      ? 'A oposição vence e assume o governo.'
      : 'O governo (ou seu candidato) é reeleito.'
    events.push({
      kind: 'eleicao-geral',
      block: x.block,
      year: x.t,
      title: `Eleição geral: ${where}`,
      explanation: `Com aprovação de ${Math.round(approval)}% às vésperas da votação, ${lowerFirst(result)} ${
        alternation
          ? 'A troca de governo gera incerteza sobre a política econômica no ano seguinte.'
          : 'A continuidade reduz a incerteza sobre a política econômica.'
      }`,
    })
    if (alternation) approval = 55
  } else if (election === 'municipal') {
    events.push({
      kind: 'eleicao-municipal',
      block: x.block,
      year: x.t,
      title: `Eleições municipais: ${where}`,
      explanation: `Prefeituras e câmaras municipais são renovadas. Prefeitos ampliam obras e serviços antes da votação; o resultado funciona como termômetro do governo, com aprovação de ${Math.round(approval)}%.`,
    })
  }

  // Fundos: o fundo eleitoral só é pago em ano de eleição; o partidário, todo ano.
  const fundNow = (election ? p.electoralFund : 0) + p.partyFund
  const fundRef = (election ? POLITICS_2023.electoralFund : 0) + POLITICS_2023.partyFund

  return {
    state: {
      approval,
      yearsSinceAlternation: alternation ? 0 : prev.yearsSinceAlternation + 1,
      alternationLastYear: alternation,
    },
    growth: {
      cycle: cycleGrowth,
      emendas: emendasGrowth,
      taxes: taxGrowth,
      alternation: alternationGrowth,
      scandal: scandalGrowth,
    },
    balance: {
      cycle: -cycleSpend,
      funds: -(fundNow - fundRef),
      emendas: -(emendasTotal - POLITICS_2023.emendas),
      taxes: x.taxChange,
    },
    costs: {
      electoralFund: election ? (p.electoralFund / 100) * x.gdp : 0,
      partyFund: (p.partyFund / 100) * x.gdp,
      emendas: (emendasTotal / 100) * x.gdp,
      cycle: (cycleSpend / 100) * x.gdp,
    },
    election,
    emendasTotal,
    events,
  }
}

export function politicsGrowth(py: PoliticsYear): number {
  const g = py.growth
  return g.cycle + g.emendas + g.taxes + g.alternation + g.scandal
}

export function politicsBalance(py: PoliticsYear): number {
  const b = py.balance
  return b.cycle + b.funds + b.emendas + b.taxes
}
