// Motor de carreira política: o jogador ocupa um cargo e, a cada ano, toma
// apenas as decisões que esse cargo permite. Os demais atores (presidentes,
// congressos, tribunais) são simulados por regras. Inclui projetos de lei,
// crises, perguntas, eleições, aprovação e pontuação.

import { fmtBRL, lowerFirst } from '../lib/format'
import { BILLS, findBill, type Level, type Office } from './bills'
import {
  CAMPAIGN_SPEND,
  campaignCeiling,
  CASE_STAGES,
  convictionChance,
  exposureChance,
  INELIGIBILITY_YEARS,
  initialWealth,
  legalYearChange,
  offerFor,
  ILLICIT_OFFERS,
  type CampaignSpend,
  type CriminalCase,
} from './wealth'
import {
  AUDIT_SUSPENSION_CHANCE,
  auditBody,
  CPI_TOPICS,
  cpiSignatures,
  impeachmentRules,
  INHABILITATION_YEARS,
  removalChance,
  type ImpeachmentChoice,
} from './governance'
import { GLOBAL_RESPONSES, isGlobalEvent, type GlobalEventId } from './geopolitics'
import { difficultyOf, type Difficulty } from './difficulty'
import { drawPressure, findPressure } from './pressure'
import { findPromise, promiseVerdictDelta, type ChoiceRecord, type PromiseRecord } from './promises'
import { budgetOutcome, emendaGrowth, emendaValue, findBudgetOption, findEmendaOption } from './budget'
import { CLIMATE_LABELS } from './climate'
import { cardSidesAt, cardYear, findCard, DECISION_CARDS, findOption, type DecisionCard, type DecisionChoice, type Side } from './decisions'
import { mulberry32 } from './events'
import type { Mission } from './game'
import type { Municipio } from './ibge'
import {
  chooseBill,
  getTemplate,
  lawToEffect,
  previewStance,
  startBill,
  type BillDraft,
  type BillState,
  type LegislativeContext,
} from './lawmaking'
import {
  findParty,
  assemblySeats,
  composeChamber,
  councilSeats,
  FEDERAL_SEATS,
  hashString,
  PARODY_SEATS,
  partiesOf,
  SENATORS_PER_UF,
  type Chamber,
  type PartySystem,
} from './legislature'
import type { SeparationType } from './params'
import type { CustomBill } from './customBill'
import { electionType } from './politics'
import { QUIZ_POINTS, QUIZZES, type Quiz } from './quizzes'
import { buildCoalition, type VoteReason } from './legislature'
import { isExecutive, isLegislator, ROLES } from './roles'
import type { LawEffectInput, SimInput, UfEffect, YearResult } from './simulation'
import { HORIZON } from './simulation'
import type { UF } from './states'

export interface PlayerSetup {
  office: Office
  uf: UF
  municipio: Municipio | null
  party: string
  /** Partidos fictícios ou paródia do Congresso eleito em 2026 */
  partySystem?: PartySystem
  difficulty?: Difficulty
}

export interface MuniEffect {
  fromYear: number
  years: number
  growth: number
  climateFactor?: number
}

export interface BillRecord {
  year: number
  authorIsPlayer: boolean
  level: Level
  state: BillState
  ctx: LegislativeContext
}

export interface CareerLog {
  year: number
  kind: 'eleicao' | 'cargo' | 'lei' | 'crise' | 'info'
  title: string
  text: string
  good?: boolean
}

export type TurnItem =
  | { kind: 'card'; card: DecisionCard; side: Side | undefined }
  | { kind: 'vote-card'; card: DecisionCard; side: Side; optionId: string; stance: PartyStance }
  | { kind: 'stf-card'; card: DecisionCard; side: Side | undefined; optionId: string }
  | { kind: 'quiz'; quiz: Quiz }
  | { kind: 'crise'; uf: UF; title: string; text: string }
  | { kind: 'ai-bill-vote'; draft: BillDraft; authorParty: string; authorOffice: Office; stance: PartyStance | null; authorInGovernment: boolean }
  | { kind: 'bill-pending' }
  | { kind: 'career' }
  | { kind: 'separatismo'; region: Side; support: number; tier: number }
  /** Proposta de orçamento anual (Executivo) */
  | { kind: 'orcamento'; support: number; lastGrowth: number }
  /** Destino das emendas individuais (Legislativo) */
  | { kind: 'emendas'; value: number; territoryGdp: number; territory: string }
  /** Promessa de campanha (initial = mandato que já começou com o jogo) */
  | { kind: 'promessa'; office: Office; initial: boolean }
  /** Proposta ilícita */
  | { kind: 'oferta'; offerId: string; amount: number }
  /** Defesa num processo criminal */
  | { kind: 'defesa'; amount: number; lawyerCost: number }
  /** Como financiar a campanha */
  | { kind: 'campanha'; office: Office; ceiling: number }
  /** Pedido de CPI na casa do jogador (Legislativo) */
  | { kind: 'cpi'; topic: string; needed: number; house: string; inGovernment: boolean }
  /** CPI sobre o governo do jogador (Executivo) */
  | { kind: 'cpi-governo'; topic: string }
  /** Processo de impeachment contra o jogador (Executivo) */
  | { kind: 'impeachment'; support: number }
  /** Votação do impeachment do presidente (deputados e senadores) */
  | { kind: 'impeachment-voto'; govApproval: number; inGovernment: boolean }
  /** Resposta do presidente a uma crise global */
  | { kind: 'crise-global'; eventId: GlobalEventId; title: string; text: string }
  /** Pressão de grupos de interesse, greves, notícias falsas e pautas-bomba */
  | { kind: 'pressao'; eventId: string }

/** Orientação do partido do jogador numa votação, com o motivo. */
export interface PartyStance {
  orientation: 'sim' | 'nao' | 'liberada'
  reason: VoteReason
  /** Apoio do partido só pelo conteúdo, 0 a 1 */
  merit: number
  partyInGovernment: boolean
  /** Texto explicando a orientação */
  text: string
}

export function stanceText(st: Omit<PartyStance, 'text'>, authorIsRival: boolean, electionSoon: boolean): string {
  const camp = st.partyInGovernment ? 'da base do governo' : 'de oposição'
  const o = st.orientation === 'sim' ? 'votar SIM' : st.orientation === 'nao' ? 'votar NÃO' : 'votar livremente (bancada liberada)'
  const why =
    st.reason === 'estrategia'
      ? `Pelo conteúdo, o partido até concorda com a proposta (${Math.round(st.merit * 100)}% de afinidade), mas o autor é do campo rival e aprovar daria uma vitória a ele${electionSoon ? ' às vésperas da eleição' : ''}.`
      : st.reason === 'negociacao'
        ? 'O conteúdo não agrada tanto, mas houve acordo por cargos e emendas.'
        : st.reason === 'governo'
          ? st.partyInGovernment
            ? 'A orientação segue o governo, mesmo que o conteúdo não seja prioridade do partido.'
            : 'A orientação é de oposição ao governo.'
          : `A orientação reflete o conteúdo: ${Math.round(st.merit * 100)}% de afinidade com as posições do partido${authorIsRival ? ', apesar de o autor ser do campo rival' : ''}.`
  return `Seu partido, ${camp}, orienta ${o}. ${why}`
}

export interface CareerState {
  setup: PlayerSetup
  /** Ano atual da simulação (0 = 2023) */
  t: number
  /** Cargo atual; null = sem mandato */
  office: Office | null
  /** Ano (t) da próxima eleição do cargo atual ou da candidatura */
  nextElection: number | null
  /** Cargo disputado quando o jogador está sem mandato */
  candidacy: Office | null
  consecutiveTerms: number
  yearsInOffice: number
  /** Capital político: moeda de negociação */
  capital: number
  /** Aprovação (Executivo), popularidade (Legislativo) ou legitimidade (STF), 0 a 100 */
  approval: number
  decisions: DecisionChoice[]
  quiz: Record<string, string>
  bills: BillRecord[]
  /** Projeto em tramitação aguardando decisão do jogador */
  activeBill: BillRecord | null
  /** O jogador já propôs um projeto neste ano */
  proposedThisYear: boolean
  lawEffects: LawEffectInput[]
  ufEffects: UfEffect[]
  muniEffects: MuniEffect[]
  log: CareerLog[]
  /** Itens resolvidos para o próximo ano (chaves) */
  resolved: string[]
  /** Aguardando escolha de novo cargo */
  needsCareerChoice: boolean
  /** Respostas a crises (uf:ano → opção) */
  crises: Record<string, string>
  /** Separação decidida durante o jogo (sobrepõe o cenário) */
  separation: { year: number; type: SeparationType } | null
  /** Apoio ao separatismo em cada macrorregião, % (só enquanto o país está unido) */
  movement: Record<Side, number>
  /** Quantas vezes o jogador apoiou o caminho separatista */
  separatistStance: number
  /** Patamares de apoio já apresentados ao jogador */
  movementTiers: number[]
  /** Cargos executivos em que o jogador atingiu o limite de dois mandatos seguidos (ano t do fim) */
  termLimited: { office: Office; year: number }[]
  /** Relação com o próprio partido, 0 a 100: cai ao votar contra a orientação */
  partyLoyalty: number
  /** Propostas criadas pelo jogador (com IA ou formulário) */
  customBills: CustomBill[]
  /** Promessas de campanha e a cobrança de cada uma */
  promises: PromiseRecord[]
  /** Escolhas de orçamento e emendas, para avaliar promessas */
  history: ChoiceRecord[]
  /** Patrimônio pessoal, R$ */
  wealth: number
  /** Patrimônio ao fim de cada ano (t) */
  wealthHistory: { t: number; value: number }[]
  /** Dinheiro ilícito recebido e ainda não descoberto, R$ */
  illicitGains: number
  /** Exposição acumulada: chance de o esquema vir à tona */
  exposure: number
  criminalCase: CriminalCase | null
  /** Ano (t) até o qual o jogador está inelegível (Ficha Limpa) */
  ineligibleUntil: number | null
  /** Gastos de campanha que rendem votos na eleição do ano */
  campaignSpend: { year: number; bonus: number }[]
}

export const START_CAPITAL = 8

/**
 * Primeira eleição de um cargo a partir do ano t, com pelo menos 2 anos de
 * mandato: municipais em anos múltiplos de 4 (2028…), gerais nos demais
 * pares (2026…); senadores cumprem 8 anos.
 */
export function firstElection(office: Office, t: number, minYears = 2): number | null {
  const role = ROLES[office]
  if (!role.election) return null
  for (let y = t + minYears; y <= t + 12; y++) {
    if (electionType(2023 + y) === role.election) return office === 'senador' && y - t < 6 ? y + 4 : y
  }
  return null
}

/** Próxima eleição do tipo do cargo a partir do ano t (inclusive). */
export function nextElectionOfType(office: Office, t: number): number | null {
  const role = ROLES[office]
  if (!role.election) return null
  for (let y = t; y <= t + 4; y++) if (electionType(2023 + y) === role.election) return y
  return null
}

export function sideOf(partition: Record<UF, Side>, uf: UF): Side {
  return partition[uf]
}

export function newCareer(setup: PlayerSetup): CareerState {
  const wealth = initialWealth(setup.office, hashString(`${setup.uf}:${setup.party}:${setup.municipio?.id ?? ''}`))
  return {
    wealth,
    wealthHistory: [{ t: 0, value: wealth }],
    illicitGains: 0,
    exposure: 0,
    criminalCase: null,
    ineligibleUntil: null,
    campaignSpend: [],
    setup,
    t: 0,
    office: setup.office,
    nextElection: firstElection(setup.office, 0),
    candidacy: null,
    consecutiveTerms: 1,
    yearsInOffice: 0,
    capital: START_CAPITAL + difficultyOf(setup.difficulty).capital,
    approval: 50,
    decisions: [],
    quiz: {},
    bills: [],
    activeBill: null,
    proposedThisYear: false,
    lawEffects: [],
    ufEffects: [],
    muniEffects: [],
    log: [
      {
        year: 0,
        kind: 'cargo',
        title: `Você assume como ${lowerFirst(ROLES[setup.office].title)}`,
        text: `${ROLES[setup.office].body}${setup.municipio ? ` de ${setup.municipio.name}` : ''} (${setup.uf}). ${ROLES[setup.office].reelection}`,
        good: true,
      },
    ],
    resolved: [],
    needsCareerChoice: false,
    crises: {},
    separation: null,
    movement: { A: 8, B: 6 },
    separatistStance: 0,
    movementTiers: [],
    termLimited: [],
    partyLoyalty: 70,
    customBills: [],
    promises: [],
    history: [],
  }
}

/** O país já está separado no ano t? */
export function separatedAt(input: SimInput, t: number): boolean {
  const y = input.params.separationYear
  return y !== null && t >= y
}

/** Lado do governo nacional do jogador: unido, há um só governo (lado A). */
export function nationalSide(input: SimInput, uf: UF, t: number): Side {
  return separatedAt(input, t) ? sideOf(input.params.partition, uf) : 'A'
}

/** Cartas nacionais que aparecem no ano t, com os lados que decidem. */
export function cardsDue(input: SimInput, t: number) {
  const sep = input.params.separationYear
  return DECISION_CARDS.filter((c) => cardYear(c, sep) === t).map((card) => ({
    card,
    sides: cardSidesAt(card, separatedAt(input, t)),
  }))
}

export const SEPARATION_TIERS = [20, 35, 50]

// Atores simulados -----------------------------------------------------------------------

/** Escolha de um ator simulado para uma carta nacional (reproduzível). */
export function aiChoice(card: DecisionCard, side: Side | undefined, seed: number): string {
  const rng = mulberry32((seed ^ hashString(`ia:${card.id}:${side ?? 'T'}`)) >>> 0)
  const r = rng()
  if (r < 0.35) return card.options[0].id
  const rest = card.options.slice(1)
  return rest[Math.floor(((r - 0.35) / 0.65) * rest.length)]?.id ?? card.options[0].id
}

/** Opções de cartas nacionais que costumam ser questionadas no tribunal. */
export const CHALLENGEABLE: Record<string, string[]> = {
  empresas: ['repelir'],
  mobilidade: ['proibir'],
  'reforma-politica': ['teto-emendas'],
  divida: ['populacao'],
}

/** Partido no comando de um Executivo em um mandato (simulado). */
export function executiveParty(seed: number, territory: string, term: number, system: PartySystem = 'ficticio'): string {
  // Na paródia de 2026, o governo nacional até 2030 é o da federação do presidente reeleito.
  if (system === 'parodia-2026' && territory === 'brasil' && term <= 1) return 'FBE'
  const PARTIES = partiesOf(system)
  const rng = mulberry32((seed ^ hashString(`exec:${territory}:${term}`)) >>> 0)
  // Ponderado pelo quadrado da bancada: partidos pequenos raramente chefiam o Executivo.
  const total = PARTIES.reduce((a, p) => a + p.share ** 2, 0)
  const r = rng() * total
  let acc = 0
  for (const p of PARTIES) {
    acc += p.share ** 2
    if (r < acc) return p.id
  }
  return PARTIES[0].id
}

function termIndex(t: number) {
  // Mandatos gerais começam em 2027, 2031… (t = 4, 8…); municipais em 2025, 2029… (t = 2, 6…).
  return Math.floor((t + 1) / 4)
}

export function officeLevel(o: Office): Level {
  return ROLES[o].level
}

/** Contexto legislativo do território do jogador para um nível. */
export function legislativeContext(
  state: CareerState,
  input: SimInput,
  results: YearResult[],
  level: Level,
  t: number,
  author: Office,
  authorParty: string,
): LegislativeContext {
  const { setup } = state
  const seed = input.seed
  const partition = input.params.partition
  const separated = separatedAt(input, t)
  const side = separated ? sideOf(partition, setup.uf) : 'A'
  const term = termIndex(t)
  const system = setup.partySystem ?? 'ficticio'
  const office = state.office
  let chambers: Chamber[]
  let executiveTitle: string
  let territory: string
  let execOffice: Office
  if (level === 'federal') {
    const ufs = (Object.keys(partition) as UF[]).filter((u) => !separated || partition[u] === side)
    const deputies = ufs.reduce((a, u) => a + FEDERAL_SEATS[u], 0)
    // Paródia de 2026: com o país unido, a legislatura eleita em 2026 tem as cadeiras reais.
    const real = system === 'parodia-2026' && !separated && term <= 1
    chambers = [
      composeChamber(`camara-${separated ? side : 'BR'}-${term}`, 'Câmara dos Deputados', deputies, seed, system, real ? PARODY_SEATS.camara : undefined),
      composeChamber(`senado-${separated ? side : 'BR'}-${term}`, 'Senado Federal', ufs.length * SENATORS_PER_UF, seed, system, real ? PARODY_SEATS.senado : undefined),
    ]
    executiveTitle = 'Presidente da República'
    territory = separated ? `bloco-${side}` : 'brasil'
    execOffice = 'presidente'
  } else if (level === 'estadual') {
    chambers = [composeChamber(`assembleia-${setup.uf}-${term}`, 'Assembleia Legislativa', assemblySeats(FEDERAL_SEATS[setup.uf]), seed, system)]
    executiveTitle = 'Governador(a)'
    territory = `uf-${setup.uf}`
    execOffice = 'governador'
  } else {
    const pop = setup.municipio?.pop ?? 100_000
    chambers = [composeChamber(`camara-municipal-${setup.municipio?.id}-${term}`, 'Câmara Municipal', councilSeats(pop), seed, system)]
    executiveTitle = 'Prefeito(a)'
    territory = `mun-${setup.municipio?.id}`
    execOffice = 'prefeito'
  }
  const playerIsExec = office === execOffice
  const execParty = playerIsExec ? (findParty(setup.party)?.id ?? setup.party) : executiveParty(seed, territory, term, system)
  const prevResult = results[Math.max(0, t - 1)]
  const cabinet = level === 'federal' ? (side === 'A' ? input.params.cabinetA : input.params.cabinetB) : 'misto'
  const election = electionType(2023 + t)
  const pressure = election && (election === 'municipal') === (level === 'municipal') ? 1 : 0.3
  return {
    level,
    seed: (seed ^ hashString(`${level}:${t}:${state.bills.length}`)) >>> 0,
    t,
    author,
    authorParty: findParty(authorParty)?.id ?? authorParty,
    chambers,
    initiatingHouse: level === 'federal' && author === 'senador' ? 1 : 0,
    executiveParty: execParty,
    executiveCabinet: prevResult ? cabinet : 'misto',
    executiveTitle,
    courtName: level === 'municipal' ? 'Tribunal de Justiça' : 'STF',
    player: {
      author: author === office,
      executive: playerIsExec,
      court: office === 'ministro-stf' && level === 'federal',
    },
    electionPressure: pressure,
  }
}

// Fila de decisões do ano ------------------------------------------------------------------

export function itemKey(item: TurnItem, t: number): string {
  switch (item.kind) {
    case 'card':
      return `card:${item.card.id}:${item.side ?? 'T'}`
    case 'vote-card':
      return `vote:${item.card.id}:${item.side}`
    case 'stf-card':
      return `stf:${item.card.id}:${item.side ?? 'T'}`
    case 'quiz':
      return `quiz:${item.quiz.id}`
    case 'crise':
      return `crise:${item.uf}:${t}`
    case 'ai-bill-vote':
      return `ai-bill:${t}`
    case 'bill-pending':
      return 'bill-pending'
    case 'career':
      return `career:${t}`
    case 'separatismo':
      return `separatismo:${item.tier}`
    case 'orcamento':
      return `orcamento:${t}`
    case 'emendas':
      return `emendas:${t}`
    case 'promessa':
      return `promessa:${t}`
    case 'oferta':
      return `oferta:${t}`
    case 'defesa':
      return `defesa:${t}`
    case 'campanha':
      return `campanha:${t}`
    case 'cpi':
      return `cpi:${t}`
    case 'cpi-governo':
      return `cpi-governo:${t}`
    case 'impeachment':
      return `impeachment:${t}`
    case 'impeachment-voto':
      return `impeachment-voto:${t}`
    case 'crise-global':
      return `crise-global:${item.eventId}:${t}`
    case 'pressao':
      return `pressao:${t}`
  }
}

/**
 * Monta as decisões que o jogador precisa tomar antes de simular o ano t+1.
 * As escolhas de atores simulados são registradas em `decisions` aqui mesmo.
 */
export function pendingItems(state: CareerState, input: SimInput, results: YearResult[]): TurnItem[] {
  const next = state.t + 1
  if (next > HORIZON) return []
  const items: TurnItem[] = []
  if (state.needsCareerChoice) return [{ kind: 'career' }]
  if (state.activeBill?.state.pending) items.push({ kind: 'bill-pending' })

  const office = state.office
  const side = nationalSide(input, state.setup.uf, next)

  for (const { card, sides } of cardsDue(input, next)) {
    for (const s of sides) {
      const playerDecides = office === 'presidente' && (s === undefined || s === side)
      if (playerDecides) items.push({ kind: 'card', card, side: s })
    }
    // Votação no Congresso do bloco do jogador.
    if (card.needsCongress && (office === 'deputado-federal' || office === 'senador')) {
      const choice = choiceFor(state, input, card, card.scope === 'tratado' ? undefined : side)
      if (choice && choice !== card.options[0].id && sides.length > 0 && (card.scope !== 'A' || side === 'A')) {
        // Propostas do governo: a base tende a apoiar e a oposição a rejeitar.
        const ctx = legislativeContext(state, input, results, 'federal', next, 'presidente', executiveParty(input.seed, 'brasil', termIndex(next), state.setup.partySystem))
        const coalition = buildCoalition(ctx.chambers[0], ctx.executiveParty, ctx.executiveCabinet)
        const inGov = coalition.has(findParty(state.setup.party)?.id ?? state.setup.party)
        const base = {
          orientation: inGov ? ('sim' as const) : ('nao' as const),
          reason: inGov ? ('governo' as VoteReason) : ('estrategia' as VoteReason),
          merit: 0.5,
          partyInGovernment: inGov,
        }
        const stance: PartyStance = {
          ...base,
          text: inGov
            ? 'Seu partido é da base do governo e orienta votar SIM na proposta do presidente.'
            : 'Seu partido é de oposição e orienta votar NÃO: aprovar fortaleceria o governo, independentemente do mérito.',
        }
        items.push({ kind: 'vote-card', card, side, optionId: choice, stance })
      }
    }
    // Ação no tribunal.
    if (office === 'ministro-stf') {
      const s = card.scope === 'tratado' ? undefined : side
      const choice = choiceFor(state, input, card, s)
      if (choice && sides.length > 0 && CHALLENGEABLE[card.id]?.includes(choice))
        items.push({ kind: 'stf-card', card, side: s, optionId: choice })
    }
  }

  // Orçamento do ano seguinte (Executivo) e emendas (Legislativo).
  if (office && office !== 'ministro-stf' && state.t >= 1) {
    const lastGrowth = territoryStats(state, input, results, state.t).growth
    if (isExecutive(office)) {
      const support =
        office === 'presidente' && results[state.t]
          ? Math.min(95, Math.max(5, results[state.t][separatedAt(input, state.t) ? side : 'A'].institutions.congressSupport + difficultyOf(state.setup.difficulty).support))
          : Math.min(90, Math.max(15, 25 + state.approval * 0.6 + difficultyOf(state.setup.difficulty).support))
      items.push({ kind: 'orcamento', support, lastGrowth })
      const rng = mulberry32((input.seed ^ hashString(`governo:${next}:${office}`)) >>> 0)
      // Impeachment: só com aprovação e apoio muito baixos.
      if (state.approval < 30 && support < 40 && rng() < 0.6) items.push({ kind: 'impeachment', support })
      else if (rng() < 0.18) items.push({ kind: 'cpi-governo', topic: CPI_TOPICS[Math.floor(rng() * CPI_TOPICS.length)] })
    } else if (isLegislator(office)) {
      const uf = state.setup.uf
      const ufGdp = results[state.t].uf[uf].gdp
      const muni = state.setup.municipio
      const value = emendaValue(office, {
        ufGdp,
        assembly: assemblySeats(FEDERAL_SEATS[uf]),
        muniPop: muni?.pop,
        council: muni ? councilSeats(muni.pop) : undefined,
      })
      const rng = mulberry32((input.seed ^ hashString(`legislativo:${next}:${office}`)) >>> 0)
      if (rng() < 0.25) {
        const { needed, house } = cpiSignatures(office, muni ? councilSeats(muni.pop) : 21, assemblySeats(FEDERAL_SEATS[uf]))
        items.push({
          kind: 'cpi',
          topic: CPI_TOPICS[Math.floor(rng() * CPI_TOPICS.length)],
          needed,
          house,
          inGovernment: playerInGovernment(state, input, results, officeLevel(office), next),
        })
      }
      // Impeachment do presidente: deputados e senadores votam quando o governo nacional desaba.
      const nat = results[state.t]
      if ((office === 'deputado-federal' || office === 'senador') && nat && !separatedAt(input, state.t)) {
        const gov = nat.A.approval
        const cong = nat.A.institutions.congressSupport
        if (gov < 28 && cong < 40 && rng() < 0.4)
          items.push({ kind: 'impeachment-voto', govApproval: gov, inGovernment: playerInGovernment(state, input, results, 'federal', next) })
      }
      const local = office === 'vereador' && muni
      if (value > 0)
        items.push({
          kind: 'emendas',
          value,
          territoryGdp: local ? muni.gdp : ufGdp,
          territory: local ? muni.name : uf,
        })
    }
  }

  // Campanha: promessa para a eleição deste ano (ou para o mandato que começa com o jogo).
  const campaign = campaignOffice(state, next)
  if (campaign) items.push({ kind: 'promessa', office: campaign, initial: state.t === 0 && state.office === campaign && state.nextElection !== next })

  // Crises globais do ano que passou: o presidente decide a resposta.
  const lastYear = results[state.t]
  if (office === 'presidente' && lastYear)
    for (const e of lastYear.newEvents)
      if (isGlobalEvent(e.id) && GLOBAL_RESPONSES[e.id].length > 0)
        items.push({ kind: 'crise-global', eventId: e.id, title: e.title, text: e.explanation })

  // Grupos de interesse, greves, notícias falsas e pautas-bomba.
  if (office && state.t >= 1) {
    const rng = mulberry32((input.seed ^ hashString(`pressao:${next}:${office}`)) >>> 0)
    const weak =
      isExecutive(office) &&
      (office === 'presidente' && lastYear
        ? lastYear[separatedAt(input, state.t) ? side : 'A'].institutions.congressSupport + difficultyOf(state.setup.difficulty).support < 45
        : state.approval < 40)
    const ev = office === 'ministro-stf' ? (rng() < 0.15 ? findPressure('fake-news') ?? null : null) : drawPressure(office, rng, weak, difficultyOf(state.setup.difficulty).events)
    if (ev) items.push({ kind: 'pressao', eventId: ev.id })
  }

  // Financiamento da campanha (anos de eleição).
  if (campaign && !(state.t === 0 && state.office === campaign && state.nextElection !== next) && campaign !== 'ministro-stf')
    items.push({
      kind: 'campanha',
      office: campaign,
      ceiling: campaignCeiling(campaign, input.baseline.states[state.setup.uf].pop, state.setup.municipio?.pop),
    })

  // Propostas ilícitas e defesa em processo.
  if (office && !state.criminalCase) {
    const offer = offerFor(office, input.seed, next, difficultyOf(state.setup.difficulty).offers)
    if (offer) items.push({ kind: 'oferta', offerId: offer.id, amount: offer.amount(office, state.setup.municipio?.pop ?? 100_000) })
  }
  const cc = state.criminalCase
  if (cc && cc.stage === 'denuncia' && cc.defense === null)
    items.push({ kind: 'defesa', amount: cc.amount, lawyerCost: Math.round(Math.max(300_000, cc.amount * 0.3)) })

  for (const quiz of QUIZZES.filter((q) => q.year === next)) items.push({ kind: 'quiz', quiz })

  // Crises climáticas do ano que passou no território do jogador.
  const last = results[state.t]
  if (last && office && office !== 'ministro-stf') {
    for (const e of last.climateEvents) {
      const inTerritory =
        ROLES[office].territory === 'bloco' ? !separatedAt(input, state.t) || e.block === side : e.uf === state.setup.uf
      if (inTerritory) {
        items.push({
          kind: 'crise',
          uf: e.uf,
          title: `${CLIMATE_LABELS[e.kind]} em ${e.uf}`,
          text: e.explanation,
        })
        break
      }
    }
  }

  // Projeto de outro autor na casa do jogador (legisladores votam antes da tramitação).
  if (office && isLegislator(office) && !state.resolved.includes(`ai-bill:${next}`)) {
    const draft = aiBillDraft(input.seed, officeLevel(office), next)
    if (draft) {
      const rng = mulberry32((input.seed ^ hashString(`ai-author:${next}`)) >>> 0)
      const authorParty = (() => {
        const pool = partiesOf(state.setup.partySystem).filter((x) => x.share > 0 && x.id !== state.setup.party)
        return pool[Math.floor(rng() * pool.length)].id
      })()
      const authorOffice = aiAuthorOffice(officeLevel(office), draft.templateId)
      const ctx = legislativeContext(state, input, results, officeLevel(office), next, authorOffice, authorParty)
      const prev = state.setup.party ? previewStance(ctx, draft, findParty(state.setup.party)?.id ?? state.setup.party) : null
      const stance: PartyStance | null = prev
        ? {
            orientation: prev.orientation,
            reason: prev.reason,
            merit: prev.breakdown.merit,
            partyInGovernment: prev.partyInGovernment,
            text: stanceText(
              { orientation: prev.orientation, reason: prev.reason, merit: prev.breakdown.merit, partyInGovernment: prev.partyInGovernment },
              prev.breakdown.rival,
              ctx.electionPressure >= 1,
            ),
          }
        : null
      items.push({ kind: 'ai-bill-vote', draft, authorParty, authorOffice, stance, authorInGovernment: prev?.authorInGovernment ?? false })
    }
  }

  // Movimento separatista (só com o país unido).
  if (!separatedAt(input, next) && !state.separation) {
    const region: Side = state.movement.A >= state.movement.B ? 'A' : 'B'
    const support = state.movement[region]
    const tier = SEPARATION_TIERS.filter((x) => support >= x).pop()
    if (tier !== undefined && !state.movementTiers.includes(tier)) items.push({ kind: 'separatismo', region, support, tier })
  }

  return items.filter((it) => !state.resolved.includes(itemKey(it, next)))
}

/** O partido do jogador está na coalizão do governo do nível indicado? */
function playerInGovernment(state: CareerState, input: SimInput, results: YearResult[], level: Level, t: number): boolean {
  const ctx = legislativeContext(state, input, results, level, t, level === 'federal' ? 'deputado-federal' : level === 'estadual' ? 'deputado-estadual' : 'vereador', state.setup.party)
  const coalition = buildCoalition(ctx.chambers[0], ctx.executiveParty, ctx.executiveCabinet)
  return coalition.has(findParty(state.setup.party)?.id ?? state.setup.party)
}

/** Cargo em disputa no ano `next`, se o jogador estiver em campanha. */
function campaignOffice(state: CareerState, next: number): Office | null {
  if (state.t === 0 && state.promises.length === 0 && state.office && ROLES[state.office].termYears && state.nextElection !== next)
    return state.office
  if (state.nextElection !== next) return null
  if (state.office) {
    if (!ROLES[state.office].termYears) return null
    if (isExecutive(state.office) && state.consecutiveTerms >= 2) return null
    return state.office
  }
  return state.candidacy && state.candidacy !== 'ministro-stf' ? state.candidacy : null
}

function aiAuthorOffice(level: Level, templateId: string): Office {
  const t = findBill(templateId)
  if (t && t.initiative !== 'qualquer') return t.initiative[0]
  return level === 'federal' ? 'deputado-federal' : level === 'estadual' ? 'deputado-estadual' : 'vereador'
}

function aiBillDraft(seed: number, level: Level, t: number): BillDraft | null {
  const pool = BILLS.filter((b) => b.level === level && !b.vices?.length)
  if (pool.length === 0) return null
  const rng = mulberry32((seed ^ hashString(`ai-bill:${level}:${t}`)) >>> 0)
  const tpl = pool[Math.floor(rng() * pool.length)]
  const variant = tpl.variants?.[Math.floor(rng() * tpl.variants.length)]
  return { templateId: tpl.id, variantId: variant?.id, norm: tpl.requiredNorm, urgency: rng() < 0.3, bargaining: rng() * 0.6 }
}

function choiceFor(state: CareerState, input: SimInput, card: DecisionCard, side: Side | undefined): string | undefined {
  const existing = state.decisions.find((d) => d.cardId === card.id && d.side === side)
  return existing?.optionId ?? aiChoice(card, side, input.seed)
}

/** Garante que todas as cartas nacionais do ano tenham escolha (jogador ou atores simulados). */
export function fillAiDecisions(state: CareerState, input: SimInput): CareerState {
  const next = state.t + 1
  const side = nationalSide(input, state.setup.uf, next)
  const decisions = [...state.decisions]
  for (const { card, sides } of cardsDue(input, next)) {
    for (const s of sides) {
      if (decisions.some((d) => d.cardId === card.id && d.side === s)) continue
      const playerDecides = state.office === 'presidente' && (s === undefined || s === side)
      if (playerDecides) continue
      decisions.push({ cardId: card.id, optionId: aiChoice(card, s, input.seed), side: s })
    }
  }
  return { ...state, decisions }
}

// Resolução das escolhas ---------------------------------------------------------------------

export function resolveItem(
  state: CareerState,
  item: TurnItem,
  optionId: string,
  input: SimInput,
  results: YearResult[],
): CareerState {
  const next = state.t + 1
  const s: CareerState = { ...state, resolved: [...state.resolved, itemKey(item, next)] }
  switch (item.kind) {
    case 'card':
      s.decisions = [...s.decisions.filter((d) => !(d.cardId === item.card.id && d.side === item.side)), { cardId: item.card.id, optionId, side: item.side }]
      return s
    case 'vote-card': {
      s.decisions = [...s.decisions, { cardId: `voto:${item.card.id}`, optionId, side: item.side }]
      return applyLoyalty(s, item.stance, optionId === 'liberar' ? 'abster' : optionId, next)
    }
    case 'stf-card':
      s.decisions = [...s.decisions, { cardId: `stf:${item.card.id}`, optionId, side: item.side }]
      if (optionId === 'liminar') s.approval = clamp(s.approval - 3)
      if (optionId === 'plenario') s.approval = clamp(s.approval + 1)
      return s
    case 'quiz': {
      s.quiz = { ...s.quiz, [item.quiz.id]: optionId }
      if (optionId === item.quiz.correct) s.capital += 1
      return s
    }
    case 'crise': {
      s.crises = { ...s.crises, [`${item.uf}:${state.t}`]: optionId }
      const boost = optionId === 'calamidade' ? 0.6 : optionId === 'remanejar' ? 0.3 : optionId === 'emendas' ? 0.2 : 0
      if (boost > 0) s.ufEffects = [...s.ufEffects, { uf: item.uf, fromYear: next, years: 1, growth: boost }]
      if (s.setup.municipio && item.uf === s.setup.uf && boost > 0)
        s.muniEffects = [...s.muniEffects, { fromYear: next, years: 1, growth: boost * 1.5 }]
      s.approval = clamp(
        s.approval + (optionId === 'minimizar' ? -6 : optionId === 'calamidade' ? 2 : optionId === 'remanejar' ? 1 : optionId === 'emendas' ? 2 : 0),
      )
      s.log = [
        ...s.log,
        {
          year: next,
          kind: 'crise',
          title: item.title,
          text: CRISIS_OPTIONS.find((o) => o.id === optionId)?.result ?? '',
          good: optionId !== 'minimizar',
        },
      ]
      return s
    }
    case 'ai-bill-vote': {
      const delta = optionId === 'favor' ? 0.15 : optionId === 'contra' ? -0.15 : 0
      const draft = { ...item.draft, bargaining: Math.max(0, Math.min(1, item.draft.bargaining + delta)) }
      const ctx = legislativeContext(s, input, results, officeLevel(state.office ?? 'vereador'), next, item.authorOffice, item.authorParty)
      const bill = startBill(ctx, draft)
      const tpl = getTemplate(bill)
      // Votar com o eleitorado em projetos populares (ou contra impopulares) rende popularidade.
      const pop = tpl.position.popularity
      if (optionId !== 'abster') s.approval = clamp(s.approval + (optionId === 'favor' ? pop : -pop) * 3)
      const loyal = item.stance ? applyLoyalty(s, item.stance, optionId, next) : s
      return registerBill(loyal, { year: next, authorIsPlayer: false, level: ctx.level, state: bill, ctx }, input)
    }
    case 'bill-pending': {
      if (!s.activeBill) return s
      const bill = chooseBill(s.activeBill.ctx, s.activeBill.state, optionId)
      s.capital = Math.max(0, s.capital - (bill.capitalSpent - s.activeBill.state.capitalSpent))
      s.resolved = state.resolved // pausas podem se repetir no mesmo ano
      return registerBill(s, { ...s.activeBill, state: bill }, input)
    }
    case 'career':
      return s
    case 'separatismo':
      return resolveSeparatism(s, item, optionId, input)
    case 'orcamento':
      return resolveBudget(s, item, optionId, input)
    case 'emendas':
      return resolveEmendas(s, item, optionId, input)
    case 'oferta':
      return resolveOffer(s, item, optionId)
    case 'crise-global': {
      const r = GLOBAL_RESPONSES[item.eventId].find((x) => x.id === optionId)
      if (!r) return s
      const side = nationalSide(input, s.setup.uf, next)
      s.lawEffects = [
        ...s.lawEffects,
        { fromYear: next, years: 1, effect: side === 'A' ? { growthA: r.growth, fiscalA: r.fiscal } : { growthB: r.growth, fiscalB: r.fiscal } },
      ]
      s.history = [...s.history, { year: next, kind: 'crise', id: r.id }]
      s.approval = clamp(s.approval + r.approval)
      if (r.cost) s.capital = Math.max(0, s.capital - r.cost)
      s.log = [...s.log, { year: next, kind: 'crise', title: `Resposta à crise: ${lowerFirst(r.label)}`, text: item.title, good: r.approval >= 0 }]
      return s
    }
    case 'pressao':
      return resolvePressure(s, item, optionId, input)
    case 'cpi':
      return resolveCpi(s, item, optionId, input)
    case 'cpi-governo':
      return resolveCpiGov(s, item, optionId, input)
    case 'impeachment':
      return resolveImpeachment(s, item, optionId as ImpeachmentChoice, input)
    case 'impeachment-voto':
      return resolveImpeachmentVote(s, item, optionId, input)
    case 'defesa': {
      if (!s.criminalCase) return s
      const defense = optionId as CriminalCase['defense']
      if (defense === 'advogado') s.wealth = Math.max(0, s.wealth - item.lawyerCost)
      s.criminalCase = { ...s.criminalCase, defense }
      if (defense === 'delacao') s.partyLoyalty = Math.max(0, s.partyLoyalty - 30)
      return s
    }
    case 'campanha': {
      const spend = CAMPAIGN_SPEND[optionId as CampaignSpend] ?? CAMPAIGN_SPEND.fundo
      const cost = Math.round(item.ceiling * spend.share)
      if (cost > s.wealth) return s
      s.wealth -= cost
      s.exposure += spend.risk
      if (spend.bonus) s.campaignSpend = [...s.campaignSpend, { year: next, bonus: spend.bonus }]
      return s
    }
    case 'promessa': {
      if (optionId === 'nenhuma') return s
      const term = ROLES[item.office].termYears ?? 4
      const year = item.initial ? 0 : next
      const due = item.initial ? (state.nextElection ?? term) : next + term
      s.promises = [...s.promises, { id: optionId, office: item.office, year, dueYear: due, status: item.initial ? 'pendente' : 'campanha' }]
      return s
    }
  }
}

function resolvePressure(s: CareerState, item: Extract<TurnItem, { kind: 'pressao' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const ev = findPressure(item.eventId)
  const opt = ev?.options.find((o) => o.id === optionId)
  if (!ev || !opt) return s
  const ok = opt.success === undefined || mulberry32((input.seed ^ hashString(`pressao-resultado:${next}`)) >>> 0)() < opt.success
  const fiscal = ok ? (opt.fiscal ?? 0) : (opt.failFiscal ?? opt.fiscal ?? 0)
  s.approval = clamp(s.approval + (ok ? (opt.approval ?? 0) : (opt.failApproval ?? 0)))
  if (opt.capital) s.capital = Math.max(0, s.capital + opt.capital)
  const growth = opt.growth ?? 0
  if (s.office === 'presidente' && (fiscal || growth)) {
    const side = nationalSide(input, s.setup.uf, next)
    s.lawEffects = [...s.lawEffects, { fromYear: next, years: 1, effect: side === 'A' ? { growthA: growth, fiscalA: fiscal } : { growthB: growth, fiscalB: fiscal } }]
  } else if (growth) {
    // Fora da Presidência, o efeito é local e menor.
    if (s.office === 'prefeito' || s.office === 'vereador') s.muniEffects = [...s.muniEffects, { fromYear: next, years: 1, growth: growth * 0.5 }]
    else s.ufEffects = [...s.ufEffects, { uf: s.setup.uf, fromYear: next, years: 1, growth: growth * (s.office === 'governador' ? 0.6 : 0.3) }]
  }
  const outcome = opt.success === undefined ? '' : ok ? opt.okText : opt.failText
  s.log = [...s.log, { year: next, kind: 'info', title: `${ev.group}: ${lowerFirst(opt.label)}`, text: [ev.title, outcome].filter(Boolean).join('. '), good: ok && (opt.approval ?? 0) >= 0 }]
  return s
}

function resolveCpi(s: CareerState, item: Extract<TurnItem, { kind: 'cpi' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const rng = mulberry32((input.seed ^ hashString(`cpi:${next}`)) >>> 0)
  if (optionId === 'assinar') {
    s.approval = clamp(s.approval + 2)
    if (item.inGovernment) s.partyLoyalty = Math.max(0, s.partyLoyalty - 10)
  } else if (optionId === 'retirar') {
    s.capital += 2
    if (rng() < 0.35) {
      s.approval = clamp(s.approval - 3)
      s.log = [...s.log, { year: next, kind: 'info', title: 'Imprensa revela articulação para barrar CPI', text: 'Mensagens mostram você pedindo a colegas que retirassem assinaturas.', good: false }]
    }
  }
  // A oposição consegue as assinaturas com mais facilidade se o jogador assinou.
  const installed = rng() < (optionId === 'assinar' ? 0.65 : optionId === 'retirar' ? 0.3 : 0.5)
  s.log = [
    ...s.log,
    {
      year: next,
      kind: 'info',
      title: installed ? `CPI instalada: ${item.topic}` : `CPI não alcança as assinaturas: ${item.topic}`,
      text: installed
        ? `O pedido reuniu as ${item.needed} assinaturas exigidas (1/3 da ${item.house}). A comissão pode convocar testemunhas e quebrar sigilos, mas não condena: envia as conclusões ao Ministério Público.`
        : `Faltaram assinaturas para chegar a ${item.needed} (1/3 da ${item.house}). Sem CPI, o tema segue só no noticiário.`,
    },
  ]
  return s
}

function resolveCpiGov(s: CareerState, item: Extract<TurnItem, { kind: 'cpi-governo' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const rng = mulberry32((input.seed ^ hashString(`cpi-gov:${next}`)) >>> 0)
  let text = ''
  if (optionId === 'barrar') {
    s.capital = Math.max(0, s.capital - 3)
    s.approval = clamp(s.approval - 2)
    text = rng() < 0.7 ? 'A base do governo esvaziou a comissão, que terminou sem relatório.' : 'Mesmo com a pressão do governo, a CPI foi instalada e funcionou.'
  } else if (optionId === 'colaborar') {
    s.approval = clamp(s.approval + 2)
    // Documentos entregues ajudam a revelar esquemas que existam.
    if (s.exposure > 0) s.exposure += 3
    text = 'O governo entregou documentos e convocados compareceram.'
  } else {
    const delta = s.approval >= 45 ? 2 : -3
    s.approval = clamp(s.approval + delta)
    text = delta > 0 ? 'O discurso de perseguição mobilizou a base e a CPI perdeu força.' : 'Com a aprovação baixa, o ataque à CPI soou como confissão para parte do eleitorado.'
  }
  s.log = [...s.log, { year: next, kind: 'info', title: `CPI investiga o seu governo: ${item.topic}`, text }]
  return s
}

function resolveImpeachment(s: CareerState, item: Extract<TurnItem, { kind: 'impeachment' }>, choice: ImpeachmentChoice, input: SimInput): CareerState {
  const next = s.t + 1
  const office = s.office as Office
  const rules = impeachmentRules(office)
  const leave = (title: string, text: string) => {
    s.log = [...s.log, { year: next, kind: 'eleicao', title, text, good: false }]
    s.office = null
    s.nextElection = null
    s.candidacy = null
    s.needsCareerChoice = true
  }
  if (choice === 'renunciar') {
    leave('Você renunciou ao cargo', `Antes do julgamento, você renunciou. Sem condenação, mantém o direito de disputar eleições. ${rules.rule}`)
    return s
  }
  if (choice === 'centrao') {
    s.capital = Math.max(0, s.capital - 3)
    if (office === 'presidente') {
      const side = nationalSide(input, s.setup.uf, next)
      s.lawEffects = [...s.lawEffects, { fromYear: next, years: 1, effect: { [side === 'A' ? 'fiscalA' : 'fiscalB']: -0.1 } }]
    }
  }
  if (choice === 'rua') s.approval = clamp(s.approval + 2)
  const rng = mulberry32((input.seed ^ hashString(`impeachment:${next}`)) >>> 0)
  if (rng() < removalChance(item.support, s.approval, choice)) {
    s.ineligibleUntil = Math.max(s.ineligibleUntil ?? 0, next + INHABILITATION_YEARS)
    leave(
      'Afastado(a) por impeachment',
      `${rules.rule} Você perde o cargo e fica inabilitado(a) para funções públicas por ${INHABILITATION_YEARS} anos.`,
    )
  } else {
    s.approval = clamp(s.approval + 3)
    s.log = [
      ...s.log,
      {
        year: next,
        kind: 'info',
        title: 'Você sobreviveu ao pedido de impeachment',
        text: `${rules.rule} Não houve votos suficientes. ${choice === 'centrao' ? 'O apoio custou cargos e emendas.' : ''}`.trim(),
        good: true,
      },
    ]
  }
  return s
}

function resolveImpeachmentVote(s: CareerState, item: Extract<TurnItem, { kind: 'impeachment-voto' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const followsParty = (optionId === 'nao') === item.inGovernment
  if (optionId !== 'abster') {
    s.partyLoyalty = followsParty ? Math.min(100, s.partyLoyalty + 3) : Math.max(0, s.partyLoyalty - 15)
    // Com o governo muito impopular, votar pelo afastamento agrada à maioria do eleitorado.
    s.approval = clamp(s.approval + (optionId === 'sim' ? 2 : -2))
  }
  const rng = mulberry32((input.seed ^ hashString(`impeachment-nacional:${next}`)) >>> 0)
  const removed = rng() < removalChance(item.govApproval < 20 ? 25 : 35, item.govApproval, 'defesa')
  s.log = [
    ...s.log,
    {
      year: next,
      kind: 'info',
      title: removed ? 'Congresso afasta o presidente' : 'Pedido de impeachment do presidente é rejeitado',
      text: `${impeachmentRules('presidente').rule} Você votou ${optionId === 'sim' ? 'a favor do afastamento' : optionId === 'nao' ? 'contra o afastamento' : 'pela abstenção'}${followsParty || optionId === 'abster' ? '' : ', contra a orientação do seu partido'}.`,
    },
  ]
  return s
}

function resolveOffer(s: CareerState, item: Extract<TurnItem, { kind: 'oferta' }>, optionId: string): CareerState {
  const next = s.t + 1
  const offer = ILLICIT_OFFERS.find((o) => o.id === item.offerId)
  if (!offer) return s
  s.history = [...s.history, { year: next, kind: 'oferta', id: optionId }]
  if (optionId === 'aceitar') {
    s.wealth += item.amount
    s.illicitGains += item.amount
    s.exposure += offer.risk
    s.capital += 1
  } else if (optionId === 'denunciar') {
    s.approval = clamp(s.approval + 3)
    s.capital = Math.max(0, s.capital - 2)
    s.log = [
      ...s.log,
      {
        year: next,
        kind: 'info',
        title: 'Você denunciou uma proposta de corrupção',
        text: 'O Ministério Público abriu investigação sobre quem fez a oferta. Eleitores aprovam; alguns colegas passam a desconfiar de você.',
        good: true,
      },
    ]
  }
  return s
}

/** Efeito do orçamento: vale no ano seguinte; investimento rende nos anos depois. */
function resolveBudget(s: CareerState, item: Extract<TurnItem, { kind: 'orcamento' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const office = s.office as Office
  const opt = findBudgetOption(optionId)
  const out = budgetOutcome(opt, item.support, item.lastGrowth, office)
  const k = out.keep
  s.history = [...s.history, { year: next, kind: 'orcamento', id: opt.id }]
  // Tribunal de contas pode suspender obras com indícios de irregularidade: o retorno atrasa um ano.
  let delay = 0
  if (opt.growthLater && mulberry32((input.seed ^ hashString(`auditoria:${next}`)) >>> 0)() < AUDIT_SUSPENSION_CHANCE) {
    delay = 1
    s.log = [
      ...s.log,
      {
        year: next,
        kind: 'info',
        title: `${auditBody(office)} suspende obras do orçamento`,
        text: 'Auditoria encontrou indícios de sobrepreço em licitações. As obras param até a correção dos contratos, e o retorno do investimento atrasa um ano.',
        good: false,
      },
    ]
  }
  if (office === 'presidente') {
    const side = nationalSide(input, s.setup.uf, next)
    const g = side === 'A' ? 'growthA' : 'growthB'
    const f = side === 'A' ? 'fiscalA' : 'fiscalB'
    s.lawEffects = [...s.lawEffects, { fromYear: next, years: 1, effect: { [g]: opt.growthNow * k, [f]: opt.fiscal * k - out.extraEmendas } }]
    if (opt.growthLater) s.lawEffects = [...s.lawEffects, { fromYear: next + 1 + delay, years: opt.laterYears, effect: { [g]: opt.growthLater * k } }]
  } else {
    // Estados e municípios têm orçamentos livres menores em relação ao PIB local.
    const scale = 0.6
    if (office === 'governador') {
      s.ufEffects = [...s.ufEffects, { uf: s.setup.uf, fromYear: next, years: 1, growth: opt.growthNow * k * scale }]
      if (opt.growthLater) s.ufEffects = [...s.ufEffects, { uf: s.setup.uf, fromYear: next + 1 + delay, years: opt.laterYears, growth: opt.growthLater * k * scale }]
    } else {
      s.muniEffects = [...s.muniEffects, { fromYear: next, years: 1, growth: opt.growthNow * k * scale }]
      if (opt.growthLater) s.muniEffects = [...s.muniEffects, { fromYear: next + 1 + delay, years: opt.laterYears, growth: opt.growthLater * k * scale }]
    }
  }
  s.approval = clamp(s.approval + opt.approval * k + out.approvalDelta)
  s.log = [...s.log, { year: next, kind: 'info', title: out.title, text: out.text, good: !out.delayed && !out.contingency }]
  return s
}

function resolveEmendas(s: CareerState, item: Extract<TurnItem, { kind: 'emendas' }>, optionId: string, input: SimInput): CareerState {
  const next = s.t + 1
  const opt = findEmendaOption(optionId)
  s.history = [...s.history, { year: next, kind: 'emendas', id: opt.id }]
  const growth = emendaGrowth(opt, item.value, item.territoryGdp)
  if (s.office === 'vereador') s.muniEffects = [...s.muniEffects, { fromYear: next, years: opt.years, growth }]
  else s.ufEffects = [...s.ufEffects, { uf: s.setup.uf, fromYear: next, years: opt.years, growth }]
  s.approval = clamp(s.approval + opt.approval)
  s.capital += opt.capital
  const rng = mulberry32((input.seed ^ hashString(`emenda:${next}`)) >>> 0)
  const scandal = rng() < opt.scandalRisk
  if (scandal) {
    s.approval = clamp(s.approval - 6)
    s.log = [
      ...s.log,
      {
        year: next,
        kind: 'info',
        title: 'Reportagem questiona destino das suas emendas',
        text: `A imprensa não conseguiu rastrear onde foram parar ${fmtBRL(item.value)} transferidos a prefeituras aliadas. O caso chegou ao Tribunal de Contas.`,
        good: false,
      },
    ]
  } else {
    s.log = [
      ...s.log,
      { year: next, kind: 'info', title: `Emendas: ${lowerFirst(opt.label)}`, text: `${fmtBRL(item.value)} destinados. ${opt.description}`, good: true },
    ]
  }
  return s
}

export interface SeparatismOption {
  id: string
  label: string
  description: string
}

/** Opções diante do movimento separatista, conforme as competências do cargo. */
export function separatismOptions(office: Office | null): SeparatismOption[] {
  if (office === 'presidente')
    return [
      {
        id: 'pacto',
        label: 'Propor um novo pacto federativo',
        description: 'Mais recursos e autonomia para estados e municípios, dentro da Constituição. Reduz o apoio ao movimento; custa 0,15% do PIB ao ano.',
      },
      {
        id: 'stf',
        label: 'Acionar o STF contra consultas separatistas',
        description: 'A forma federativa é cláusula pétrea (art. 60, § 4º, I). Reduz o movimento, mas pode desgastar o governo.',
      },
      { id: 'ignorar', label: 'Não reagir', description: 'Deixa o tema seguir seu curso.' },
      {
        id: 'negociar',
        label: 'Negociar uma separação (caminho hipotético)',
        description:
          'Fora da ordem constitucional: equivale a uma ruptura. O jogo simula uma separação negociada em dois anos para fins educativos.',
      },
    ]
  if (office === 'ministro-stf')
    return [
      {
        id: 'declarar',
        label: 'Votar pela inconstitucionalidade das consultas',
        description: 'Consultas e leis que tendam a abolir a federação violam cláusula pétrea. Reduz o movimento.',
      },
      { id: 'abster', label: 'Aguardar provocação formal', description: 'O tribunal só age quando acionado (art. 103).' },
    ]
  return [
    {
      id: 'apoiar',
      label: 'Apoiar o movimento',
      description: 'Aumenta o apoio na sua região. Se ele passar de 50% com seu apoio repetido, o país pode seguir o caminho hipotético da separação.',
    },
    {
      id: 'combater',
      label: 'Defender a federação',
      description: 'Reduz o apoio ao movimento; pode desagradar eleitores da sua região se o tema for popular lá.',
    },
    { id: 'neutro', label: 'Ficar neutro', description: 'Não se posiciona publicamente.' },
  ]
}

function resolveSeparatism(
  s: CareerState,
  item: Extract<TurnItem, { kind: 'separatismo' }>,
  optionId: string,
  input: SimInput,
): CareerState {
  const next = s.t + 1
  const mine = sideOf(input.params.partition, s.setup.uf)
  const m = { ...s.movement }
  const out: CareerState = { ...s, movementTiers: [...s.movementTiers, item.tier], log: [...s.log] }
  const popular = m[mine] > 30
  const note = (title: string, text: string, good?: boolean) => out.log.push({ year: next, kind: 'info', title, text, good })
  switch (optionId) {
    case 'pacto':
      m.A -= 12
      m.B -= 12
      out.lawEffects = [...out.lawEffects, { fromYear: next, effect: { fiscalA: -0.15, growthA: 0.03 } }]
      out.approval = clamp(out.approval + 2)
      note('Novo pacto federativo', 'Estados e municípios recebem mais recursos e autonomia; o apoio ao separatismo diminui.', true)
      break
    case 'stf':
      m.A -= 6
      m.B -= 6
      out.approval = clamp(out.approval - 1)
      note('Governo aciona o STF', 'A Corte reafirma que a forma federativa é cláusula pétrea; consultas separatistas são suspensas.')
      break
    case 'negociar':
      out.separation = { year: next + 2, type: 'amigavel' }
      note(
        'Caminho hipotético: separação negociada',
        `O governo federal negocia a separação, que passa a valer em ${2023 + next + 2}. No mundo real isso seria uma ruptura constitucional: a federação é indissolúvel (art. 1º) e cláusula pétrea (art. 60, § 4º, I).`,
      )
      break
    case 'declarar':
      m.A -= 8
      m.B -= 8
      out.approval = clamp(out.approval + 1)
      note('STF declara inconstitucionais as consultas separatistas', 'Decisão fundamentada na cláusula pétrea da forma federativa.')
      break
    case 'apoiar':
      m[mine] += 8
      out.separatistStance += 1
      out.approval = clamp(out.approval + (popular ? 2 : -2))
      note('Você apoia o movimento', `O apoio na sua região sobe para cerca de ${Math.round(m[mine])}%.`)
      break
    case 'combater':
      m[mine] -= 5
      out.separatistStance = Math.max(0, out.separatistStance - 1)
      out.approval = clamp(out.approval + (popular ? -2 : 1))
      note('Você defende a federação', 'O apoio ao movimento na sua região diminui.', true)
      break
  }
  out.movement = { A: Math.max(0, m.A), B: Math.max(0, m.B) }
  return out
}

/**
 * Consequências de seguir ou contrariar a orientação do partido: fidelidade
 * rende capital e apoio na campanha; rebeldia custa capital e relação com o
 * partido (e, nos cargos proporcionais, espaço na próxima eleição).
 */
function applyLoyalty(s: CareerState, stance: PartyStance, vote: string, year: number): CareerState {
  if (stance.orientation === 'liberada') return s
  const followed = (vote === 'favor' && stance.orientation === 'sim') || (vote === 'contra' && stance.orientation === 'nao')
  const out = { ...s, log: [...s.log] }
  if (vote === 'abster') {
    out.partyLoyalty = Math.max(0, s.partyLoyalty - 3)
    return out
  }
  if (followed) {
    out.partyLoyalty = Math.min(100, s.partyLoyalty + 3)
    out.capital += 1
    return out
  }
  out.partyLoyalty = Math.max(0, s.partyLoyalty - 15)
  out.capital = Math.max(0, s.capital - 2)
  // Votar a favor de uma boa proposta que o partido rejeita só por estratégia = voto pelo mérito.
  out.history = [...s.history, { year, kind: 'voto', id: stance.reason === 'estrategia' && vote === 'favor' ? 'merito' : 'contra-partido' }]
  out.log.push({
    year,
    kind: 'info',
    title: 'Você votou contra a orientação do partido',
    text:
      out.partyLoyalty < 30
        ? 'A liderança ameaça tirar você de comissões e negar recursos na próxima campanha. Nos cargos proporcionais, o mandato pertence ao partido (fidelidade partidária).'
        : 'A liderança registrou a infidelidade: você perde espaço nas negociações internas.',
    good: false,
  })
  return out
}

export const CRISIS_OPTIONS = [
  {
    id: 'calamidade',
    label: 'Decretar calamidade e pedir apoio federal',
    description: 'Libera recursos extraordinários e flexibiliza metas fiscais para a reconstrução (LRF, art. 65).',
    result: 'Calamidade decretada: recursos extras aceleram a reconstrução no ano seguinte.',
    offices: ['prefeito', 'governador', 'presidente'] as Office[],
  },
  {
    id: 'remanejar',
    label: 'Remanejar o orçamento para a reconstrução',
    description: 'Tira recursos de outras áreas para obras emergenciais.',
    result: 'Orçamento remanejado: a reconstrução avança, com cortes em outras áreas.',
    offices: ['prefeito', 'governador', 'presidente'] as Office[],
  },
  {
    id: 'emendas',
    label: 'Destinar emendas para a reconstrução',
    description: 'Indica recursos do orçamento para as cidades atingidas.',
    result: 'Emendas destinadas às áreas atingidas.',
    offices: ['vereador', 'deputado-estadual', 'deputado-federal', 'senador'] as Office[],
  },
  {
    id: 'minimizar',
    label: 'Minimizar o problema',
    description: 'Evita gastos agora, mas a população atingida percebe a omissão.',
    result: 'A resposta lenta foi criticada; a recuperação depende só da economia local.',
    offices: ['vereador', 'prefeito', 'deputado-estadual', 'governador', 'deputado-federal', 'senador', 'presidente'] as Office[],
  },
]

/** O jogador propõe um projeto de lei (uma vez por ano). */
export function proposeBill(state: CareerState, draft: BillDraft, input: SimInput, results: YearResult[]): CareerState {
  if (!state.office || state.proposedThisYear) return state
  const next = state.t + 1
  const level = officeLevel(state.office)
  const ctx = legislativeContext(state, input, results, level, next, state.office, state.setup.party)
  const bill = startBill(ctx, draft)
  const s: CareerState = {
    ...state,
    proposedThisYear: true,
    capital: Math.max(0, state.capital - bill.capitalSpent),
  }
  return registerBill(s, { year: next, authorIsPlayer: true, level, state: bill, ctx }, input)
}

/** Guarda o projeto; se virou lei, aplica os efeitos. */
function registerBill(state: CareerState, rec: BillRecord, input: SimInput): CareerState {
  if (rec.state.pending) return { ...state, activeBill: rec }
  const s: CareerState = { ...state, activeBill: null, bills: [...state.bills, rec] }
  const tpl = getTemplate(rec.state)
  const side = nationalSide(input, state.setup.uf, rec.year)
  if (rec.state.status === 'lei') {
    const from = rec.year + 1
    if (rec.level === 'federal') {
      const eff = lawToEffect(rec.state, side)
      if (eff) s.lawEffects = [...s.lawEffects, { fromYear: from, effect: eff }]
    } else {
      const k = rec.state.strength
      const e = tpl.effect
      if (rec.level === 'estadual' && (e.localGrowth || e.climateFactor))
        s.ufEffects = [
          ...s.ufEffects,
          { uf: state.setup.uf, fromYear: from, years: e.years ?? 10, growth: (e.localGrowth ?? 0) * k, climateFactor: e.climateFactor },
        ]
      if (rec.level === 'municipal')
        s.muniEffects = [...s.muniEffects, { fromYear: from, years: e.years ?? 10, growth: (e.localGrowth ?? 0) * k, climateFactor: e.climateFactor }]
    }
    const exec = state.office && isExecutive(state.office) && officeLevel(state.office) === rec.level
    if (rec.authorIsPlayer || exec) {
      s.approval = clamp(s.approval + (tpl.effect.approval ?? 0) * Math.max(0, k(rec)) + tpl.position.popularity * 3)
      s.capital += rec.authorIsPlayer ? 2 : 0
    }
    s.log = [
      ...s.log,
      {
        year: rec.year,
        kind: 'lei',
        title: `${rec.authorIsPlayer ? 'Sua proposta virou lei' : 'Nova lei'}: ${tpl.title}`,
        text: rec.state.jabuti ? `Aprovada com um jabuti: ${rec.state.jabuti.text}.` : 'Promulgada; os efeitos começam no ano seguinte.',
        good: true,
      },
    ]
  } else if (!rec.authorIsPlayer) {
    const lastVote = [...rec.state.log].reverse().find((l) => l.vote)
    s.log = [
      ...s.log,
      {
        year: rec.year,
        kind: 'lei',
        title: `Projeto rejeitado: ${tpl.title}`,
        text: lastVote ? `${lastVote.title}. ${lastVote.text}` : (rec.state.log[rec.state.log.length - 1]?.title ?? ''),
      },
    ]
  } else if (rec.authorIsPlayer) {
    s.log = [
      ...s.log,
      {
        year: rec.year,
        kind: 'lei',
        title: `Sua proposta não virou lei: ${tpl.title}`,
        text: rec.state.log[rec.state.log.length - 1]?.title ?? '',
        good: false,
      },
    ]
  }
  return s
}

function k(rec: BillRecord) {
  return rec.state.strength
}

function clamp(v: number) {
  return Math.min(95, Math.max(5, v))
}

// Virada de ano ---------------------------------------------------------------------------------

/** Território do jogador: crescimento e desempenho no ano t. */
export function territoryStats(state: CareerState, input: SimInput, results: YearResult[], t: number) {
  const side = sideOf(input.params.partition, state.setup.uf)
  const office = state.office ?? state.setup.office
  const r = results[t]
  if (ROLES[office].territory === 'bloco') {
    if (separatedAt(input, t)) return { growth: r[side].growth, vs: r[side].vsNoSeparation, name: `Bloco ${side}` }
    const w = r.A.gdp / (r.A.gdp + r.B.gdp)
    return {
      growth: w * r.A.growth + (1 - w) * r.B.growth,
      vs: w * r.A.vsNoSeparation + (1 - w) * r.B.vsNoSeparation,
      name: 'Brasil',
    }
  }
  const uf = r.uf[state.setup.uf]
  if (ROLES[office].territory === 'uf' || !state.setup.municipio) return { growth: uf.growth, vs: uf.vsNoSeparation, name: state.setup.uf }
  const m = municipalSeries(state, results)
  return { growth: m[t]?.growth ?? uf.growth, vs: m[t]?.vs ?? uf.vsNoSeparation, name: state.setup.municipio.name }
}

/** Série do município: acompanha a UF mais os efeitos das leis e decisões municipais. */
export function municipalSeries(state: CareerState, results: YearResult[]) {
  const m = state.setup.municipio
  if (!m) return []
  const out: { gdp: number; pop: number; growth: number; vs: number }[] = []
  let gdp = m.gdp
  let extraIndex = 1
  for (const r of results) {
    if (r.t === 0) {
      out.push({ gdp, pop: m.pop, growth: 0, vs: 0 })
      continue
    }
    const ufNow = r.uf[m.uf]
    const ufPrev = results[r.t - 1].uf[m.uf]
    let extra = 0
    let climateFactor = 1
    for (const e of state.muniEffects) {
      if (r.t >= e.fromYear && r.t < e.fromYear + e.years) {
        extra += e.growth
        if (e.climateFactor) climateFactor *= e.climateFactor
      }
    }
    // Danos climáticos da UF atingem o município; leis municipais de prevenção reduzem.
    const climate = ufNow.climateDamage * (climateFactor - 1)
    const g = (ufNow.gdp / ufPrev.gdp - 1) * 100 + extra - climate
    gdp *= 1 + g / 100
    extraIndex *= 1 + (extra - climate) / 100
    const pop = m.pop * (ufNow.pop / results[0].uf[m.uf].pop)
    out.push({ gdp, pop, growth: g, vs: ufNow.vsNoSeparation + (extraIndex - 1) * 100 })
  }
  return out
}

/** Atualiza aprovação, capital e eleições depois de simular o ano state.t. */
export function settleYear(state: CareerState, input: SimInput, results: YearResult[]): CareerState {
  const s = settleOffice(state, input, results)
  settleWealth(s, input)
  // Promessas feitas nesta eleição só valem se o jogador assumiu o cargo prometido.
  // Quem saiu do cargo antes da cobrança não é avaliado pela promessa.
  if (s.promises.some((p) => p.status === 'pendente' && p.dueYear <= s.t && s.office !== p.office))
    s.promises = s.promises.map((p) => (p.status === 'pendente' && p.dueYear <= s.t && s.office !== p.office ? { ...p, status: 'sem-mandato' } : p))
  if (s.promises.some((p) => p.status === 'campanha' && p.year === s.t))
    s.promises = s.promises.map((p) =>
      p.status === 'campanha' && p.year === s.t ? { ...p, status: s.office === p.office ? 'pendente' : 'sem-mandato' } : p,
    )
  return s
}

/** Patrimônio legal do ano e andamento de investigações. */
function settleWealth(s: CareerState, input: SimInput) {
  const t = s.t
  const legal = legalYearChange(s.wealth, s.office, s.setup.municipio?.pop)
  s.wealth += legal.savings + legal.returns
  const rng = mulberry32((input.seed ^ hashString(`caso:${t}`)) >>> 0)
  const cc = s.criminalCase
  if (!cc) {
    if (s.exposure > 0 && rng() < exposureChance(s.exposure, input.params.mediaInfluence)) {
      const stage = CASE_STAGES.reportagem
      s.criminalCase = { stage: 'reportagem', startYear: t, nextYear: t + 1, amount: s.illicitGains, defense: null }
      s.approval = clamp(s.approval + stage.approval)
      s.log.push({ year: t, kind: 'info', title: stage.title, text: stage.text, good: false })
    }
  } else if (t >= cc.nextYear) {
    // Foro por prerrogativa: tribunais superiores costumam levar mais tempo.
    const slow = s.office && s.office !== 'vereador' && s.office !== 'prefeito' ? 1 : 0
    if (cc.stage === 'reportagem' || cc.stage === 'inquerito') {
      const stageId = cc.stage === 'reportagem' ? 'inquerito' : 'denuncia'
      const stage = CASE_STAGES[stageId]
      s.criminalCase = { ...cc, stage: stageId, nextYear: t + 1 + slow }
      s.approval = clamp(s.approval + stage.approval)
      s.log.push({ year: t, kind: 'info', title: stage.title, text: stage.text, good: false })
    } else {
      const convicted = rng() < convictionChance(cc.defense)
      if (convicted) {
        const restitution = cc.defense === 'delacao' ? cc.amount : cc.amount * 2
        s.wealth = Math.max(0, s.wealth - restitution)
        s.ineligibleUntil = t + INELIGIBILITY_YEARS
        s.log.push({
          year: t,
          kind: 'info',
          title: cc.defense === 'delacao' ? 'Condenado(a) com pena reduzida pela delação' : 'Condenado(a) por corrupção',
          text: `Você ${s.office ? 'perde o mandato, ' : ''}devolve ${fmtBRL(restitution)} ${cc.defense === 'delacao' ? '' : '(valor desviado e multa) '}e fica inelegível até ${2023 + t + INELIGIBILITY_YEARS} pela Lei da Ficha Limpa.${cc.defense === 'delacao' ? ' A colaboração evitou a prisão, mas o seu partido se afastou de você.' : ''}`,
          good: false,
        })
        if (s.office) {
          s.office = null
          s.nextElection = null
          s.candidacy = null
          s.needsCareerChoice = true
        }
        s.approval = clamp(s.approval - 10)
      } else {
        s.log.push({
          year: t,
          kind: 'info',
          title: 'Absolvido(a) por falta de provas',
          text: 'O tribunal não considerou as provas suficientes. A suspeita, porém, continua pesando na sua imagem.',
          good: true,
        })
        s.approval = clamp(s.approval - 2)
      }
      s.criminalCase = null
      s.illicitGains = 0
      s.exposure = 0
    }
  }
  s.wealthHistory = [...s.wealthHistory, { t, value: s.wealth }]
}

/** O eleitor cobra as promessas cujo mandato termina neste ano, antes de votar. */
function chargePromises(s: CareerState) {
  const t = s.t
  const due = s.promises.filter((p) => p.status === 'pendente' && p.dueYear === t)
  if (due.length === 0) return
  const ownLaws = s.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei').map((b) => b.year)
  s.promises = s.promises.map((p) => {
    if (!due.includes(p)) return p
    const def = findPromise(p.id)
    if (!def) return p
    const kept = def.fulfilled({ history: s.history, ownLaws, from: p.year, to: t })
    s.approval = clamp(s.approval + promiseVerdictDelta(def, kept))
    s.log.push({
      year: t,
      kind: 'eleicao',
      title: kept ? `Promessa cumprida: ${def.label}` : `Promessa descumprida: ${def.label}`,
      text: kept
        ? 'Os eleitores reconhecem: a promessa de campanha virou realidade.'
        : def.feasibility === 'impossivel'
          ? `A oposição e a imprensa cobram a promessa, que nunca poderia ser cumprida. ${def.how}`
          : `A promessa não foi cumprida. Para cumprir: ${lowerFirst(def.how)}`,
      good: kept,
    })
    return { ...p, status: kept ? 'cumprida' : 'quebrada' }
  })
}

/** Bônus de votos das promessas feitas para a eleição do ano t. */
export function campaignBonus(state: CareerState, t: number): number {
  const promises = state.promises
    .filter((p) => p.status === 'campanha' && p.year === t)
    .reduce((acc, p) => acc + (findPromise(p.id)?.voteBonus ?? 0), 0)
  return (
    promises + state.campaignSpend.filter((c) => c.year === t).reduce((acc, c) => acc + c.bonus, 0) + difficultyOf(state.setup.difficulty).electionBonus
  )
}

function settleOffice(state: CareerState, input: SimInput, results: YearResult[]): CareerState {
  const t = state.t
  const r = results[t]
  const s: CareerState = { ...state, proposedThisYear: false, resolved: [], log: [...state.log] }
  updateMovement(s, input, results)
  const office = s.office
  if (!office) {
    s.capital += 1
    if (s.candidacy && s.nextElection === t) return runCandidacy(s, s.candidacy, input.seed)
    return s
  }
  s.yearsInOffice += 1
  s.capital += 2
  const side = sideOf(input.params.partition, s.setup.uf)
  const media = 1 + input.params.mediaInfluence / 100

  // Aprovação do próprio cargo.
  if (office === 'presidente') s.approval = r[side].approval
  else if (office === 'ministro-stf') s.approval = clamp(s.approval + (r[side].institutions.legalCertainty - 60) * 0.1)
  else {
    const terr = territoryStats(s, input, results, t)
    const factor = isExecutive(office) ? 1.5 : 0.7
    s.approval = clamp(s.approval + factor * (terr.growth - 2) * media - 1)
  }

  chargePromises(s)

  // Eleição do cargo.
  const role = ROLES[office]
  if (s.nextElection !== null && t === s.nextElection && role.termYears) {
    const limit = isExecutive(office) && s.consecutiveTerms >= 2
    if (limit) {
      const back = nextElectionOfType(office, t + 1)
      s.log.push({
        year: t,
        kind: 'eleicao',
        title: 'Fim do segundo mandato consecutivo',
        text: `Você ocupou o cargo de ${lowerFirst(role.title)} por 8 anos seguidos, o limite: só é permitida uma reeleição consecutiva (art. 14, § 5º). Você pode disputar outros cargos agora e voltar a concorrer a este a partir da eleição de ${2023 + (back ?? t + 4)}, depois de um mandato fora.`,
      })
      s.termLimited = [...s.termLimited, { office, year: t }]
      s.office = null
      s.nextElection = null
      s.needsCareerChoice = true
    } else {
      const won = electionWon(s, input.seed, t)
      s.log.push({
        year: t,
        kind: 'eleicao',
        title: won ? 'Reeleito(a)!' : 'Derrota na eleição',
        text: `Com ${Math.round(s.approval)}% de ${isExecutive(office) ? 'aprovação' : 'popularidade'}, ${
          won ? 'você conquistou mais um mandato.' : 'você não foi reeleito(a). Escolha o próximo passo da sua carreira.'
        }`,
        good: won,
      })
      if (won) {
        s.consecutiveTerms += 1
        s.nextElection = t + role.termYears
        s.approval = clamp(s.approval + 5)
      } else {
        s.office = null
        s.nextElection = null
        s.needsCareerChoice = true
      }
    }
  }
  return s
}

/**
 * Apoio ao separatismo em cada macrorregião (só com o país unido). Cresce com
 * baixa aprovação do governo nacional, escândalos e crises, amplificado pela
 * mídia, e volta lentamente ao nível de base. A separação só ocorre se o
 * jogador seguir esse caminho.
 */
function updateMovement(s: CareerState, input: SimInput, results: YearResult[]) {
  const t = s.t
  if (separatedAt(input, t) || s.separation) return
  const r = results[t]
  const rng = mulberry32((input.seed ^ hashString(`movimento:${t}`)) >>> 0)
  const media = 1 + input.params.mediaInfluence / 100
  const scandals = r.politicalEvents.filter((e) => e.kind === 'escandalo').length
  const next = { ...s.movement }
  for (const side of ['A', 'B'] as Side[]) {
    const crises = r.climateEvents.filter((e) => e.block === side).length
    const drift =
      ((50 - r.A.approval) / 10 + 1.5 * scandals + crises + (rng() - 0.5) * 2) * media * 0.6 - 0.08 * (next[side] - 8)
    next[side] = Math.min(80, Math.max(0, next[side] + drift))
  }
  s.movement = next
  const mine = sideOf(input.params.partition, s.setup.uf)
  if (s.separatistStance >= 2 && next[mine] >= 50) {
    const type: SeparationType = r.A.approval < 40 ? 'intermediaria' : 'conflituosa'
    s.separation = { year: t + 2, type }
    s.log.push({
      year: t,
      kind: 'info',
      title: 'Caminho hipotético: a separação avança',
      text: `Com ${Math.round(next[mine])}% de apoio na sua região e o seu engajamento, a crise federativa leva a uma separação ${
        type === 'intermediaria' ? 'negociada às pressas' : 'conflituosa'
      } a partir de ${2023 + t + 2}. Na ordem constitucional real, isso seria uma ruptura: a federação é indissolúvel.`,
    })
  }
}

/**
 * Em eleições proporcionais (vereador e deputados), a legenda e os recursos do
 * partido pesam muito: quem briga com o partido perde espaço na campanha.
 */
export function loyaltyBonus(state: CareerState, office: Office | null): number {
  if (!office || !['vereador', 'deputado-estadual', 'deputado-federal'].includes(office)) return 0
  return (state.partyLoyalty - 50) * 0.12
}

function electionWon(state: CareerState, seed: number, t: number) {
  const rng = mulberry32((seed ^ hashString(`eleicao-jogador:${t}:${state.office}`)) >>> 0)
  const p = 1 / (1 + Math.exp(-(state.approval + loyaltyBonus(state, state.office) + campaignBonus(state, t) - 48) / 6))
  return rng() < p
}

/**
 * Escolha do próximo passo após o fim de um mandato: o jogador fica sem
 * mandato até a próxima eleição do cargo escolhido.
 */
export function chooseNextOffice(state: CareerState, office: Office | null): CareerState {
  const s: CareerState = { ...state, needsCareerChoice: false, resolved: [] }
  if (!office || office === 'ministro-stf') {
    s.candidacy = null
    s.nextElection = null
    s.log = [...s.log, { year: s.t, kind: 'cargo', title: 'Fora de cargo eletivo', text: 'Você acompanha a política como cidadão.' }]
    return s
  }
  // A eleição deste ano já ocorreu: a candidatura vale para a próxima do tipo.
  const when = nextElectionOfType(office, s.t + 1)
  s.candidacy = office
  s.nextElection = when
  s.log = [
    ...s.log,
    {
      year: s.t,
      kind: 'cargo',
      title: `Pré-candidatura a ${lowerFirst(ROLES[office].title)}`,
      text: `A próxima eleição para o cargo é em ${2023 + (when ?? s.t)}. Até lá, você fica sem mandato.`,
    },
  ]
  return s
}

/**
 * Pode disputar o cargo no ano t? Chefes do Executivo que cumpriram dois
 * mandatos seguidos precisam ficar um mandato inteiro fora antes de voltar.
 */
export function canRunFor(state: CareerState, office: Office, t: number): boolean {
  if (state.ineligibleUntil !== null && t < state.ineligibleUntil) return false
  const limited = state.termLimited.filter((x) => x.office === office)
  if (limited.length === 0) return true
  const last = limited[limited.length - 1].year
  return t - last >= (ROLES[office].termYears ?? 4)
}

function runCandidacy(state: CareerState, office: Office, seed: number): CareerState {
  const s: CareerState = { ...state, log: [...state.log] }
  if (!canRunFor(s, office, s.t)) {
    s.log.push({
      year: s.t,
      kind: 'eleicao',
      title: 'Candidatura impugnada',
      text:
        s.ineligibleUntil !== null && s.t < s.ineligibleUntil
          ? `Você está inelegível até ${2023 + s.ineligibleUntil} pela Lei da Ficha Limpa (LC 135/2010).`
          : 'Ainda não se passou um mandato inteiro desde os seus dois mandatos seguidos neste cargo (art. 14, § 5º).',
      good: false,
    })
    s.candidacy = null
    s.office = null
    s.needsCareerChoice = true
    return s
  }
  const rng = mulberry32((seed ^ hashString(`candidatura:${s.t}:${office}`)) >>> 0)
  const p = 1 / (1 + Math.exp(-(s.approval + loyaltyBonus(s, office) + campaignBonus(s, s.t) - 50) / 7))
  const won = rng() < p
  s.log.push({
    year: s.t,
    kind: 'eleicao',
    title: won ? `Eleito(a) ${lowerFirst(ROLES[office].title)}` : `Derrota na disputa para ${lowerFirst(ROLES[office].title)}`,
    text: won ? `Você assume o novo cargo. ${ROLES[office].reelection}` : 'Você fica sem mandato até a próxima oportunidade.',
    good: won,
  })
  s.candidacy = null
  if (won) {
    s.office = office
    s.setup = { ...s.setup, office }
    s.nextElection = (ROLES[office].termYears ?? 4) + s.t
    s.consecutiveTerms = 1
    s.approval = 55
  } else {
    s.office = null
    s.nextElection = null
    s.needsCareerChoice = true
  }
  return s
}

// Pontuação ------------------------------------------------------------------------------------

export interface CareerScore {
  territory: number
  yearsInOffice: number
  laws: number
  quiz: number
  objectives: number
  objectivesMet: number
  total: number
}

export function careerScore(state: CareerState, input: SimInput, results: YearResult[], mission: Mission): CareerScore {
  const last = Math.min(state.t, HORIZON)
  const terr = territoryStats(state, input, results, last)
  const territory = Math.round(Math.max(0, 1000 * (1 + terr.vs / 100)))
  const yearsInOffice = state.yearsInOffice * 10
  const laws = state.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei').length * 40
  const quiz = QUIZZES.filter((q) => state.quiz[q.id] === q.correct).length * QUIZ_POINTS
  const objectivesMet = last >= HORIZON ? mission.objectives.filter((o) => o.evaluate(results, HORIZON) === 'ok').length : 0
  const objectives = objectivesMet * 100
  return {
    territory,
    yearsInOffice,
    laws,
    quiz,
    objectives,
    objectivesMet,
    total: territory + yearsInOffice + laws + quiz + objectives,
  }
}

export function cardTitle(cardId: string, optionId: string) {
  return `${findCard(cardId)?.title}: ${findOption(cardId, optionId)?.label}`
}
