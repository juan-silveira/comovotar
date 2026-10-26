import { lowerFirst } from '../lib/format'
// Núcleo do simulador: módulo TypeScript puro, sem dependência de interface.
//
// Para cada bloco X e ano t = 1..30:
//   PIB_X(t) = PIB_X(t-1) × (1 + g_X(t))
//   g_X(t)   = base + fiscal/governança + comércio + transição
//              + demografia/migração + empresas/recursos + eventos
// (os componentes negativos já entram com sinal). Detalhes em computeYear().
//
// Além dos blocos, o modelo acompanha cada UF (PIB, população, eventos
// climáticos e efeitos de políticas locais), usada no mapa e pelos cargos
// estaduais e municipais.

import type { Baseline } from './baseline'
import { drawClimate, PREPAREDNESS_COST, type ClimateEvent } from './climate'
import {
  cardSidesAt,
  cardYear,
  DECISION_CARDS,
  resolveEffect,
  type DecisionCard,
  type DecisionChoice,
  type DecisionEffect,
  type Side,
} from './decisions'
import { drawEvents, mulberry32, type EventOccurrence } from './events'
import { drawGlobal, GLOBAL_PROBABILITY } from './geopolitics'
import { MACRO_BASE, monetaryTightness, stepMacro, type MacroYear } from './macro'
import {
  CABINET_EFFECTS,
  congressPassProbability,
  INITIAL_INSTITUTIONS,
  institutionsYear,
  type InstitutionalEvent,
  type InstitutionsState,
  type InstitutionsYear,
} from './institutions'
import type { Coefficients, FirmPolicy, MigrationPolicy, Params } from './params'
import { blockAggregates, REFERENCE_INCOME_GAP, ufsOf } from './partition'
import {
  INITIAL_POLITICS,
  politicsBalance,
  politicsGrowth,
  politicsYear,
  TRANSPARENCY_PREMIUM,
  type PoliticalEvent,
  type PoliticsState,
  type PoliticsYear,
  type Transparency,
} from './politics'
import { ALL_UFS, type UF } from './states'

export const MODEL_VERSION = 4
export const HORIZON = 30

export type BlockId = 'A' | 'B'

export interface Components {
  base: number
  /** Efeito fiscal da separação + política, instituições e políticas locais */
  fiscal: number
  trade: number
  transition: number
  /** Arrasto demográfico + efeito da migração sobre o PIB */
  demography: number
  /** Recursos naturais + empresas (realocação, incentivos, bolsa) */
  resources: number
  /** Eventos econômicos e climáticos */
  events: number
}

export const COMPONENT_KEYS: (keyof Components)[] = [
  'base',
  'fiscal',
  'trade',
  'transition',
  'demography',
  'resources',
  'events',
]

export const COMPONENT_LABELS: Record<keyof Components, string> = {
  base: 'Tendência base',
  fiscal: 'Fiscal e governança',
  trade: 'Comércio',
  transition: 'Transição',
  demography: 'Demografia e migração',
  resources: 'Empresas e recursos',
  events: 'Eventos e clima',
}

/** Partes que compõem os componentes agrupados, para explicações e tabelas. */
export interface SubComponents {
  separationFiscal: number
  /** Efeito dos juros: aperto monetário freia o crescimento */
  monetary: number
  /** Ganho de política própria após a separação */
  autonomy: number
  politics: number
  institutions: number
  localPolicies: number
  aging: number
  migration: number
  naturalResources: number
  firms: number
  market: number
  economicEvents: number
  climate: number
}

export interface BlockYear {
  gdp: number
  pop: number
  gdpPc: number
  /** Crescimento do PIB no ano, % */
  growth: number
  components: Components
  sub: SubComponents
  /** Idosos 65+ (%), muda com a migração */
  elderlyShare: number
  /** Saldo migratório do ano (pessoas; positivo = entrada líquida) */
  netMigration: number
  cumulativeMigration: number
  /** Atividade de empresas ganha (+) ou perdida (−) no ano, R$ */
  firmFlow: number
  politics: PoliticsYear | null
  institutions: InstitutionsState
  institutionsYear: InstitutionsYear | null
  /** Aprovação do governo, 0 a 100 */
  approval: number
  /** Juro real efetivo da dívida, % */
  interestRate: number
  /** Saldo primário estimado, % do PIB */
  fiscalBalance: number
  /** Dívida pública, % do PIB */
  debt: number
  /** PIB per capita da trajetória do mesmo bloco sem separação */
  cfGdpPc: number
  /** Diferença do PIB per capita frente à trajetória sem separação, % */
  vsNoSeparation: number
}

export interface UfYear {
  gdp: number
  pop: number
  gdpPc: number
  growth: number
  /** PIB per capita da UF sem separação */
  cfGdpPc: number
  vsNoSeparation: number
  /** Dano climático no ano, % do PIB da UF */
  climateDamage: number
}

export type CardStatus = 'vigente' | 'rejeitada' | 'suspensa' | 'derrubada'

export interface CardOutcome {
  status: CardStatus
  /** Ano até o qual uma liminar suspende a decisão */
  suspendedUntil?: number
}

export interface YearResult {
  t: number
  year: number
  A: BlockYear
  B: BlockYear
  uf: Record<UF, UfYear>
  united: { gdp: number; pop: number; gdpPc: number }
  newEvents: EventOccurrence[]
  activeEvents: EventOccurrence[]
  /** Câmbio, inflação e Selic do ano (Brasil) */
  macro: MacroYear
  climateEvents: ClimateEvent[]
  politicalEvents: PoliticalEvent[]
  institutionalEvents: InstitutionalEvent[]
  /** Resultado de cada decisão (chave: cardId:lado) */
  cardOutcomes: Record<string, CardOutcome>
  detail: {
    transferLossB: number
    netTransferLossB: number
    fiscalSavingA: number
    transitionFund: number
    tradeFactor: number
    migrationPolicyA: MigrationPolicy
    migrationPolicyB: MigrationPolicy
    firmPolicyA: FirmPolicy
    firmPolicyB: FirmPolicy
  }
}

/** Efeito de uma política estadual ou municipal sobre o crescimento de uma UF. */
export interface UfEffect {
  uf: UF
  fromYear: number
  years: number
  /** p.p. de crescimento da UF */
  growth: number
  /** Multiplicador dos danos climáticos na UF (ex.: 0,7 = 30% menos) */
  climateFactor?: number
}

export interface SimInput {
  baseline: Baseline
  params: Params
  coef: Coefficients
  seed: number
  /** Escolhas das cartas nacionais, votos ('voto:<card>') e decisões judiciais ('stf:<card>') */
  decisions: DecisionChoice[]
  /** Efeitos de políticas locais (cargos estaduais e municipais) */
  ufEffects?: UfEffect[]
  /** Leis federais aprovadas no processo legislativo, valendo a partir de fromYear */
  lawEffects?: LawEffectInput[]
}

export interface LawEffectInput {
  fromYear: number
  effect: DecisionEffect
  /** Ano do julgamento que derrubou a lei (deixa de valer a partir dele) */
  struckYear?: number
  /** Duração em anos (sem valor = permanente), ex.: orçamento anual */
  years?: number
}

/** Parâmetros efetivos no ano t, depois de aplicar as cartas de decisão. */
export interface EffectiveParams extends Params {
  transparencyA: Transparency
  transparencyB: Transparency
  emendasCapA: number
  emendasCapB: number
  transitionFund: number
  energyCostMult: number
  tradeLossMult: number
  tradeRecoveryMult: number
  riskPremiumDelta: number
  lawGrowthA: number
  lawGrowthB: number
  lawFiscalA: number
  lawFiscalB: number
}

export function outcomeKey(cardId: string, side: Side | undefined) {
  return `${cardId}:${side ?? 'T'}`
}

export function findChoice(decisions: DecisionChoice[], cardId: string, side: Side | undefined) {
  return decisions.find((d) => d.cardId === cardId && (d.side === side || (side !== undefined && d.side === undefined)))
}

function isActive(outcome: CardOutcome | undefined, t: number): boolean {
  if (!outcome) return true
  if (outcome.status === 'rejeitada' || outcome.status === 'derrubada') return false
  if (outcome.status === 'suspensa' && outcome.suspendedUntil !== undefined && t <= outcome.suspendedUntil) return false
  return true
}

export function effectiveParams(
  input: SimInput,
  t: number,
  s: SimSetup,
  outcomes: Record<string, CardOutcome>,
): EffectiveParams {
  const p = input.params
  const eff: EffectiveParams = {
    ...p,
    transparencyA: p.transparency,
    transparencyB: p.transparency,
    emendasCapA: Infinity,
    emendasCapB: Infinity,
    transitionFund: 0,
    energyCostMult: 1,
    tradeLossMult: 1,
    tradeRecoveryMult: 1,
    riskPremiumDelta: 0,
    lawGrowthA: 0,
    lawGrowthB: 0,
    lawFiscalA: 0,
    lawFiscalB: 0,
  }
  for (const law of input.lawEffects ?? []) {
    if (t >= law.fromYear && (law.struckYear === undefined || t < law.struckYear) && (law.years === undefined || t < law.fromYear + law.years)) applyEffect(eff, law.effect, t - law.fromYear)
  }
  if (!p.decisionsEnabled) return eff
  const sep = p.separationYear
  for (const card of DECISION_CARDS) {
    const cy = cardYear(card, sep)
    if (cy === null || cy > t) continue
    for (const side of cardSidesAt(card, sep !== null && t >= sep)) {
      const choice = findChoice(input.decisions, card.id, side)
      const option = card.options.find((o) => o.id === choice?.optionId)
      if (!option) continue
      if (!isActive(outcomes[outcomeKey(card.id, side)], t)) continue
      const ctx = { separation: p.separation, gdpShareB: s.shares.gdpB, popShareB: s.shares.popB, side: side ?? 'A' }
      applyEffect(eff, resolveEffect(option, ctx), t - cy)
    }
  }
  return eff
}

function applyEffect(eff: EffectiveParams, e: DecisionEffect, yearsSince: number) {
  if (e.debtShareB !== undefined) eff.debtShareB = e.debtShareB
  if (e.riskPremiumDelta) eff.riskPremiumDelta += e.riskPremiumDelta
  if (e.transitionFund && yearsSince < e.transitionFund.years) eff.transitionFund += e.transitionFund.pctOfA
  if (e.energyCostMult !== undefined) eff.energyCostMult *= e.energyCostMult
  if (e.resourceBonusBDelta) eff.resourceBonusB += e.resourceBonusBDelta
  if (e.tradeLossMult !== undefined) eff.tradeLossMult *= e.tradeLossMult
  if (e.tradeRecoveryMult !== undefined) eff.tradeRecoveryMult *= e.tradeRecoveryMult
  if (e.reinvestShare !== undefined) eff.reinvestShare = e.reinvestShare
  if (e.migrationPolicyA) eff.migrationPolicyA = e.migrationPolicyA
  if (e.migrationPolicyB) eff.migrationPolicyB = e.migrationPolicyB
  if (e.firmPolicyA) eff.firmPolicyA = e.firmPolicyA
  if (e.firmPolicyB) eff.firmPolicyB = e.firmPolicyB
  if (e.cabinetA) eff.cabinetA = e.cabinetA
  if (e.cabinetB) eff.cabinetB = e.cabinetB
  if (e.courtA) eff.courtA = e.courtA
  if (e.courtB) eff.courtB = e.courtB
  if (e.climatePrepA) eff.climatePrepA = e.climatePrepA
  if (e.climatePrepB) eff.climatePrepB = e.climatePrepB
  if (e.transparencyA) eff.transparencyA = e.transparencyA
  if (e.transparencyB) eff.transparencyB = e.transparencyB
  if (e.politicalFundsMult !== undefined) {
    eff.electoralFund *= e.politicalFundsMult
    eff.partyFund *= e.politicalFundsMult
  }
  if (e.emendasCapA !== undefined) eff.emendasCapA = Math.min(eff.emendasCapA, e.emendasCapA)
  if (e.emendasCapB !== undefined) eff.emendasCapB = Math.min(eff.emendasCapB, e.emendasCapB)
  if (e.growthA) eff.lawGrowthA += e.growthA
  if (e.growthB) eff.lawGrowthB += e.growthB
  if (e.fiscalA) eff.lawFiscalA += e.fiscalA
  if (e.fiscalB) eff.lawFiscalB += e.fiscalB
}

/** Reação da bolsa às decisões que entram em vigor no ano t. */
function decisionMarketShock(input: SimInput, s: SimSetup, t: number, outcomes: Record<string, CardOutcome>) {
  const shock = { A: 0, B: 0 }
  if (!input.params.decisionsEnabled) return shock
  const sep = input.params.separationYear
  for (const card of DECISION_CARDS) {
    if (cardYear(card, sep) !== t) continue
    for (const side of cardSidesAt(card, sep !== null && t >= sep)) {
      const choice = findChoice(input.decisions, card.id, side)
      const option = card.options.find((o) => o.id === choice?.optionId)
      if (!option || !isActive(outcomes[outcomeKey(card.id, side)], t)) continue
      const e = resolveEffect(option, {
        separation: input.params.separation,
        gdpShareB: s.shares.gdpB,
        popShareB: s.shares.popB,
        side: side ?? 'A',
      })
      shock.A += e.marketA ?? 0
      shock.B += e.marketB ?? 0
    }
  }
  return shock
}

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Decide o destino das cartas do ano t: votação no Congresso (quando
 * exigida) e, se houver, a decisão do tribunal constitucional.
 */
function resolveCards(
  input: SimInput,
  t: number,
  prev: YearResult,
): { outcomes: Record<string, CardOutcome>; events: InstitutionalEvent[]; legalDelta: Record<BlockId, number> } {
  const outcomes = { ...prev.cardOutcomes }
  const events: InstitutionalEvent[] = []
  const legalDelta = { A: 0, B: 0 }

  // Liminares que vencem neste ano vão ao plenário.
  for (const [key, out] of Object.entries(outcomes)) {
    if (out.status === 'suspensa' && out.suspendedUntil === t - 1) {
      const [cardId, sideKey] = key.split(':')
      const side: BlockId = sideKey === 'B' ? 'B' : 'A'
      const rng = mulberry32((input.seed ^ hashString(`plenario:${key}`)) >>> 0)
      const confirm = rng() < 0.5
      outcomes[key] = { status: confirm ? 'derrubada' : 'vigente' }
      const card = DECISION_CARDS.find((c) => c.id === cardId)
      events.push({
        kind: confirm ? 'congresso-rejeita' : 'congresso-aprova',
        block: side,
        year: t,
        title: confirm
          ? `Plenário confirma a liminar: “${card?.title}” anulada`
          : `Plenário derruba a liminar: “${card?.title}” volta a valer`,
        explanation: confirm
          ? 'O colegiado de 11 ministros confirmou a decisão individual. A medida deixa de valer.'
          : 'O colegiado reverteu a decisão individual e a medida volta a valer. Reversões desse tipo alimentam o debate sobre o alcance das decisões monocráticas.',
      })
    }
  }

  if (!input.params.decisionsEnabled) return { outcomes, events, legalDelta }

  const sep = input.params.separationYear
  const separatedNow = sep !== null && t >= sep
  for (const card of DECISION_CARDS) {
    if (cardYear(card, sep) !== t) continue
    for (const side of cardSidesAt(card, separatedNow)) {
      const choice = findChoice(input.decisions, card.id, side)
      if (!choice || choice.optionId === card.options[0].id) continue
      const key = outcomeKey(card.id, side)
      const option = card.options.find((o) => o.id === choice.optionId)
      let status: CardStatus = 'vigente'

      if (card.needsCongress) {
        // Unido, há um só Congresso (o do lado A, que representa o país).
        const blocks: BlockId[] = !separatedNow ? ['A'] : side ? [side] : ['A', 'B']
        for (const b of blocks) {
          const vote = input.decisions.find((d) => d.cardId === `voto:${card.id}` && (d.side ?? b) === b)
          const prob = congressPassProbability(
            prev[b].institutions.congressSupport,
            (vote?.optionId as 'favor' | 'contra' | undefined) ?? null,
          )
          const rng = mulberry32((input.seed ^ hashString(`congresso:${key}:${b}`)) >>> 0)
          const passed = rng() < prob
          events.push(congressEvent(card, option?.label ?? '', b, t, passed, prob))
          if (!passed) status = 'rejeitada'
        }
      }

      // Ação no tribunal constitucional (o jogador ministro decide).
      const ruling = input.decisions.find((d) => d.cardId === `stf:${card.id}` && (d.side === side || !side))
      if (status === 'vigente' && ruling) {
        const courtSide: BlockId = ruling.side ?? side ?? 'A'
        if (ruling.optionId === 'liminar') {
          status = 'suspensa'
          outcomes[key] = { status, suspendedUntil: t }
          legalDelta[courtSide] -= 3
        } else if (ruling.optionId === 'plenario') {
          const rng = mulberry32((input.seed ^ hashString(`colegiado:${key}`)) >>> 0)
          if (rng() < 0.35) status = 'derrubada'
          legalDelta[courtSide] += 1
        }
      }
      outcomes[key] = { ...outcomes[key], status }
    }
  }
  return { outcomes, events, legalDelta }
}

function congressEvent(
  card: DecisionCard,
  optionLabel: string,
  b: BlockId,
  t: number,
  passed: boolean,
  prob: number,
): InstitutionalEvent {
  return {
    kind: passed ? 'congresso-aprova' : 'congresso-rejeita',
    block: b,
    year: t,
    title: `Congresso de ${b} ${passed ? 'aprova' : 'rejeita'}: ${lowerFirst(card.title)} (${lowerFirst(optionLabel)})`,
    explanation: passed
      ? `A proposta reuniu os votos necessários. Com o apoio atual ao governo, a chance estimada de aprovação era de ${Math.round(prob * 100)}%.`
      : `Sem maioria, a proposta não passou e vale a regra anterior. A chance estimada de aprovação era de ${Math.round(prob * 100)}%; governos com mais apoio no Congresso aprovam mais.`,
  }
}

// Políticas ------------------------------------------------------------------

export const MIGRATION_ENTRY: Record<MigrationPolicy, number> = {
  incentivar: 1.5,
  livre: 1,
  restringir: 0.3,
  proibir: 0,
}
export const MIGRATION_EXIT: Record<MigrationPolicy, number> = {
  incentivar: 0.8,
  livre: 1,
  restringir: 1,
  proibir: 1,
}
export const MIGRATION_COST: Record<MigrationPolicy, number> = {
  incentivar: 0.1,
  livre: 0,
  restringir: 0.02,
  proibir: 0.05,
}
export const FIRM_STANCE: Record<FirmPolicy, number> = { atrair: 1, neutra: 0, repelir: -1 }

// Configuração --------------------------------------------------------------------

interface BlockStatic {
  baseGrowth: number
  basePopGrowth: number
  elderlyShare: number
  ufs: UF[]
}

export interface SimSetup {
  A: BlockStatic
  B: BlockStatic
  shares: { gdpB: number; popB: number }
  unitedPopGrowth: number
  sideOf: Record<UF, BlockId>
  initial: YearResult
}

const ZERO: Components = { base: 0, fiscal: 0, trade: 0, transition: 0, demography: 0, resources: 0, events: 0 }
const ZERO_SUB: SubComponents = {
  separationFiscal: 0,
  monetary: 0,
  autonomy: 0,
  politics: 0,
  institutions: 0,
  localPolicies: 0,
  aging: 0,
  migration: 0,
  naturalResources: 0,
  firms: 0,
  market: 0,
  economicEvents: 0,
  climate: 0,
}

export function setup(input: SimInput): SimSetup {
  const { baseline, coef, params } = input
  const { A: a, B: b } = blockAggregates(baseline, params.partition)
  const popTotal = a.pop + b.pop
  const unitedPopGrowth = popTotal === 0 ? 0 : (a.popGrowth * a.pop + b.popGrowth * b.pop) / popTotal
  const block = (agg: typeof a): BlockYear => ({
    gdp: agg.gdp,
    pop: agg.pop,
    gdpPc: agg.gdp / agg.pop,
    growth: 0,
    components: { ...ZERO },
    sub: { ...ZERO_SUB },
    elderlyShare: agg.elderlyShare,
    netMigration: 0,
    cumulativeMigration: 0,
    firmFlow: 0,
    politics: null,
    institutions: INITIAL_INSTITUTIONS,
    institutionsYear: null,
    approval: INITIAL_POLITICS.approval,
    interestRate: coef.realInterestRate,
    fiscalBalance: coef.basePrimaryBalance,
    debt: baseline.debtBrazil,
    cfGdpPc: agg.gdp / agg.pop,
    vsNoSeparation: 0,
  })
  const totalShare = ALL_UFS.reduce((acc, u) => acc + baseline.states[u].gdpShare, 0)
  const uf = {} as Record<UF, UfYear>
  for (const u of ALL_UFS) {
    const st = baseline.states[u]
    const gdp = (baseline.gdpBrazil * st.gdpShare) / totalShare
    uf[u] = { gdp, pop: st.pop, gdpPc: gdp / st.pop, growth: 0, cfGdpPc: gdp / st.pop, vsNoSeparation: 0, climateDamage: 0 }
  }
  return {
    A: { baseGrowth: a.gdpGrowth, basePopGrowth: a.popGrowth, elderlyShare: a.elderlyShare, ufs: a.ufs },
    B: { baseGrowth: b.gdpGrowth, basePopGrowth: b.popGrowth, elderlyShare: b.elderlyShare, ufs: b.ufs },
    shares: { gdpB: (b.gdp / (a.gdp + b.gdp)) * 100, popB: b.popShare },
    unitedPopGrowth,
    sideOf: params.partition,
    initial: {
      t: 0,
      year: baseline.baseYear,
      A: block(a),
      B: block(b),
      uf,
      united: { gdp: a.gdp + b.gdp, pop: popTotal, gdpPc: (a.gdp + b.gdp) / popTotal },
      newEvents: [],
      activeEvents: [],
      macro: { dollar: MACRO_BASE.dollar, inflation: MACRO_BASE.inflation, selic: MACRO_BASE.selic },
      climateEvents: [],
      politicalEvents: [],
      institutionalEvents: [],
      cardOutcomes: {},
      detail: {
        transferLossB: 0,
        netTransferLossB: 0,
        fiscalSavingA: 0,
        transitionFund: 0,
        tradeFactor: 0,
        migrationPolicyA: params.migrationPolicyA,
        migrationPolicyB: params.migrationPolicyB,
        firmPolicyA: params.firmPolicyA,
        firmPolicyB: params.firmPolicyB,
      },
    },
  }
}

/** Calcula o ano t a partir do ano anterior. Função pura. */
export function computeYear(input: SimInput, s: SimSetup, prev: YearResult, t: number): YearResult {
  const { coef, baseline, seed } = input
  const cards = resolveCards(input, t, prev)
  const p = effectiveParams(input, t, s, cards.outcomes)
  const ratio = prev.A.gdp / prev.B.gdp
  // Separação: começa no ano separationYear (null = Brasil unido). Antes
  // dela, os dois blocos são macrorregiões de um só país, com um governo,
  // um Congresso e um tribunal; as políticas nacionais valem para ambas.
  const sepYear = input.params.separationYear
  const separated = sepYear !== null && t >= sepYear
  const tau = separated ? t - (sepYear as number) + 1 : 0
  if (!separated) unify(p)
  const shareA = prev.A.gdp / (prev.A.gdp + prev.B.gdp)

  // Fiscal ------------------------------------------------------------------
  // A deixa de transferir T, perde a arrecadação que migra (M) e, se houver,
  // paga o fundo de transição (F): economia líquida = T − M − F (% PIB de A).
  const fiscalSavingA = separated ? p.transferAtoB - p.taxMigration - p.transitionFund : 0
  const energyA = separated ? p.energyCostA * p.energyCostMult : 0
  const reinvest = p.reinvestShare / 100
  const fiscalA = (fiscalSavingA - energyA) * reinvest * coef.fiscalMultiplierA

  // B perde T convertido para a base do seu PIB; a arrecadação migrada e o
  // fundo compensam parte. O efeito cai linearmente durante o ajuste até a
  // fração persistente.
  const transferLossB = separated ? p.transferAtoB * ratio : 0
  const netTransferLossB = fiscalSavingA * ratio
  const adjustYears = Math.max(1, coef.fiscalAdjustYearsB)
  const persistent = coef.fiscalPersistentShareB / 100
  const fiscalFactorB = tau <= adjustYears ? 1 - (1 - persistent) * ((tau - 1) / adjustYears) : persistent
  const fiscalB = -netTransferLossB * coef.fiscalMultiplierB * fiscalFactorB

  // Comércio ----------------------------------------------------------------
  const anyRepel = p.firmPolicyA === 'repelir' || p.firmPolicyB === 'repelir'
  const tradeLoss = Math.min(100, p.tradeLoss + (anyRepel ? coef.firmRepelTradeLoss : 0))
  const recoveryYears = Math.max(0.5, coef.tradeRecoveryYears * p.tradeRecoveryMult)
  const residual = coef.tradeResidualShare / 100
  const tradeFactor = separated ? Math.max(residual, 1 - (tau - 1) / recoveryYears) * p.tradeLossMult : 0
  const lostSalesA = (p.tradeExposureA * tradeLoss) / 100 // % do PIB de A
  const tradeA = -lostSalesA * coef.tradeCoefA * tradeFactor
  const tradeB = -lostSalesA * ratio * coef.tradeCoefB * tradeFactor

  // Transição ---------------------------------------------------------------
  const halfLife = Math.max(0.1, p.shockHalfLife)
  const transition = separated ? -p.transitionShock * Math.pow(0.5, (tau - 1) / halfLife) : 0
  const resourceB = separated ? p.resourceBonusB : 0

  // Autonomia ---------------------------------------------------------------
  // Cada bloco passa a ter política própria (impostos, juros, câmbio, regras
  // ajustadas à sua economia) e deixa de pagar o custo de coordenar 27 UFs.
  // O ganho amadurece aos poucos e depende da qualidade do governo do bloco,
  // avaliada com o estado do ano anterior.
  const autonomyRamp = separated ? Math.min(1, tau / Math.max(1, coef.autonomyRampYears)) : 0
  const governance = (side: BlockId) => {
    let q = 0
    if (p.institutionsEnabled) {
      const cab = side === 'A' ? p.cabinetA : p.cabinetB
      q += cab === 'tecnico' ? 0.3 : cab === 'politico' ? -0.3 : 0
      q += (prev[side].institutions.legalCertainty - 60) / 100
    }
    if (p.politicsEnabled) {
      const tr = side === 'A' ? p.transparencyA : p.transparencyB
      q += tr === 'alta' ? 0.2 : tr === 'baixa' ? -0.3 : 0
    }
    return Math.max(0, 1 + q * coef.autonomyGovernanceWeight)
  }
  const autonomyA = separated ? p.autonomyGain * autonomyRamp * governance('A') : 0
  const autonomyB = separated ? p.autonomyGain * autonomyRamp * governance('B') : 0

  // Migração ----------------------------------------------------------------
  // Flui do bloco de menor renda per capita para o de maior renda, com
  // intensidade proporcional ao log da razão de renda, modulada pela política
  // de entrada do destino e de retenção da origem.
  const gap = Math.log(prev.A.gdpPc / prev.B.gdpPc)
  const toA = gap >= 0
  const destPolicy = toA ? p.migrationPolicyA : p.migrationPolicyB
  const origPolicy = toA ? p.migrationPolicyB : p.migrationPolicyA
  const origin = toA ? prev.B : prev.A
  const migrationRate =
    (coef.migrationRate * (Math.abs(gap) / REFERENCE_INCOME_GAP) * MIGRATION_ENTRY[destPolicy] * MIGRATION_EXIT[origPolicy]) /
    100
  const migrants = migrationRate * origin.pop
  const netMigA = toA ? migrants : -migrants
  const netMigB = -netMigA
  const productivity = coef.migrantProductivity / 100
  // Cada migrante produz uma fração da média do bloco onde trabalha.
  const migGrowth = (b: BlockYear, net: number) => ((net * b.gdpPc * productivity) / b.gdp) * 100
  const migrationA = migGrowth(prev.A, netMigA)
  const migrationB = migGrowth(prev.B, netMigB)

  // Migrantes são predominantemente em idade ativa: diluem (no destino) ou
  // concentram (na origem) a proporção de idosos.
  const elderlyAfter = (b: BlockYear, net: number) => (b.elderlyShare * b.pop) / Math.max(1, b.pop + net)
  const elderlyA = elderlyAfter(prev.A, netMigA)
  const elderlyB = elderlyAfter(prev.B, netMigB)
  const drag = (elderly: number) => -Math.max(0, elderly - baseline.elderlyBrazil) * coef.demographicDragPerPoint
  const agingA = drag(elderlyA)
  const agingB = drag(elderlyB)

  // Empresas ----------------------------------------------------------------
  // Diferença de postura (atrair = +1, neutra = 0, repelir = −1) desloca
  // atividade do bloco menos atrativo para o mais atrativo.
  const stanceDiff = FIRM_STANCE[p.firmPolicyA] - FIRM_STANCE[p.firmPolicyB]
  const firmSource = stanceDiff >= 0 ? prev.B : prev.A
  const firmFlowA = (coef.firmRelocation / 100) * stanceDiff * firmSource.gdp
  const ownBoost = (f: FirmPolicy) => (f === 'atrair' ? coef.firmIncentiveGrowth : 0)
  const firmsA = (firmFlowA / prev.A.gdp) * 100 + ownBoost(p.firmPolicyA)
  const firmsB = (-firmFlowA / prev.B.gdp) * 100 + ownBoost(p.firmPolicyB)

  // Eventos econômicos ----------------------------------------------------------
  const stillActive = prev.activeEvents.filter((e) => t < e.year + e.duration)
  const newEvents = p.eventsEnabled
    ? drawEvents(seed, {
        t,
        separation: p.separation,
        probability: p.eventProbability,
        debtA: prev.A.debt,
        debtB: prev.B.debt,
        active: stillActive,
      }).concat(drawGlobal(seed, t, prev.newEvents, stillActive, GLOBAL_PROBABILITY * Math.min(2, Math.max(0.5, p.eventProbability / 15))))
    : []
  const activeEvents = [...stillActive, ...newEvents]
  const econEventsA = activeEvents.reduce((acc, e) => acc + e.effectA, 0)
  const econEventsB = activeEvents.reduce((acc, e) => acc + e.effectB, 0)

  // Clima e políticas locais (por UF) ------------------------------------------
  const ufLocal = {} as Record<UF, number>
  const ufClimateFactor = {} as Record<UF, number>
  for (const u of ALL_UFS) {
    ufLocal[u] = 0
    ufClimateFactor[u] = 1
  }
  for (const e of input.ufEffects ?? []) {
    if (t >= e.fromYear && t < e.fromYear + e.years) {
      ufLocal[e.uf] += e.growth
      if (e.climateFactor !== undefined) ufClimateFactor[e.uf] *= e.climateFactor
    }
  }
  const climateEvents = p.climateEnabled
    ? drawClimate({
        t,
        seed,
        frequency: coef.climateFrequency,
        trend: coef.climateTrend,
        ufsByBlock: { A: s.A.ufs, B: s.B.ufs },
        ufGdp: (u) => prev.uf[u].gdp,
        blockGdp: { A: prev.A.gdp, B: prev.B.gdp },
        preparedness: { A: p.climatePrepA, B: p.climatePrepB },
        response: {
          A: CABINET_EFFECTS[p.cabinetA].climateResponse,
          B: CABINET_EFFECTS[p.cabinetB].climateResponse,
        },
        energyDependent: p.energyCostMult === 1,
      }).map((e) => ({
        ...e,
        damage: e.damage * ufClimateFactor[e.uf],
        effect: e.effect * ufClimateFactor[e.uf],
      }))
    : []
  // Dano e reconstrução por UF (p.p. de crescimento da UF).
  const ufClimate = {} as Record<UF, number>
  for (const u of ALL_UFS) ufClimate[u] = (prev.uf[u].climateDamage * coef.climateRebound) / 100
  for (const e of climateEvents) ufClimate[e.uf] -= e.damage
  const weighted = (side: BlockId, f: (u: UF) => number) =>
    s[side].ufs.reduce((acc, u) => acc + (f(u) * prev.uf[u].gdp) / prev[side].gdp, 0)
  const climateA = weighted('A', (u) => ufClimate[u])
  const climateB = weighted('B', (u) => ufClimate[u])
  const localA = weighted('A', (u) => ufLocal[u]) + p.lawGrowthA
  const localB = weighted('B', (u) => ufLocal[u]) + p.lawGrowthB

  // Juros: o Banco Central reage à inflação do ano anterior; juro real acima do neutro freia a economia.
  const tight = p.institutionsEnabled ? monetaryTightness(prev.macro) : 0
  const monetary = -0.08 * tight

  // Política -----------------------------------------------------------------
  const econA = s.A.baseGrowth + monetary + fiscalA + autonomyA + tradeA + transition + agingA + migrationA + firmsA + econEventsA + climateA + localA
  const econB =
    s.B.baseGrowth +
    monetary +
    fiscalB +
    autonomyB +
    tradeB +
    transition +
    agingB +
    migrationB +
    resourceB +
    firmsB +
    econEventsB +
    climateB +
    localB
  const pol = (side: BlockId, econ: number, eventsEffect: number, taxChange: number, prevState: PoliticsState) => {
    if (!p.politicsEnabled) return null
    const cap = side === 'A' ? p.emendasCapA : p.emendasCapB
    return politicsYear({
      block: side,
      name: separated ? undefined : 'Brasil',
      t,
      year: baseline.baseYear + t,
      seed,
      gdp: separated ? prev[side].gdp : prev.A.gdp + prev.B.gdp,
      growth: econ,
      eventsEffect,
      taxChange,
      params: { ...p, transparency: side === 'A' ? p.transparencyA : p.transparencyB, emendas: Math.min(p.emendas, cap) },
      coef,
      prev: prevState,
      emendasCap: cap,
    })
  }
  // Unido: um só governo, avaliado pelo desempenho nacional (média ponderada pelo PIB).
  const nat = (a: number, b: number) => shareA * a + (1 - shareA) * b
  const polA = separated
    ? pol('A', econA, econEventsA + climateA, p.taxChangeA, prev.A.politics?.state ?? INITIAL_POLITICS)
    : pol('A', nat(econA, econB), nat(econEventsA + climateA, econEventsB + climateB), p.taxChangeA, prev.A.politics?.state ?? INITIAL_POLITICS)
  const polB = separated
    ? pol('B', econB, econEventsB + climateB, p.taxChangeB, prev.B.politics?.state ?? INITIAL_POLITICS)
    : polA
  const polGrowthA = polA ? politicsGrowth(polA) : 0
  const polGrowthB = polB ? politicsGrowth(polB) : 0

  // Instituições ---------------------------------------------------------------
  const shocks = decisionMarketShock(input, s, t, cards.outcomes)
  const inst = (side: BlockId, econ: number, py: PoliticsYear | null): InstitutionsYear | null => {
    if (!p.institutionsEnabled) return null
    const prevInst = prev[side].institutions
    const iy = institutionsYear({
      block: side,
      name: separated ? undefined : 'Brasil',
      t,
      seed,
      cabinet: side === 'A' ? p.cabinetA : p.cabinetB,
      court: side === 'A' ? p.courtA : p.courtB,
      approval: py?.state.approval ?? prev[side].approval,
      emendasTotal: py?.emendasTotal ?? p.emendas,
      growth: econ,
      decisionShock: shocks[side],
      alternation: py?.state.alternationLastYear ?? false,
      coef,
      prev: { ...prevInst, legalCertainty: prevInst.legalCertainty + cards.legalDelta[side] },
    })
    return iy
  }
  const instA = separated ? inst('A', econA + polGrowthA, polA) : inst('A', nat(econA, econB) + polGrowthA, polA)
  const instB = separated ? inst('B', econB + polGrowthB, polB) : instA
  const instGrowth = (iy: InstitutionsYear | null) => (iy ? iy.growth.cabinet + iy.growth.legal : 0)
  const marketGrowth = (iy: InstitutionsYear | null) => (iy ? iy.growth.market : 0)
  const approvalA = Math.min(90, Math.max(10, (polA?.state.approval ?? prev.A.approval) + (instA?.approvalDelta ?? 0)))
  const approvalB = Math.min(90, Math.max(10, (polB?.state.approval ?? prev.B.approval) + (instB?.approvalDelta ?? 0)))
  if (polA) polA.state = { ...polA.state, approval: approvalA }
  if (polB && polB !== polA) polB.state = { ...polB.state, approval: approvalB }

  const subA: SubComponents = {
    separationFiscal: fiscalA,
    monetary,
    autonomy: autonomyA,
    politics: polGrowthA,
    institutions: instGrowth(instA),
    localPolicies: localA,
    aging: agingA,
    migration: migrationA,
    naturalResources: 0,
    firms: firmsA,
    market: marketGrowth(instA),
    economicEvents: econEventsA,
    climate: climateA,
  }
  const subB: SubComponents = {
    separationFiscal: fiscalB,
    monetary,
    autonomy: autonomyB,
    politics: polGrowthB,
    institutions: instGrowth(instB),
    localPolicies: localB,
    aging: agingB,
    migration: migrationB,
    naturalResources: resourceB,
    firms: firmsB,
    market: marketGrowth(instB),
    economicEvents: econEventsB,
    climate: climateB,
  }
  const compose = (base: number, sub: SubComponents, trade: number): Components => ({
    base,
    fiscal: sub.separationFiscal + sub.monetary + sub.autonomy + sub.politics + sub.institutions + sub.localPolicies,
    trade,
    transition,
    demography: sub.aging + sub.migration,
    resources: sub.naturalResources + sub.firms + sub.market,
    events: sub.economicEvents + sub.climate,
  })
  const compA = compose(s.A.baseGrowth, subA, tradeA)
  const compB = compose(s.B.baseGrowth, subB, tradeB)

  // Dívida: nacional enquanto unido; dividida no ano da separação conforme a parcela de B.
  const natDebt = nat(prev.A.debt, prev.B.debt)
  const debtB0 = t === sepYear ? (natDebt * (p.debtShareB / 100)) / (1 - shareA) : prev.B.debt
  const debtA0 = t === sepYear ? (natDebt * (1 - p.debtShareB / 100)) / shareA : prev.A.debt

  // Saldo primário: A melhora com a parte não reinvestida da economia; B
  // fecha gradualmente o buraco das transferências durante o ajuste.
  // Políticas migratórias, para empresas, de prevenção e a camada política
  // têm custo ou receita próprios.
  const policyBalance = (side: BlockId) => {
    const f = side === 'A' ? p.firmPolicyA : p.firmPolicyB
    const m = side === 'A' ? p.migrationPolicyA : p.migrationPolicyB
    const prep = side === 'A' ? p.climatePrepA : p.climatePrepB
    return (
      (f === 'atrair' ? -coef.firmIncentiveCost : f === 'repelir' ? coef.firmRepelRevenue : 0) -
      MIGRATION_COST[m] -
      (p.climateEnabled ? PREPAREDNESS_COST[prep] - PREPAREDNESS_COST.medio : 0) +
      (side === 'A' ? p.lawFiscalA : p.lawFiscalB)
    )
  }
  const pbA = coef.basePrimaryBalance + fiscalSavingA * (1 - reinvest) + policyBalance('A') + (polA ? politicsBalance(polA) : 0)
  const pbB =
    coef.basePrimaryBalance -
    netTransferLossB * Math.max(0, 1 - tau / adjustYears) +
    policyBalance('B') +
    (polB ? politicsBalance(polB) : 0)
  const rateFor = (side: BlockId, iy: InstitutionsYear | null) =>
    coef.realInterestRate +
    (separated ? Math.max(0, p.riskPremium + p.riskPremiumDelta) : 0) +
    (p.politicsEnabled ? TRANSPARENCY_PREMIUM[side === 'A' ? p.transparencyA : p.transparencyB] : 0) +
    (iy?.premium ?? 0) +
    // Parte do aperto monetário encarece a rolagem da dívida.
    0.3 * tight

  const block = (
    side: BlockId,
    comp: Components,
    sub: SubComponents,
    netMig: number,
    elderly: number,
    firmFlow: number,
    py: PoliticsYear | null,
    iy: InstitutionsYear | null,
    approval: number,
    pb: number,
    debt0: number,
  ): BlockYear => {
    const prevB = prev[side]
    const st = s[side]
    const growth = sumComponents(comp)
    const gdp = prevB.gdp * (1 + growth / 100)
    const pop = prevB.pop * (1 + st.basePopGrowth / 100) + netMig
    const gdpPc = gdp / pop
    const cfGdpPc = (prevB.cfGdpPc * (1 + st.baseGrowth / 100)) / (1 + st.basePopGrowth / 100)
    const rate = rateFor(side, iy)
    const debt = (debt0 * (1 + rate / 100)) / (1 + growth / 100) - pb
    return {
      gdp,
      pop,
      gdpPc,
      growth,
      components: comp,
      sub,
      elderlyShare: elderly,
      netMigration: netMig,
      cumulativeMigration: prevB.cumulativeMigration + netMig,
      firmFlow,
      politics: py,
      institutions: iy?.state ?? prevB.institutions,
      institutionsYear: iy,
      approval,
      interestRate: rate,
      fiscalBalance: pb,
      debt,
      cfGdpPc,
      vsNoSeparation: (gdpPc / cfGdpPc - 1) * 100,
    }
  }

  const A = block('A', compA, subA, netMigA, elderlyA, firmFlowA, polA, instA, approvalA, pbA, debtA0)
  const B = block('B', compB, subB, netMigB, elderlyB, -firmFlowA, polB, instB, approvalB, pbB, debtB0)
  if (!separated) {
    // Dívida nacional única: mesma razão dívida/PIB para as duas macrorregiões.
    const gNat = ((A.gdp + B.gdp) / (prev.A.gdp + prev.B.gdp) - 1) * 100
    const pbNat = nat(pbA, pbB)
    const debt = (natDebt * (1 + A.interestRate / 100)) / (1 + gNat / 100) - pbNat
    A.debt = debt
    B.debt = debt
    A.fiscalBalance = pbNat
    B.fiscalBalance = pbNat
  }

  // UFs: crescimento comum do bloco + efeitos específicos da UF, renormalizado
  // para somar o PIB do bloco. População acompanha o bloco.
  const uf = {} as Record<UF, UfYear>
  for (const side of ['A', 'B'] as BlockId[]) {
    const blk = side === 'A' ? A : B
    const specificAvg = side === 'A' ? climateA + localA - p.lawGrowthA : climateB + localB - p.lawGrowthB
    const common = blk.growth - specificAvg
    let sum = 0
    for (const u of s[side].ufs) {
      const g = common + ufClimate[u] + ufLocal[u]
      const gdp = prev.uf[u].gdp * (1 + g / 100)
      sum += gdp
      uf[u] = { ...prev.uf[u], gdp, growth: g }
    }
    const scale = blk.gdp / sum
    const popScale = blk.pop / prev[side].pop
    for (const u of s[side].ufs) {
      const st = baseline.states[u]
      const gdp = uf[u].gdp * scale
      const pop = prev.uf[u].pop * popScale
      const cfGdpPc = (prev.uf[u].cfGdpPc * (1 + st.gdpGrowth / 100)) / (1 + st.popGrowth / 100)
      uf[u] = {
        gdp,
        pop,
        gdpPc: gdp / pop,
        growth: (gdp / prev.uf[u].gdp - 1) * 100,
        cfGdpPc,
        vsNoSeparation: (gdp / pop / cfGdpPc - 1) * 100,
        climateDamage: climateEvents.filter((e) => e.uf === u).reduce((acc, e) => acc + e.damage, 0),
      }
    }
  }

  const united = {
    gdp: prev.united.gdp * (1 + coef.unitedGrowth / 100),
    pop: prev.united.pop * (1 + s.unitedPopGrowth / 100),
    gdpPc: 0,
  }
  united.gdpPc = united.gdp / united.pop

  // Câmbio, inflação e Selic do ano, a partir dos resultados nacionais.
  const wNow = A.gdp / (A.gdp + B.gdp)
  const natNow = (f: (b: BlockYear) => number, a: BlockYear, b: BlockYear) => wNow * f(a) + (1 - wNow) * f(b)
  const macro = stepMacro(prev.macro, {
    growth: natNow((b) => b.growth, A, B),
    premiumChange: natNow((b) => b.interestRate, A, B) - natNow((b) => b.interestRate, prev.A, prev.B),
    debtChange: natNow((b) => b.debt, A, B) - natNow((b) => b.debt, prev.A, prev.B),
    newEvents,
  })

  return {
    t,
    year: baseline.baseYear + t,
    macro,
    A,
    B,
    uf,
    united,
    newEvents,
    activeEvents,
    climateEvents,
    politicalEvents: [...(polA?.events ?? []), ...(separated ? (polB?.events ?? []) : [])],
    institutionalEvents: [...cards.events, ...(instA?.events ?? []), ...(separated ? (instB?.events ?? []) : [])],
    cardOutcomes: cards.outcomes,
    detail: {
      transferLossB,
      netTransferLossB,
      fiscalSavingA,
      transitionFund: p.transitionFund,
      tradeFactor,
      migrationPolicyA: p.migrationPolicyA,
      migrationPolicyB: p.migrationPolicyB,
      firmPolicyA: p.firmPolicyA,
      firmPolicyB: p.firmPolicyB,
    },
  }
}

/**
 * Brasil unido: uma só política nacional. Vale para as duas macrorregiões o
 * que o governo nacional (lado A) decidir; a migração interna é livre
 * (liberdade de locomoção, CF art. 5º, XV) e não há realocação entre "blocos".
 */
function unify(p: EffectiveParams) {
  p.migrationPolicyA = 'livre'
  p.migrationPolicyB = 'livre'
  p.firmPolicyB = p.firmPolicyA
  p.cabinetB = p.cabinetA
  p.courtB = p.courtA
  p.climatePrepB = p.climatePrepA
  p.transparencyB = p.transparencyA
  p.emendasCapB = p.emendasCapA
  p.taxChangeB = p.taxChangeA
  p.lawGrowthB = p.lawGrowthA
  p.lawFiscalB = p.lawFiscalA
}

export function sumComponents(c: Components): number {
  return c.base + c.fiscal + c.trade + c.transition + c.demography + c.resources + c.events
}

/** Simula do ano 0 ao ano `years`. O índice do array é o ano t. */
export function simulate(input: SimInput, years: number = HORIZON): YearResult[] {
  const s = setup(input)
  const out: YearResult[] = [s.initial]
  for (let t = 1; t <= years; t++) out.push(computeYear(input, s, out[t - 1], t))
  return out
}

export { ufsOf }
