import { lowerFirst } from '../lib/format'
// Processo legislativo passo a passo, nos três níveis da federação.
//
// Federal (bicameral): protocolo → CCJ → relator → plenário da casa
// iniciadora (dois turnos se PEC) → casa revisora (aprova, emenda ou
// rejeita) → retorno à iniciadora se emendado → sanção ou veto (exceto PEC,
// promulgada pelas Mesas) → apreciação do veto → promulgação → controle de
// constitucionalidade no STF.
// Estadual e municipal (unicameral): mesmo fluxo sem casa revisora, com
// governador/prefeito na sanção e controle pelo Tribunal de Justiça ou STF.
//
// O motor é determinístico: com a mesma semente e as mesmas escolhas, o
// resultado é sempre igual. Ele pausa (pending) quando o jogador decide.

import { findBill, JABUTIS, NORM_LABELS, NORM_RANK, type BillTemplate, type BillVariant, type Level, type NormType, type Office, type Vice } from './bills'
import { legalRef } from './constitution'
import type { DecisionEffect, Side } from './decisions'
import { mulberry32 } from './events'
import type { Cabinet } from './institutions'
import {
  buildCoalition,
  findParty,
  hashString,
  orientationOf,
  partySupport,
  partySupportBreakdown,
  vote,
  voteReason,
  type BillPosition,
  type Chamber,
  type Quorum,
  type VoteContext,
  type VoteResult,
} from './legislature'

export type Stage =
  | 'protocolo'
  | 'ccj'
  | 'relator'
  | 'pauta'
  | 'plenario'
  | 'revisora'
  | 'retorno'
  | 'sancao'
  | 'veto'
  | 'promulgacao'
  | 'controle'
  | 'fim'

export const STAGE_LABELS: Record<Stage, string> = {
  protocolo: 'Protocolo',
  ccj: 'Constituição e Justiça',
  relator: 'Comissão e relator',
  pauta: 'Pauta do plenário',
  plenario: 'Plenário',
  revisora: 'Casa revisora',
  retorno: 'Retorno à casa iniciadora',
  sancao: 'Sanção ou veto',
  veto: 'Apreciação do veto',
  promulgacao: 'Promulgação',
  controle: 'Controle de constitucionalidade',
  fim: 'Fim',
}

export interface LegislativeContext {
  level: Level
  seed: number
  /** Ano da simulação em que o projeto tramita */
  t: number
  author: Office
  authorParty: string
  /** Casas: federal [Câmara, Senado]; estadual e municipal [casa única] */
  chambers: Chamber[]
  /** Casa iniciadora (0 = Câmara; 1 = Senado, quando o autor é senador) */
  initiatingHouse: number
  executiveParty: string
  executiveCabinet: Cabinet
  executiveTitle: string
  courtName: string
  /** Quem o jogador controla: decide nas pausas correspondentes */
  player: { author: boolean; executive: boolean; court: boolean }
  /** Proximidade de eleição, 0 a 1 */
  electionPressure: number
}

/**
 * Preço dos votos negociados: com o governo ou o autor impopular, partidos
 * pragmáticos (o "Centrão") cobram mais por apoio.
 */
export function votePrice(approval: number): number {
  return approval < 30 ? 2 : approval < 40 ? 1.5 : 1
}

export function bargainingCost(bargaining: number, urgency: boolean, price = 1): number {
  return Math.round(bargaining * 4 * price) + (urgency ? 2 : 0)
}

export interface BillDraft {
  /** Multiplicador do preço da negociação no momento da proposta */
  price?: number
  templateId: string
  variantId?: string
  norm: NormType
  urgency: boolean
  /** Negociação com partidos (cargos, emendas), 0 a 1: custa capital político */
  bargaining: number
}

export interface LogEntry {
  stage: Stage
  title: string
  text: string
  outcome: 'ok' | 'fail' | 'info' | 'warn'
  refs?: string[]
  vote?: VoteResult
  court?: { yes: number; no: number; label: string }
}

export interface PendingChoice {
  kind: 'relator' | 'emendas-revisora' | 'sancao' | 'stf'
  title: string
  text: string
  options: { id: string; label: string; description: string; cost?: number }[]
}

export type BillStatus = 'tramitando' | 'arquivado' | 'lei' | 'inconstitucional'

export interface BillState {
  draft: BillDraft
  stage: Stage
  status: BillStatus
  log: LogEntry[]
  provisions: string[]
  removed: string[]
  jabuti: (typeof JABUTIS)[number] | null
  /** Partes vetadas (sem derrubada) */
  vetoed: 'nenhum' | 'parcial' | 'total'
  /** Fração dos efeitos que sobrou após desidratação e vetos */
  strength: number
  /** Vícios ainda não declarados */
  hiddenVices: Vice[]
  /** Turno atual (PEC tem dois) */
  turn: number
  /** Casa em que o projeto está */
  house: number
  /** O texto foi emendado pela casa revisora */
  amendedByReviser: boolean
  pending: PendingChoice | null
  capitalSpent: number
  /** Medida provisória: efeitos imediatos até a conversão */
  mpInForce: boolean
  /** Ano em que a lei foi derrubada no controle de constitucionalidade */
  struckYear?: number
  counter: number
}

export function getTemplate(state: BillState): BillTemplate {
  const t = findBill(state.draft.templateId)
  if (!t) throw new Error(`Projeto desconhecido: ${state.draft.templateId}`)
  return t
}

export function getVariant(state: BillState): BillVariant | undefined {
  return getTemplate(state).variants?.find((v) => v.id === state.draft.variantId)
}

function position(state: BillState): BillPosition {
  const t = getTemplate(state)
  return { ...t.position, ...getVariant(state)?.position }
}

function rngFor(ctx: LegislativeContext, state: BillState, label: string) {
  state.counter += 1
  return mulberry32((ctx.seed ^ hashString(`${state.draft.templateId}:${ctx.t}:${label}:${state.counter}`)) >>> 0)
}

function quorumFor(norm: NormType): Quorum {
  return norm === 'pec' ? 'tres-quintos' : norm === 'lei-complementar' ? 'absoluta' : 'simples'
}

function voteContext(ctx: LegislativeContext, state: BillState, chamber: Chamber, extraBargain = 0): VoteContext {
  const t = getTemplate(state)
  const coalition = buildCoalition(chamber, ctx.executiveParty, ctx.executiveCabinet)
  const exec = findParty(ctx.executiveParty)
  const govSupport = exec
    ? partySupport(exec, position(state), { coalition, governmentStance: 0, bargaining: 0, electionPressure: ctx.electionPressure })
    : 0.5
  return {
    coalition,
    governmentStance: govSupport > 0.6 ? 1 : govSupport < 0.4 ? -1 : 0,
    bargaining: Math.min(1, state.draft.bargaining + extraBargain + (state.jabuti ? 0.25 : 0)),
    electionPressure: ctx.electionPressure,
    authorParty: ctx.authorParty,
    pragmaticPenalty: t.hurtsPragmatic,
  }
}

function log(state: BillState, entry: LogEntry) {
  state.log.push(entry)
}

/** Explica quando o resultado de uma votação foi decidido por estratégia, e não pelo conteúdo. */
export function strategyNote(res: VoteResult): string {
  const strategic = res.parties.filter((p) => p.reason === 'estrategia')
  const names = strategic.map((p) => p.party.id).join(', ')
  if (!res.passed && res.meritYes >= res.required && strategic.length > 0)
    return ` Pelo conteúdo, o projeto teria cerca de ${res.meritYes} votos, o suficiente. Caiu porque ${names} (${res.strategicNo} cadeiras) orientaram contra por estratégia: concordam com boa parte da proposta, mas não querem dar uma vitória ao lado do autor.`
  if (strategic.length > 0)
    return ` ${names} (${res.strategicNo} cadeiras) orientaram contra por estratégia, embora concordem com boa parte do conteúdo.`
  const bought = res.parties.filter((p) => p.reason === 'negociacao')
  if (res.passed && bought.length > 0)
    return ` ${bought.map((p) => p.party.id).join(', ')} votaram a favor mais por negociação (cargos e emendas) do que pelo conteúdo.`
  return ''
}

/** Como um partido orientaria a votação de um projeto, e por quê. */
export function previewStance(ctx: LegislativeContext, draft: BillDraft, partyId: string) {
  const fake = { draft, jabuti: null } as unknown as BillState
  const chamber = ctx.chambers[ctx.initiatingHouse]
  const vc = voteContext(ctx, fake, chamber)
  const party = findParty(partyId)
  if (!party) return null
  const b = partySupportBreakdown(party, position(fake), vc)
  return {
    orientation: orientationOf(b.total),
    reason: voteReason(b),
    breakdown: b,
    authorInGovernment: vc.coalition.has(ctx.authorParty),
    partyInGovernment: vc.coalition.has(party.id),
    governmentStance: vc.governmentStance,
  }
}

/** Inicia a tramitação. */
export function startBill(ctx: LegislativeContext, draft: BillDraft): BillState {
  const template = findBill(draft.templateId)
  if (!template) throw new Error(`Projeto desconhecido: ${draft.templateId}`)
  const variant = template.variants?.find((v) => v.id === draft.variantId)
  const state: BillState = {
    draft,
    stage: 'protocolo',
    status: 'tramitando',
    log: [],
    provisions: [...template.provisions],
    removed: [],
    jabuti: null,
    vetoed: 'nenhum',
    strength: variant?.strength ?? 1,
    hiddenVices: [],
    turn: 1,
    house: ctx.initiatingHouse,
    amendedByReviser: false,
    pending: null,
    capitalSpent: bargainingCost(draft.bargaining, draft.urgency, draft.price),
    mpInForce: draft.norm === 'medida-provisoria',
    counter: 0,
  }
  return runUntilPause(ctx, state)
}

/** Aplica a escolha do jogador na pausa atual e continua. */
export function chooseBill(ctx: LegislativeContext, prev: BillState, optionId: string): BillState {
  const state: BillState = structuredClone(prev)
  const pending = state.pending
  if (!pending) return state
  state.pending = null
  const opt = pending.options.find((o) => o.id === optionId)
  state.capitalSpent += opt?.cost ?? 0
  switch (pending.kind) {
    case 'relator':
      applyRelatorChoice(ctx, state, optionId)
      break
    case 'emendas-revisora':
      applyReviserChoice(ctx, state, optionId)
      break
    case 'sancao':
      applySanction(ctx, state, optionId)
      break
    case 'stf':
      applyCourt(ctx, state, optionId)
      break
  }
  return runUntilPause(ctx, state)
}

function runUntilPause(ctx: LegislativeContext, state: BillState): BillState {
  let guard = 0
  while (!state.pending && state.stage !== 'fim' && guard++ < 30) step(ctx, state)
  return state
}

function step(ctx: LegislativeContext, state: BillState) {
  switch (state.stage) {
    case 'protocolo':
      return protocol(ctx, state)
    case 'ccj':
      return ccj(ctx, state)
    case 'relator':
      return relator(ctx, state)
    case 'pauta':
      return agenda(ctx, state)
    case 'plenario':
      return plenary(ctx, state)
    case 'revisora':
      return reviser(ctx, state)
    case 'retorno':
      return backToInitiating(ctx, state)
    case 'sancao':
      return sanction(ctx, state)
    case 'veto':
      return vetoSession(ctx, state)
    case 'promulgacao':
      return promulgation(ctx, state)
    case 'controle':
      return judicialReview(ctx, state)
  }
}

// Etapas -----------------------------------------------------------------------------

function protocol(ctx: LegislativeContext, state: BillState) {
  const t = getTemplate(state)
  const variant = getVariant(state)
  const vices: Vice[] = [...(t.vices ?? []), ...(variant?.vices ?? [])]
  const house = ctx.chambers[state.house]

  if (t.initiative !== 'qualquer' && !t.initiative.includes(ctx.author)) {
    vices.push({
      ref: t.initiativeRef ?? 'art61p1',
      kind: 'iniciativa',
      text: `Só ${t.initiative.map(officeName).join(' ou ')} pode propor este tema.`,
    })
  }
  if (state.draft.norm === 'medida-provisoria') {
    if (ctx.author !== 'presidente') {
      log(state, {
        stage: 'protocolo',
        title: 'Medida provisória não admitida',
        text: 'Só o presidente da República pode editar medidas provisórias.',
        outcome: 'fail',
        refs: ['art62'],
      })
      return finish(state, 'arquivado')
    }
    if (NORM_RANK[t.requiredNorm] > 1) {
      vices.push({ ref: 'art62', kind: 'forma', text: 'Medida provisória não pode tratar de tema reservado a lei complementar ou à Constituição.' })
    }
  } else if (NORM_RANK[state.draft.norm] < NORM_RANK[t.requiredNorm]) {
    vices.push({
      ref: t.requiredNorm === 'pec' ? 'art60' : 'art69',
      kind: 'forma',
      text: `O tema exige ${lowerFirst(NORM_LABELS[t.requiredNorm])}, mas foi apresentado como ${lowerFirst(NORM_LABELS[state.draft.norm])}.`,
    })
  }
  state.hiddenVices = vices

  const mp = state.draft.norm === 'medida-provisoria'
  log(state, {
    stage: 'protocolo',
    title: mp ? 'Medida provisória publicada' : `${NORM_LABELS[state.draft.norm]} protocolado na ${house.name}`,
    text: mp
      ? 'A MP tem força de lei desde a publicação e vale por 60 dias, prorrogáveis por mais 60. O Congresso precisa convertê-la em lei; uma comissão mista de deputados e senadores dá o primeiro parecer.'
      : `${officeName(ctx.author)} (${ctx.authorParty}) apresenta “${t.title}”. ${
          state.draft.urgency
            ? 'Com requerimento de urgência aprovado pelos líderes, o projeto vai direto ao plenário com relator designado ali.'
            : 'O projeto é distribuído às comissões temáticas e à de Constituição e Justiça.'
        }`,
    outcome: 'info',
    refs: mp ? ['art62'] : ['art61', 'art59'],
  })
  state.stage = 'ccj'
}

function ccj(ctx: LegislativeContext, state: BillState) {
  const rng = rngFor(ctx, state, 'ccj')
  const detectProb: Record<Vice['kind'], number> = {
    'clausula-petrea': 1,
    iniciativa: 0.75,
    forma: 0.7,
    competencia: 0.8,
    material: 0.45,
  }
  for (const v of state.hiddenVices) {
    if (rng() < detectProb[v.kind]) {
      log(state, {
        stage: 'ccj',
        title: 'CCJ declara o projeto inadmissível',
        text: `${v.text} ${legalRef(v.ref)?.summary ?? ''}`,
        outcome: 'fail',
        refs: [v.ref],
      })
      return finish(state, 'arquivado')
    }
  }
  log(state, {
    stage: 'ccj',
    title: 'Admissibilidade aprovada',
    text:
      state.hiddenVices.length > 0
        ? 'A comissão não apontou problemas constitucionais. Isso não impede que o tribunal os reconheça depois, se a lei for questionada.'
        : 'A comissão considerou o projeto compatível com a Constituição e com a técnica legislativa.',
    outcome: state.hiddenVices.length > 0 ? 'warn' : 'ok',
    refs: ['art102'],
  })
  state.stage = 'relator'
}

function relator(ctx: LegislativeContext, state: BillState) {
  const rng = rngFor(ctx, state, 'relator')
  const t = getTemplate(state)
  const chamber = ctx.chambers[state.house]
  const pick = rng() * chamber.total
  let acc = 0
  const relatorParty =
    chamber.parties.find((p) => {
      acc += p.seats
      return pick < acc
    })?.party ?? chamber.parties[0].party
  const support = partySupport(relatorParty, position(state), voteContext(ctx, state, chamber))
  const changes: string[] = []

  if (support < 0.45 && state.provisions.length > 1 && rng() < 0.7) {
    const idx = Math.floor(rng() * state.provisions.length)
    const [removed] = state.provisions.splice(idx, 1)
    state.removed.push(removed)
    state.strength *= 0.6
    changes.push(`retirou “${removed}” (texto desidratado)`)
  }
  const jabutiProb = t.jabutiRisk * relatorParty.pragmatism * (state.draft.urgency ? 0.6 : 1)
  if (rng() < jabutiProb) {
    state.jabuti = JABUTIS[Math.floor(rng() * JABUTIS.length)]
    changes.push(`incluiu um “jabuti”: ${state.jabuti.text}`)
  }

  const where = state.draft.norm === 'pec' ? 'comissão especial' : state.draft.urgency ? 'plenário' : 'comissão de mérito'
  if (changes.length === 0) {
    log(state, {
      stage: 'relator',
      title: `Relator (${relatorParty.id}) apresenta parecer favorável`,
      text: `Na ${where}, o relator manteve o texto original.`,
      outcome: 'ok',
    })
    state.stage = 'pauta'
    return
  }
  log(state, {
    stage: 'relator',
    title: `Relator (${relatorParty.id}) apresenta substitutivo`,
    text: `Na ${where}, o relator ${changes.join(' e ')}. Emendas sem relação com o tema são conhecidas como “jabutis” ou contrabando legislativo.`,
    outcome: 'warn',
    refs: state.draft.norm === 'medida-provisoria' ? ['adi5127'] : undefined,
  })
  if (ctx.player.author) {
    state.pending = {
      kind: 'relator',
      title: 'Como reagir ao substitutivo?',
      text: 'Você é o autor. Pode aceitar as mudanças para ganhar votos, negociar com o relator ou levar a disputa ao plenário.',
      options: [
        {
          id: 'aceitar',
          label: 'Aceitar o substitutivo',
          description: state.jabuti
            ? 'O jabuti atrai votos de partidos pragmáticos, mas a lei fica mais cara e pode ser vetada ou questionada.'
            : 'Segue com o texto mais fraco, com mais chance de aprovação.',
        },
        {
          id: 'negociar',
          label: 'Negociar com o relator',
          description: 'Custa capital político; 60% de chance de restaurar o texto original.',
          cost: 2,
        },
        {
          id: 'destaque',
          label: 'Apresentar destaque no plenário',
          description: 'O plenário vota separadamente as mudanças: mais transparente, mas depende de maioria.',
          cost: 1,
        },
        { id: 'retirar', label: 'Retirar o projeto', description: 'Arquiva a proposta sem desgaste de uma derrota em plenário.' },
      ],
    }
    return
  }
  state.stage = 'pauta'
}

function applyRelatorChoice(ctx: LegislativeContext, state: BillState, optionId: string) {
  const t = getTemplate(state)
  if (optionId === 'retirar') {
    log(state, { stage: 'relator', title: 'Autor retira o projeto', text: 'A proposta é arquivada a pedido do autor.', outcome: 'info' })
    finish(state, 'arquivado')
    return
  }
  if (optionId === 'negociar' || optionId === 'destaque') {
    const rng = rngFor(ctx, state, optionId)
    let ok: boolean
    if (optionId === 'negociar') ok = rng() < 0.6
    else {
      const chamber = ctx.chambers[state.house]
      const res = vote(
        chamber,
        { econ: t.position.econ, popularity: 0.3 },
        { ...voteContext(ctx, state, chamber), bargaining: 0 },
        'simples',
        (ctx.seed ^ hashString(`destaque:${t.id}:${state.counter}`)) >>> 0,
      )
      ok = res.passed
      log(state, {
        stage: 'relator',
        title: ok ? 'Destaque aprovado' : 'Destaque rejeitado',
        text: ok ? 'O plenário restaurou o texto do autor.' : 'O plenário manteve o substitutivo do relator.',
        outcome: ok ? 'ok' : 'fail',
        vote: res,
      })
    }
    if (ok) {
      state.provisions.push(...state.removed)
      state.removed = []
      state.jabuti = null
      state.strength = getVariant(state)?.strength ?? 1
      if (optionId === 'negociar')
        log(state, { stage: 'relator', title: 'Acordo com o relator', text: 'O texto original foi restaurado.', outcome: 'ok' })
    } else if (optionId === 'negociar') {
      log(state, { stage: 'relator', title: 'Negociação sem acordo', text: 'O relator manteve o substitutivo.', outcome: 'fail' })
    }
  }
  state.stage = 'pauta'
}

/**
 * O presidente da casa controla a pauta: a maior parte dos projetos nunca
 * chega a ser votada. Pesam o partido do autor estar na base, a urgência,
 * a negociação com líderes e a popularidade. Projetos do Executivo e
 * medidas provisórias (que trancam a pauta) têm prioridade.
 */
function agenda(ctx: LegislativeContext, state: BillState) {
  const rng = rngFor(ctx, state, 'pauta')
  const chamber = ctx.chambers[state.house]
  const executiveAuthor = ['presidente', 'governador', 'prefeito'].includes(ctx.author)
  const vc = voteContext(ctx, state, chamber)
  const inBase = vc.coalition.has(ctx.authorParty)
  const prob = executiveAuthor || state.draft.norm === 'medida-provisoria'
    ? 0.9
    : Math.min(
        0.9,
        0.2 + (inBase ? 0.25 : 0) + (state.draft.urgency ? 0.25 : 0) + 0.25 * state.draft.bargaining + 0.1 * Math.max(0, position(state).popularity),
      )
  if (rng() < prob) {
    log(state, {
      stage: 'pauta',
      title: 'Projeto incluído na pauta',
      text: `O presidente da ${chamber.name} pautou a votação (chance estimada: ${Math.round(prob * 100)}%).`,
      outcome: 'ok',
      refs: ['art64'],
    })
    state.stage = 'plenario'
    return
  }
  log(state, {
    stage: 'pauta',
    title: 'Projeto fica na gaveta',
    text: `O presidente da ${chamber.name} não pautou a votação neste ano (chance estimada: ${Math.round(prob * 100)}%). A maioria dos projetos nunca chega ao plenário; urgência, apoio da base e negociação com líderes aumentam as chances. Você pode tentar de novo no próximo ano.`,
    outcome: 'fail',
  })
  finish(state, 'arquivado')
}

function plenary(ctx: LegislativeContext, state: BillState) {
  const chamber = ctx.chambers[state.house]
  const norm = state.draft.norm === 'medida-provisoria' ? 'lei-ordinaria' : state.draft.norm
  const res = vote(
    chamber,
    position(state),
    voteContext(ctx, state, chamber),
    quorumFor(norm),
    (ctx.seed ^ hashString(`plenario:${state.draft.templateId}:${ctx.t}:${state.house}:${state.turn}`)) >>> 0,
  )
  const pec = state.draft.norm === 'pec'
  log(state, {
    stage: 'plenario',
    title: `${chamber.name}${pec ? `, ${state.turn}º turno` : ''}: ${res.passed ? 'aprovado' : 'rejeitado'} (${res.yes} a ${res.no})`,
    text: res.quorumOk
      ? `Eram necessários ${res.required} votos favoráveis: ${res.rule}.${strategyNote(res)}`
      : 'Faltou quórum: menos da maioria absoluta dos membros esteve presente.',
    outcome: res.passed ? 'ok' : 'fail',
    vote: res,
    refs: [pec ? 'art60' : norm === 'lei-complementar' ? 'art69' : 'art47'],
  })
  if (!res.passed) {
    if (state.mpInForce) {
      log(state, {
        stage: 'plenario',
        title: 'Medida provisória rejeitada',
        text: 'Os efeitos produzidos durante a vigência são regulados por decreto legislativo; daqui em diante, a MP deixa de valer.',
        outcome: 'fail',
        refs: ['art62'],
      })
    }
    return finish(state, 'arquivado')
  }
  if (pec && state.turn === 1) {
    state.turn = 2
    return
  }
  state.turn = 1
  const bicameral = ctx.chambers.length > 1
  if (bicameral && state.house === ctx.initiatingHouse) {
    state.house = 1 - ctx.initiatingHouse
    state.stage = 'revisora'
    return
  }
  state.stage = pec ? 'promulgacao' : 'sancao'
}

function reviser(ctx: LegislativeContext, state: BillState) {
  const rng = rngFor(ctx, state, 'revisora')
  const chamber = ctx.chambers[state.house]
  const pec = state.draft.norm === 'pec'
  if (state.turn === 1 && !state.amendedByReviser && rng() > 0.75 + 0.2 * state.draft.bargaining) {
    log(state, {
      stage: 'revisora',
      title: `Projeto parado na ${chamber.name}`,
      text: `A casa revisora não votou o projeto neste ano. Sem acordo de líderes, propostas aprovadas numa casa podem esperar anos na outra.`,
      outcome: 'fail',
      refs: ['art65'],
    })
    return finish(state, 'arquivado')
  }
  // Pode emendar o texto antes de votar.
  const exec = findParty(ctx.executiveParty)
  const ctxVote = voteContext(ctx, state, chamber)
  const governmentLikes = exec ? partySupport(exec, position(state), ctxVote) : 0.5
  if (!pec && rng() < (governmentLikes < 0.5 ? 0.4 : 0.2)) {
    if (state.jabuti && rng() < 0.5) {
      log(state, {
        stage: 'revisora',
        title: `${chamber.name} retira o jabuti`,
        text: `A casa revisora emendou o texto para retirar ${state.jabuti.text}. Como houve emenda, o projeto volta à casa iniciadora.`,
        outcome: 'info',
        refs: ['art65'],
      })
      state.jabuti = null
    } else if (state.provisions.length > 1) {
      const [removed] = state.provisions.splice(state.provisions.length - 1, 1)
      state.removed.push(removed)
      state.strength *= 0.75
      log(state, {
        stage: 'revisora',
        title: `${chamber.name} emenda o texto`,
        text: `A casa revisora retirou “${removed}”. Como houve emenda, o projeto volta à casa iniciadora, que dará a palavra final sobre a mudança.`,
        outcome: 'warn',
        refs: ['art65'],
      })
    }
    state.amendedByReviser = true
  }
  const res = vote(
    chamber,
    position(state),
    ctxVote,
    quorumFor(state.draft.norm === 'medida-provisoria' ? 'lei-ordinaria' : state.draft.norm),
    (ctx.seed ^ hashString(`revisora:${state.draft.templateId}:${ctx.t}:${state.turn}`)) >>> 0,
  )
  log(state, {
    stage: 'revisora',
    title: `${chamber.name}${pec ? `, ${state.turn}º turno` : ''}: ${res.passed ? 'aprovado' : 'rejeitado'} (${res.yes} a ${res.no})`,
    text: res.passed
      ? `Eram necessários ${res.required} votos: ${res.rule}.${strategyNote(res)}`
      : `Rejeitado pela casa revisora, o projeto é arquivado (art. 65).${strategyNote(res)}`,
    outcome: res.passed ? 'ok' : 'fail',
    vote: res,
    refs: ['art65'],
  })
  if (!res.passed) return finish(state, 'arquivado')
  if (pec && state.turn === 1) {
    state.turn = 2
    return
  }
  if (pec) {
    state.stage = 'promulgacao'
    return
  }
  state.stage = state.amendedByReviser ? 'retorno' : 'sancao'
}

function backToInitiating(ctx: LegislativeContext, state: BillState) {
  state.house = ctx.initiatingHouse
  if (ctx.player.author) {
    state.pending = {
      kind: 'emendas-revisora',
      title: 'As emendas da casa revisora voltaram',
      text: 'A casa iniciadora decide se aceita as mudanças. Ela tem a palavra final (art. 65, parágrafo único), mas não pode incluir texto novo.',
      options: [
        { id: 'aceitar', label: 'Aceitar as emendas', description: 'O texto emendado segue à sanção.' },
        {
          id: 'rejeitar',
          label: 'Rejeitar as emendas',
          description: 'Restaura o texto aprovado na casa iniciadora, se houver maioria.',
          cost: 1,
        },
      ],
    }
    return
  }
  applyReviserChoice(ctx, state, 'aceitar')
}

function applyReviserChoice(ctx: LegislativeContext, state: BillState, optionId: string) {
  const chamber = ctx.chambers[ctx.initiatingHouse]
  if (optionId === 'rejeitar') {
    const res = vote(
      chamber,
      position(state),
      voteContext(ctx, state, chamber),
      'simples',
      (ctx.seed ^ hashString(`retorno:${state.draft.templateId}:${ctx.t}`)) >>> 0,
    )
    if (res.passed) {
      state.provisions.push(...state.removed)
      state.removed = []
      state.strength = getVariant(state)?.strength ?? 1
    }
    log(state, {
      stage: 'retorno',
      title: res.passed ? 'Casa iniciadora rejeita as emendas' : 'Casa iniciadora mantém as emendas',
      text: res.passed ? 'Volta a valer o texto original aprovado na casa iniciadora.' : 'Não houve maioria para rejeitar as mudanças.',
      outcome: res.passed ? 'ok' : 'warn',
      vote: res,
      refs: ['art65'],
    })
  } else {
    log(state, {
      stage: 'retorno',
      title: 'Casa iniciadora aceita as emendas',
      text: 'O texto emendado segue à sanção.',
      outcome: 'info',
      refs: ['art65'],
    })
  }
  state.stage = 'sancao'
}

function sanction(ctx: LegislativeContext, state: BillState) {
  if (ctx.player.executive) {
    state.pending = {
      kind: 'sancao',
      title: `Sancionar ou vetar? (${ctx.executiveTitle})`,
      text: `Você tem 15 dias úteis. O veto pode ser total ou parcial e precisa ser justificado por inconstitucionalidade ou contrariedade ao interesse público; se você não se manifestar, a sanção é tácita.${
        state.jabuti ? ` O texto contém um jabuti: ${state.jabuti.text}.` : ''
      }`,
      options: [
        { id: 'sancionar', label: 'Sancionar', description: 'A lei é promulgada como aprovada.' },
        {
          id: 'veto-parcial',
          label: state.jabuti ? 'Vetar o jabuti' : 'Veto parcial',
          description: state.jabuti ? 'Sanciona o restante e veta o trecho estranho ao tema.' : 'Veta um dos dispositivos.',
        },
        { id: 'veto-total', label: 'Veto total', description: 'Rejeita a lei inteira; o Legislativo pode derrubar o veto.' },
      ],
    }
    return
  }
  const rng = rngFor(ctx, state, 'sancao')
  const exec = findParty(ctx.executiveParty)
  const chamber = ctx.chambers[0]
  const support = exec ? partySupport(exec, position(state), voteContext(ctx, state, chamber)) : 0.5
  const knowsVice = state.hiddenVices.length > 0 && rng() < 0.5
  let choice = 'sancionar'
  if (support < 0.4 || knowsVice) choice = rng() < 0.75 ? 'veto-total' : 'veto-parcial'
  else if (state.jabuti && rng() < 0.6) choice = 'veto-parcial'
  applySanction(ctx, state, choice)
}

function applySanction(ctx: LegislativeContext, state: BillState, optionId: string) {
  if (optionId === 'sancionar') {
    log(state, {
      stage: 'sancao',
      title: `${ctx.executiveTitle} sanciona`,
      text: 'A lei segue para promulgação e publicação.',
      outcome: 'ok',
      refs: ['art66'],
    })
    state.stage = 'promulgacao'
    return
  }
  if (optionId === 'veto-parcial') {
    if (state.jabuti) {
      log(state, {
        stage: 'sancao',
        title: `${ctx.executiveTitle} veta o jabuti`,
        text: `Sanciona o projeto e veta ${state.jabuti.text}, por falta de relação com o tema e por contrariar o interesse público.`,
        outcome: 'info',
        refs: ['art66'],
      })
      state.jabuti = null
    } else if (state.provisions.length > 1) {
      const [removed] = state.provisions.splice(0, 1)
      state.removed.push(removed)
      state.strength *= 0.7
      log(state, {
        stage: 'sancao',
        title: `${ctx.executiveTitle} veta parcialmente`,
        text: `Veta “${removed}” e sanciona o restante.`,
        outcome: 'warn',
        refs: ['art66'],
      })
    }
    state.vetoed = 'parcial'
    state.stage = 'veto'
    return
  }
  log(state, {
    stage: 'sancao',
    title: `${ctx.executiveTitle} veta integralmente`,
    text: 'O veto vai ao Legislativo, que pode mantê-lo ou derrubá-lo.',
    outcome: 'fail',
    refs: ['art66'],
  })
  state.vetoed = 'total'
  state.stage = 'veto'
}

function vetoSession(ctx: LegislativeContext, state: BillState) {
  const results = ctx.chambers.map((chamber) => {
    const vc = voteContext(ctx, state, chamber)
    return vote(
      chamber,
      position(state),
      { ...vc, governmentStance: -1 },
      'absoluta',
      (ctx.seed ^ hashString(`veto:${state.draft.templateId}:${ctx.t}:${chamber.id}`)) >>> 0,
    )
  })
  const overridden = results.every((r) => r.passed)
  for (const r of results) {
    log(state, {
      stage: 'veto',
      title: `${r.chamber}: ${r.yes} votos pela derrubada (eram necessários ${r.required})`,
      text: ctx.chambers.length > 1 ? 'Sessão conjunta do Congresso: deputados e senadores votam separadamente.' : 'Votação do veto.',
      outcome: r.passed ? 'ok' : 'fail',
      vote: r,
      refs: ['art66'],
    })
  }
  if (overridden) {
    log(state, { stage: 'veto', title: 'Veto derrubado', text: 'Os trechos vetados voltam ao texto da lei.', outcome: 'ok', refs: ['art66'] })
    if (state.vetoed === 'parcial') {
      state.provisions.push(...state.removed)
      state.removed = []
    }
    state.vetoed = 'nenhum'
    state.stage = 'promulgacao'
    return
  }
  log(state, { stage: 'veto', title: 'Veto mantido', text: 'Prevalece a decisão do Executivo.', outcome: 'info', refs: ['art66'] })
  if (state.vetoed === 'total') return finish(state, 'arquivado')
  state.stage = 'promulgacao'
}

function promulgation(ctx: LegislativeContext, state: BillState) {
  const pec = state.draft.norm === 'pec'
  log(state, {
    stage: 'promulgacao',
    title: pec ? 'Emenda constitucional promulgada pelas Mesas' : 'Lei promulgada e publicada',
    text: pec
      ? 'Emendas à Constituição não passam por sanção ou veto do presidente.'
      : `A lei entra em vigor no ano seguinte (${2024 + ctx.t}).`,
    outcome: 'ok',
    refs: pec ? ['art60'] : ['art66'],
  })
  state.status = 'lei'
  state.mpInForce = false
  state.stage = 'controle'
}

function judicialReview(ctx: LegislativeContext, state: BillState) {
  const rng = rngFor(ctx, state, 'controle')
  const t = getTemplate(state)
  const controversial = Math.abs(position(state).econ) >= 0.5 || (position(state).env ?? 0) <= -0.5
  const mpJabuti = state.jabuti && state.draft.norm === 'medida-provisoria'
  const fileProb =
    state.hiddenVices.length > 0 ? 0.85 : mpJabuti ? 0.8 : state.jabuti ? 0.4 : controversial ? 0.25 : 0.08
  if (rng() >= fileProb) {
    log(state, {
      stage: 'controle',
      title: 'Nenhuma ação de inconstitucionalidade',
      text: 'A lei não foi questionada no tribunal neste ano.',
      outcome: 'ok',
    })
    return finish(state, 'lei')
  }
  const filers = ['um partido de oposição', 'a Procuradoria-Geral', 'o Conselho Federal da OAB', 'uma confederação nacional', 'um governador']
  const filer = filers[Math.floor(rng() * filers.length)]
  log(state, {
    stage: 'controle',
    title: `Ação de inconstitucionalidade no ${ctx.courtName}`,
    text: `A lei “${t.title}” é questionada por ${filer}.${
      state.hiddenVices.length > 0 ? ` Argumento: ${state.hiddenVices[0].text}` : state.jabuti ? ` Argumento: trecho sem pertinência temática (${state.jabuti.text}).` : ' Argumento: ofensa a princípios constitucionais.'
    }`,
    outcome: 'warn',
    refs: ['art103', 'art102'],
  })
  if (ctx.player.court) {
    state.pending = {
      kind: 'stf',
      title: 'Você é o relator da ação',
      text: 'Como relator, você pode conceder uma liminar individual (efeito imediato, depois submetida ao plenário), levar o caso direto ao plenário ou negar seguimento se a ação não tiver fundamento.',
      options: [
        {
          id: 'liminar',
          label: 'Liminar monocrática suspendendo a lei',
          description: 'Efeito imediato. Reduz a segurança jurídica e precisa ser referendada pelo plenário.',
        },
        {
          id: 'plenario',
          label: 'Levar ao plenário',
          description: 'Os 11 ministros decidem; são necessários 6 votos para declarar a inconstitucionalidade.',
        },
        { id: 'negar', label: 'Negar seguimento', description: 'Arquiva a ação; a lei continua valendo.' },
      ],
    }
    return
  }
  applyCourt(ctx, state, rng() < 0.3 ? 'liminar' : 'plenario')
}

function applyCourt(ctx: LegislativeContext, state: BillState, optionId: string) {
  const rng = rngFor(ctx, state, 'julgamento')
  if (optionId === 'negar') {
    log(state, {
      stage: 'controle',
      title: 'Relator nega seguimento à ação',
      text: 'A lei continua valendo. Cabe recurso (agravo) ao plenário.',
      outcome: 'ok',
      refs: ['art102'],
    })
    return finish(state, 'lei')
  }
  if (optionId === 'liminar') {
    log(state, {
      stage: 'controle',
      title: 'Liminar individual suspende a lei',
      text: 'A decisão de um único ministro tem efeito imediato e é levada ao plenário para referendo. Críticos veem excesso de poder individual; defensores, proteção contra danos irreversíveis.',
      outcome: 'warn',
      refs: ['art97'],
    })
  }
  // Votação no plenário: 11 ministros.
  const vices = state.hiddenVices
  const strikeProb =
    vices.some((v) => v.kind !== 'material') ? 0.92 : vices.length > 0 ? 0.75 : state.jabuti ? (state.draft.norm === 'medida-provisoria' ? 0.85 : 0.35) : 0.1
  let yes = 0
  for (let i = 0; i < 11; i++) if (rng() < (strikeProb > 0.5 ? strikeProb : strikeProb + 0.15)) yes++
  if (strikeProb < 0.5) yes = Math.min(yes, rng() < strikeProb ? 6 : 5)
  const struck = yes >= 6
  const onlyJabuti = struck && vices.length === 0 && state.jabuti !== null
  log(state, {
    stage: 'controle',
    title: struck
      ? onlyJabuti
        ? `Plenário derruba o jabuti (${yes} a ${11 - yes})`
        : `Plenário declara a lei inconstitucional (${yes} a ${11 - yes})`
      : `Plenário mantém a lei (${11 - yes} a ${yes})`,
    text: struck
      ? onlyJabuti
        ? 'O trecho sem relação com o tema é anulado; o restante da lei continua valendo.'
        : `Fundamento: ${vices[0]?.text ?? 'ofensa à Constituição'} ${legalRef(vices[0]?.ref ?? '')?.ref ?? ''}`
      : 'A maioria entendeu que a lei é compatível com a Constituição.',
    outcome: struck && !onlyJabuti ? 'fail' : 'ok',
    court: { yes, no: 11 - yes, label: 'pela inconstitucionalidade' },
    refs: struck ? [vices[0]?.ref ?? 'art102', 'art97'] : ['art102'],
  })
  if (onlyJabuti) {
    state.jabuti = null
    return finish(state, 'lei')
  }
  if (struck) {
    state.struckYear = ctx.t + 1
    return finish(state, 'inconstitucional')
  }
  finish(state, 'lei')
}

function finish(state: BillState, status: BillStatus) {
  state.status = status
  state.stage = 'fim'
  state.pending = null
}

export function officeName(o: Office): string {
  const names: Record<Office, string> = {
    vereador: 'vereador(a)',
    prefeito: 'prefeito(a)',
    'deputado-estadual': 'deputado(a) estadual',
    governador: 'governador(a)',
    'deputado-federal': 'deputado(a) federal',
    senador: 'senador(a)',
    presidente: 'presidente da República',
    'ministro-stf': 'ministro(a) do STF',
  }
  return names[o]
}

/** Converte uma lei federal aprovada em efeito para a simulação. */
export function lawToEffect(state: BillState, side: Side): DecisionEffect | null {
  const t = getTemplate(state)
  if (state.status !== 'lei' || !t.effect.national) return null
  const base = t.effect.national(side)
  const k = state.strength
  const scaled: DecisionEffect = { ...base }
  for (const key of ['growthA', 'growthB', 'fiscalA', 'fiscalB', 'marketA', 'marketB'] as const) {
    if (scaled[key] !== undefined) scaled[key] = (scaled[key] as number) * k
  }
  // Efeitos qualitativos só valem se a lei não foi muito desidratada.
  if (k < 0.5) {
    delete scaled.transparencyA
    delete scaled.transparencyB
    delete scaled.climatePrepA
    delete scaled.climatePrepB
  }
  if (state.jabuti) {
    const key = side === 'A' ? 'fiscalA' : 'fiscalB'
    scaled[key] = (scaled[key] ?? 0) - state.jabuti.fiscal
  }
  return scaled
}
