// Casas legislativas: cadeiras pelas regras constitucionais, partidos
// fictícios e votação partido a partido.
//
// Os partidos são fictícios de propósito, para manter a neutralidade: cada
// um é descrito por posições em eixos (papel do Estado na economia,
// prioridade ambiental, descentralização) e por traços de comportamento
// (pragmatismo e disciplina). Nenhum corresponde a um partido real.

import { mulberry32 } from './events'
import { ALL_UFS, type UF } from './states'

export type Spectrum =
  | 'extrema-esquerda'
  | 'esquerda'
  | 'centro-esquerda'
  | 'centro'
  | 'centro-direita'
  | 'direita'
  | 'extrema-direita'

export const SPECTRUM_ORDER: Spectrum[] = [
  'extrema-esquerda',
  'esquerda',
  'centro-esquerda',
  'centro',
  'centro-direita',
  'direita',
  'extrema-direita',
]

export const SPECTRUM_LABELS: Record<Spectrum, string> = {
  'extrema-esquerda': 'Extrema esquerda',
  esquerda: 'Esquerda',
  'centro-esquerda': 'Centro-esquerda',
  centro: 'Centro',
  'centro-direita': 'Centro-direita',
  direita: 'Direita',
  'extrema-direita': 'Extrema-direita',
}

export interface Party {
  id: string
  name: string
  spectrum: Spectrum
  /** Perfil em uma frase */
  profile: string
  /** −1 = mais Estado na economia, +1 = mais mercado */
  econ: number
  /** −1 = prioriza produção, +1 = prioriza proteção ambiental */
  env: number
  /** 0 a 1: disposição a apoiar o governo em troca de cargos e emendas */
  pragmatism: number
  /** 0 a 1: fração da bancada que segue a orientação do partido */
  discipline: number
  /** 0 a 1: compromisso com as regras democráticas (eleições, separação de poderes, cláusulas pétreas) */
  democracy: number
  /** Participação nacional de cadeiras */
  share: number
}

/**
 * Partidos fictícios, um ou mais por posição do espectro. Os extremos são
 * definidos pelo mesmo critério: defender a ruptura da ordem democrática
 * (pela via revolucionária ou pela intervenção militar).
 */
export const PARTIES: Party[] = [
  {
    id: 'FRP',
    name: 'Frente Revolucionária Popular',
    spectrum: 'extrema-esquerda',
    profile: 'Revolucionária e socialista: defende superar o capitalismo pela ruptura, inclusive com a democracia representativa.',
    econ: -1,
    env: 0.4,
    pragmatism: 0.05,
    discipline: 0.95,
    democracy: 0.2,
    share: 0.02,
  },
  {
    id: 'MTI',
    name: 'Movimento Trabalho e Igualdade',
    spectrum: 'esquerda',
    profile: 'Sindicalista e trabalhista: direitos trabalhistas, Estado forte na economia e programas sociais, dentro das regras democráticas.',
    econ: -0.65,
    env: 0.3,
    pragmatism: 0.25,
    discipline: 0.85,
    democracy: 0.9,
    share: 0.17,
  },
  {
    id: 'RVS',
    name: 'Rede Verde e Sustentabilidade',
    spectrum: 'centro-esquerda',
    profile: 'Progressista e ambientalista: proteção ambiental, direitos civis e transparência.',
    econ: -0.3,
    env: 0.9,
    pragmatism: 0.2,
    discipline: 0.8,
    democracy: 0.95,
    share: 0.06,
  },
  {
    id: 'APS',
    name: 'Aliança Progressista Social',
    spectrum: 'centro-esquerda',
    profile: 'Social-democrata: economia de mercado com Estado de bem-estar e políticas redistributivas.',
    econ: -0.25,
    env: 0.3,
    pragmatism: 0.5,
    discipline: 0.6,
    democracy: 0.95,
    share: 0.08,
  },
  {
    id: 'UDC',
    name: 'União do Centro',
    spectrum: 'centro',
    profile: 'Centro pragmático: apoia governos de diferentes linhas em troca de cargos e emendas.',
    econ: 0.1,
    env: -0.1,
    pragmatism: 0.9,
    discipline: 0.45,
    democracy: 0.85,
    share: 0.2,
  },
  {
    id: 'PMF',
    name: 'Partido Municipalista Federativo',
    spectrum: 'centro-direita',
    profile: 'Municipalista e pragmático: descentralização de recursos para estados e municípios.',
    econ: 0.25,
    env: -0.2,
    pragmatism: 0.8,
    discipline: 0.5,
    democracy: 0.85,
    share: 0.15,
  },
  {
    id: 'ALR',
    name: 'Aliança Liberal Reformista',
    spectrum: 'centro-direita',
    profile: 'Liberal: menos impostos e regulação, reformas e privatizações, responsabilidade fiscal.',
    econ: 0.75,
    env: 0,
    pragmatism: 0.3,
    discipline: 0.75,
    democracy: 0.9,
    share: 0.1,
  },
  {
    id: 'MCB',
    name: 'Movimento Conservador Brasileiro',
    spectrum: 'direita',
    profile: 'Conservador: valores tradicionais, segurança pública e livre mercado, dentro das regras democráticas.',
    econ: 0.55,
    env: -0.4,
    pragmatism: 0.3,
    discipline: 0.8,
    democracy: 0.9,
    share: 0.19,
  },
  {
    id: 'OPN',
    name: 'Ordem e Pátria Nacional',
    spectrum: 'extrema-direita',
    profile: 'Autoritária: defende intervenção militar e a ruptura da ordem democrática.',
    econ: 0.45,
    env: -0.7,
    pragmatism: 0.05,
    discipline: 0.95,
    democracy: 0.2,
    share: 0.03,
  },
]

// Paródia do Congresso eleito em 2026 -------------------------------------------

export type PartySystem = 'ficticio' | 'parodia-2026'

export const PARTY_SYSTEM_LABELS: Record<PartySystem, string> = {
  ficticio: 'Partidos fictícios',
  'parodia-2026': 'Paródia do Congresso eleito em 2026',
}

/**
 * Paródia dos partidos e federações que elegeram representantes em 2026.
 * Nomes e descrições são humorísticos; as cadeiras seguem o resultado
 * oficial. A posição no espectro é aproximada, inspirada em classificações da
 * ciência política, e é sempre discutível. Partidos dos extremos não
 * elegeram representantes em 2026.
 */
const parody = (
  id: string,
  name: string,
  spectrum: Spectrum,
  profile: string,
  econ: number,
  env: number,
  pragmatism: number,
  discipline: number,
): Party => ({ id, name, spectrum, profile, econ, env, pragmatism, discipline, democracy: 0.88, share: 0 })

const PARODY_LIST: Party[] = [
  parody('SOLR', 'Federação Sol e Chuva', 'esquerda', 'Paródia de PSOL e Rede: socialismo democrático com guarda-chuva ambiental; vota em bloco e negocia pouco.', -0.75, 0.9, 0.1, 0.9),
  parody('FBE', 'Federação Brasil da Espera', 'esquerda', 'Paródia de PT, PCdoB e PV: base do governo reeleito em 2026; a esperança agora espera mais quatro anos.', -0.6, 0.4, 0.3, 0.85),
  parody('PDTr', 'Partido do Trabalhismo de Raiz', 'esquerda', 'Paródia do PDT: trabalhista de raiz, sempre lembrando quem fundou o quê.', -0.5, 0.2, 0.5, 0.6),
  parody('PSBc', 'Partido Socialista Bem-Comportado', 'centro-esquerda', 'Paródia do PSB: socialista no nome, moderado na prática.', -0.3, 0.4, 0.5, 0.65),
  parody('MDBs', 'Movimento dos Bastidores', 'centro', 'Paródia do MDB: veterano das coalizões, raramente fica fora de um governo.', 0.15, 0, 0.85, 0.5),
  parody('PSDi', 'Partido Sempre Disponível', 'centro', 'Paródia do PSD: conversa com todos os lados e cobra a conta depois.', 0.2, -0.1, 0.9, 0.5),
  parody('PODt', 'Podemos Talvez', 'centro', 'Paródia do Podemos: pode, desde que o acordo seja bom.', 0.3, -0.1, 0.7, 0.5),
  parody('FRS', 'Federação Renovação Solidária', 'centro', 'Paródia de PRD e Solidariedade: renova a sigla, mantém o pragmatismo.', 0.1, 0, 0.8, 0.5),
  parody('AVA', 'Avante e Adiante', 'centro', 'Paródia do Avante: segue em frente, para onde a maioria for.', 0.1, 0, 0.85, 0.45),
  parody('NTC', 'Federação Ninho Tucano', 'centro-direita', 'Paródia de PSDB e Cidadania: já governou o país; hoje cabe num micro-ônibus.', 0.35, 0.2, 0.5, 0.55),
  parody('FUP', 'Federação União Proveitosa', 'centro-direita', 'Paródia de União Brasil e PP: o centrão em formato família, com orçamento próprio.', 0.4, -0.3, 0.85, 0.5),
  parody('REP', 'Republiqueiros', 'centro-direita', 'Paródia do Republicanos: pauta de costumes e boa relação com governos de vários matizes.', 0.4, -0.3, 0.7, 0.7),
  parody('PLT', 'Partido Lotado', 'direita', 'Paródia do PL: maior bancada eleita por um só partido desde 1990; tão cheio que falta cadeira. Lidera a oposição.', 0.6, -0.5, 0.35, 0.8),
  parody('NOVs', 'Novíssimo', 'direita', 'Paródia do Novo: liberal convicto, vota contra quase todo gasto, inclusive o próprio fundo.', 0.9, -0.1, 0.15, 0.9),
  parody('MSD', 'Missão Dada', 'direita', 'Paródia do Missão: estreante digital, uma cadeira e muitos seguidores.', 0.8, -0.2, 0.2, 0.8),
  parody('SEM', 'Sem Partido', 'centro', 'Senador sem filiação partidária.', 0, 0, 0.5, 0),
]

/** Resultado de 2026 (TSE; Agência Senado): deputados por legenda e senadores a partir de 2027. */
export const PARODY_SEATS: { camara: Record<string, number>; senado: Record<string, number> } = {
  camara: {
    PLT: 121, FBE: 88, FUP: 87, PSDi: 43, REP: 41, MDBs: 36, PODt: 27, SOLR: 15, PSBc: 15, NTC: 11, NOVs: 10, FRS: 7, PDTr: 6, AVA: 5, MSD: 1,
  },
  senado: {
    PLT: 29, FBE: 10, FUP: 11, MDBs: 8, REP: 5, PSDi: 4, PSBc: 4, NOVs: 3, NTC: 2, PODt: 2, SOLR: 1, PDTr: 1, SEM: 1,
  },
}

export const PARODY_PARTIES: Party[] = PARODY_LIST.map((p) => ({ ...p, share: (PARODY_SEATS.camara[p.id] ?? 0) / 513 }))

export function partiesOf(system: PartySystem = 'ficticio'): Party[] {
  return system === 'parodia-2026' ? PARODY_PARTIES : PARTIES
}

/** Siglas de versões anteriores do jogo. */
const LEGACY_IDS: Record<string, string> = { PDS: 'APS', PRN: 'RVS', PCN: 'MCB' }

export function findParty(id: string): Party | undefined {
  const key = LEGACY_IDS[id] ?? id
  return PARTIES.find((p) => p.id === key) ?? PARODY_PARTIES.find((p) => p.id === key)
}

// Cadeiras --------------------------------------------------------------------------

/** Bancadas federais em vigor (distribuição definida em 1993, 513 deputados). */
export const FEDERAL_SEATS: Record<UF, number> = {
  RO: 8, AC: 8, AM: 8, RR: 8, PA: 17, AP: 8, TO: 8,
  MA: 18, PI: 10, CE: 22, RN: 8, PB: 12, PE: 25, AL: 9, SE: 8, BA: 39,
  MG: 53, ES: 10, RJ: 46, SP: 70,
  PR: 30, SC: 16, RS: 31,
  MS: 8, MT: 8, GO: 17, DF: 8,
}

export const SENATORS_PER_UF = 3

/**
 * Redistribui as 513 cadeiras pela população (maiores restos), respeitando
 * o mínimo de 8 e o máximo de 70 por UF (CF, art. 45, § 1º).
 */
export function apportionFederalSeats(pop: Record<UF, number>, total = 513, min = 8, max = 70): Record<UF, number> {
  const seats = {} as Record<UF, number>
  const fixed = new Set<UF>()
  let remainingSeats = total
  // Itera fixando quem bate no mínimo ou no máximo.
  for (let iter = 0; iter < 10; iter++) {
    const free = ALL_UFS.filter((u) => !fixed.has(u))
    const freePop = free.reduce((a, u) => a + pop[u], 0)
    let changed = false
    for (const u of free) {
      const quota = (pop[u] / freePop) * remainingSeats
      if (quota < min || quota > max) {
        seats[u] = quota < min ? min : max
        fixed.add(u)
        remainingSeats -= seats[u]
        changed = true
      }
    }
    if (!changed) break
  }
  const free = ALL_UFS.filter((u) => !fixed.has(u))
  const freePop = free.reduce((a, u) => a + pop[u], 0)
  const quotas = free.map((u) => ({ u, q: (pop[u] / freePop) * remainingSeats }))
  let given = 0
  for (const { u, q } of quotas) {
    seats[u] = Math.floor(q)
    given += seats[u]
  }
  quotas.sort((a, b) => (b.q % 1) - (a.q % 1))
  for (let i = 0; i < remainingSeats - given; i++) seats[quotas[i % quotas.length].u] += 1
  return seats
}

/** Deputados estaduais (CF, art. 27). */
export function assemblySeats(federalSeats: number): number {
  return federalSeats <= 12 ? federalSeats * 3 : 36 + (federalSeats - 12)
}

/** Vereadores pela população do município (CF, art. 29, IV, faixas da EC 58/2009). */
export function councilSeats(pop: number): number {
  const limits = [
    15_000, 30_000, 50_000, 80_000, 120_000, 160_000, 300_000, 450_000, 600_000, 750_000, 900_000, 1_050_000,
    1_200_000, 1_350_000, 1_500_000, 1_800_000, 2_400_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000,
    8_000_000,
  ]
  const i = limits.findIndex((l) => pop <= l)
  return 9 + 2 * (i === -1 ? limits.length : i)
}

// Composição ------------------------------------------------------------------------

export interface PartySeats {
  party: Party
  seats: number
}

export interface Chamber {
  id: string
  name: string
  total: number
  parties: PartySeats[]
}

/**
 * Distribui cadeiras entre partidos pelos maiores restos, com variação local
 * reproduzível. Com `exact`, usa a composição informada (ex.: resultado real).
 */
export function composeChamber(
  id: string,
  name: string,
  total: number,
  seed: number,
  system: PartySystem = 'ficticio',
  exact?: Record<string, number>,
): Chamber {
  const list = partiesOf(system)
  if (exact && Object.values(exact).reduce((a, b) => a + b, 0) === total) {
    return {
      id,
      name,
      total,
      parties: Object.entries(exact)
        .map(([pid, seats]) => ({ party: findParty(pid)!, seats }))
        .filter((x) => x.party && x.seats > 0)
        .sort((a, b) => b.seats - a.seats),
    }
  }
  const rng = mulberry32((seed ^ hashString(id)) >>> 0)
  const pool = list.filter((p) => p.share > 0)
  const weights = pool.map((p) => p.share * (0.6 + 0.8 * rng()))
  const sum = weights.reduce((a, b) => a + b, 0)
  const quotas = pool.map((p, i) => ({ party: p, q: (weights[i] / sum) * total }))
  const seats = quotas.map((x) => ({ party: x.party, seats: Math.floor(x.q), r: x.q % 1 }))
  let left = total - seats.reduce((a, b) => a + b.seats, 0)
  for (const s of [...seats].sort((a, b) => b.r - a.r)) {
    if (left <= 0) break
    s.seats += 1
    left -= 1
  }
  return { id, name, total, parties: seats.map(({ party, seats: n }) => ({ party, seats: n })) }
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Coalizão de governo: partido do chefe do Executivo mais aliados. Com
 * ministério político, o governo atrai partidos pragmáticos até ~60% das
 * cadeiras; misto, até ~50%; técnico, só partidos próximos na economia.
 */
export function buildCoalition(chamber: Chamber, headParty: string, cabinet: 'tecnico' | 'misto' | 'politico'): Set<string> {
  const head = findParty(headParty) ?? PARTIES[0]
  const coalition = new Set([head.id])
  const target = cabinet === 'politico' ? 0.6 : cabinet === 'misto' ? 0.5 : 0
  const seatsOf = (id: string) => chamber.parties.find((p) => p.party.id === id)?.seats ?? 0
  let seats = seatsOf(head.id)
  const candidates = chamber.parties
    .map((p) => p.party)
    .filter((p) => p.id !== head.id)
    .sort((a, b) => {
      const score = (p: Party) => p.pragmatism - Math.abs(p.econ - head.econ) / 2
      return score(b) - score(a)
    })
  for (const p of candidates) {
    const close = Math.abs(p.econ - head.econ) < 0.45
    if (cabinet === 'tecnico' ? close : seats / chamber.total < target || close) {
      coalition.add(p.id)
      seats += seatsOf(p.id)
    }
  }
  return coalition
}

// Votação ----------------------------------------------------------------------------

export interface BillPosition {
  /** Posição do projeto no eixo econômico (−1 Estado, +1 mercado) */
  econ: number
  /** Posição ambiental (−1 produção, +1 proteção), opcional */
  env?: number
  /** Popularidade junto ao eleitorado, −1 a 1 */
  popularity: number
  /** Ataca regras democráticas (ex.: cláusulas pétreas) */
  antiDemocratic?: boolean
}

export interface VoteContext {
  /** Partidos da coalizão de governo */
  coalition: Set<string>
  /** Posição do governo: 1 apoia, 0 neutro, −1 contra */
  governmentStance: number
  /** Negociação com partidos pragmáticos (cargos, emendas), 0 a 1 */
  bargaining: number
  /** Proximidade de eleição aumenta o peso da popularidade, 0 a 1 */
  electionPressure: number
  /** Partido do autor, que tende a apoiar */
  authorParty?: string
  /** O projeto reduz recursos políticos (emendas, cargos): partidos pragmáticos resistem */
  pragmaticPenalty?: boolean
  /** O autor é da base do governo? (padrão: o partido do autor está na coalizão) */
  authorInGovernment?: boolean
}

export type VoteReason = 'merito' | 'estrategia' | 'negociacao' | 'governo'

export const VOTE_REASON_LABELS: Record<VoteReason, string> = {
  merito: 'mérito',
  estrategia: 'estratégia',
  negociacao: 'negociação',
  governo: 'alinhamento ao governo',
}

/** Decomposição do apoio de um partido: conteúdo (mérito) e cálculo político. */
export interface SupportBreakdown {
  /** Apoio pelo conteúdo do projeto (posições do partido), 0 a 1 */
  merit: number
  /** Efeito de ser base ou oposição ao governo */
  government: number
  /** Voto estratégico: rivais do autor resistem a dar-lhe uma vitória */
  strategy: number
  /** Cargos e emendas oferecidos */
  bargain: number
  /** Pressão da opinião pública */
  popular: number
  /** O partido é o do autor */
  author: number
  /** O projeto reduz recursos políticos */
  penalty: number
  total: number
  /** O partido é rival político do autor (base x oposição) */
  rival: boolean
}

export interface PartyVote {
  party: Party
  seats: number
  orientation: 'sim' | 'nao' | 'liberada'
  yes: number
  no: number
  absent: number
  /** Probabilidade de apoio estimada para o partido */
  support: number
  /** Apoio só pelo conteúdo */
  merit: number
  reason: VoteReason
}

export interface VoteResult {
  chamber: string
  total: number
  yes: number
  no: number
  absent: number
  present: number
  required: number
  quorumOk: boolean
  passed: boolean
  rule: string
  parties: PartyVote[]
  /** Votos favoráveis esperados só pelo mérito (sem estratégia, governo ou negociação) */
  meritYes: number
  /** Cadeiras de partidos que orientaram contra por estratégia */
  strategicNo: number
}

export type Quorum = 'simples' | 'absoluta' | 'tres-quintos' | 'dois-tercos'

export const QUORUM_LABELS: Record<Quorum, string> = {
  simples: 'maioria dos presentes, com a maioria absoluta presente (art. 47)',
  absoluta: 'maioria absoluta dos membros (art. 69)',
  'tres-quintos': '3/5 dos membros (art. 60, § 2º)',
  'dois-tercos': '2/3 dos membros (art. 86)',
}

export function partySupportBreakdown(party: Party, bill: BillPosition, ctx: VoteContext): SupportBreakdown {
  const econFit = 1 - Math.abs(party.econ - bill.econ) / 2
  const envFit = bill.env === undefined ? econFit : 1 - Math.abs(party.env - bill.env) / 2
  const ideology = (econFit + envFit) / 2
  const inCoalition = ctx.coalition.has(party.id)
  const gov = inCoalition ? 0.2 * ctx.governmentStance : -0.1 * ctx.governmentStance
  const bargain = inCoalition || party.pragmatism > 0.6 ? party.pragmatism * ctx.bargaining * 0.3 : 0
  const popular = 0.1 * bill.popularity * (1 + ctx.electionPressure)
  const author = ctx.authorParty === party.id ? 0.25 : 0
  const penalty = ctx.pragmaticPenalty ? 0.35 * party.pragmatism : 0
  // Propostas contra regras democráticas: só partidos com baixo compromisso democrático as apoiam.
  const democratic = bill.antiDemocratic ? 0.6 * (1 - party.democracy) - 0.7 * party.democracy : 0
  const merit = Math.min(1, Math.max(0, ideology - 0.15 + democratic))
  // Estratégia: base e oposição evitam dar vitórias ao outro lado, sobretudo perto da eleição.
  // Partidos pragmáticos se importam menos com quem leva o crédito.
  const authorGov = ctx.authorInGovernment ?? (ctx.authorParty ? ctx.coalition.has(ctx.authorParty) : undefined)
  const rival = authorGov !== undefined && ctx.authorParty !== party.id && inCoalition !== authorGov
  const strategy = rival ? -(0.15 + 0.2 * ctx.electionPressure) * (1 - 0.6 * party.pragmatism) : 0
  const total = Math.min(0.98, Math.max(0.02, merit - 0.15 + gov + strategy + bargain + popular + author - penalty))
  return { merit, government: gov, strategy, bargain, popular, author, penalty, total, rival }
}

export function partySupport(party: Party, bill: BillPosition, ctx: VoteContext): number {
  return partySupportBreakdown(party, bill, ctx).total
}

export function orientationOf(support: number): 'sim' | 'nao' | 'liberada' {
  return support > 0.6 ? 'sim' : support < 0.4 ? 'nao' : 'liberada'
}

/** Por que o partido orientou assim: conteúdo, estratégia, negociação ou alinhamento ao governo. */
export function voteReason(b: SupportBreakdown): VoteReason {
  const o = orientationOf(b.total)
  if (o === 'nao' && b.merit >= 0.55) return b.strategy < 0 ? 'estrategia' : 'governo'
  if (o === 'sim' && b.merit < 0.45) return b.bargain >= 0.1 ? 'negociacao' : 'governo'
  return 'merito'
}

export function vote(chamber: Chamber, bill: BillPosition, ctx: VoteContext, quorum: Quorum, seed: number): VoteResult {
  const rng = mulberry32(seed >>> 0)
  const parties: PartyVote[] = chamber.parties.map(({ party, seats }) => {
    const b = partySupportBreakdown(party, bill, ctx)
    const support = b.total
    const orientation = orientationOf(support)
    let yes = 0
    let no = 0
    let absent = 0
    for (let i = 0; i < seats; i++) {
      if (rng() < 0.05) {
        absent++
        continue
      }
      const follows = orientation !== 'liberada' && rng() < party.discipline
      const saysYes = follows ? orientation === 'sim' : rng() < support
      if (saysYes) yes++
      else no++
    }
    return { party, seats, orientation, yes, no, absent, support, merit: b.merit, reason: voteReason(b) }
  })
  const yes = parties.reduce((a, p) => a + p.yes, 0)
  const no = parties.reduce((a, p) => a + p.no, 0)
  const absent = parties.reduce((a, p) => a + p.absent, 0)
  const present = yes + no
  const absMajority = Math.floor(chamber.total / 2) + 1
  const quorumOk = present >= absMajority
  const required =
    quorum === 'simples'
      ? Math.floor(present / 2) + 1
      : quorum === 'absoluta'
        ? absMajority
        : quorum === 'tres-quintos'
          ? Math.ceil((chamber.total * 3) / 5)
          : Math.ceil((chamber.total * 2) / 3)
  return {
    chamber: chamber.name,
    total: chamber.total,
    yes,
    no,
    absent,
    present,
    required,
    quorumOk,
    passed: quorumOk && yes >= required,
    rule: QUORUM_LABELS[quorum],
    parties,
    meritYes: Math.round(parties.reduce((a, p) => a + p.seats * 0.95 * p.merit, 0)),
    strategicNo: parties.filter((p) => p.reason === 'estrategia').reduce((a, p) => a + p.seats, 0),
  }
}
