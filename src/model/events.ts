// Eventos aleatórios. O sorteio de cada ano usa um gerador derivado de
// (semente, ano), então o resultado é reproduzível e independe de a
// simulação ter sido avançada ano a ano ou de uma vez.

import type { SeparationType } from './params'

import type { GlobalEventId } from './geopolitics'

export type EventId = 'boom-commodities' | 'crise-cambial' | 'acordo-terceiros' | 'fuga-capitais' | GlobalEventId

export interface EventOccurrence {
  id: EventId
  /** Ano em que o evento começa */
  year: number
  /** Duração em anos */
  duration: number
  title: string
  /** Efeito sobre o crescimento de cada bloco, p.p. por ano de duração */
  effectA: number
  effectB: number
  explanation: string
}

export interface EventContext {
  t: number
  separation: SeparationType
  probability: number
  debtA: number
  debtB: number
  /** Eventos ainda ativos neste ano (para não repetir o mesmo evento) */
  active: EventOccurrence[]
}

/** Gerador pseudoaleatório mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function yearRng(seed: number, t: number): () => number {
  return mulberry32((Math.imul(seed >>> 0, 2654435761) ^ Math.imul(t + 1, 40503)) >>> 0)
}

type Builder = (ctx: EventContext, rng: () => number) => EventOccurrence

const BUILDERS: Record<Exclude<EventId, 'fuga-capitais' | GlobalEventId>, Builder> = {
  'boom-commodities': (ctx) => ({
    id: 'boom-commodities',
    year: ctx.t,
    duration: 2,
    title: 'Boom de commodities',
    effectA: 0.3,
    effectB: 0.8,
    explanation:
      'Os preços internacionais de minério, petróleo e alimentos sobem. B, com pauta exportadora mais concentrada em recursos naturais, ganha mais; A se beneficia pelo agronegócio do Centro-Oeste. O efeito dura dois anos.',
  }),
  'crise-cambial': (ctx) => {
    const diff = ctx.debtA - ctx.debtB
    const hitsA = diff > 2
    const hitsB = diff < -2
    const effectA = hitsA ? -1.5 : hitsB ? -0.3 : -0.8
    const effectB = hitsB ? -1.5 : hitsA ? -0.3 : -0.8
    const who = hitsA
      ? 'Os investidores concentram a desconfiança no Bloco A, que tem a maior dívida/PIB.'
      : hitsB
        ? 'Os investidores concentram a desconfiança no Bloco B, que tem a maior dívida/PIB.'
        : 'Com dívidas parecidas, os dois blocos são atingidos de forma semelhante.'
    return {
      id: 'crise-cambial',
      year: ctx.t,
      duration: 1,
      title: 'Crise cambial',
      effectA,
      effectB,
      explanation: `Uma onda de aversão a risco nos mercados emergentes desvaloriza as moedas e eleva os juros. ${who}`,
    }
  },
  'acordo-terceiros': (ctx, rng) => {
    const toA = rng() < 0.5
    return {
      id: 'acordo-terceiros',
      year: ctx.t,
      duration: 1,
      title: `Acordo comercial com terceiros países (Bloco ${toA ? 'A' : 'B'})`,
      effectA: toA ? 0.4 : 0,
      effectB: toA ? 0 : 0.4,
      explanation: `O Bloco ${toA ? 'A' : 'B'} fecha um acordo de redução tarifária com parceiros fora do continente, abrindo mercado para suas exportações neste ano.`,
    }
  },
}

const WEIGHTS: Record<Exclude<EventId, 'fuga-capitais' | GlobalEventId>, number> = {
  'boom-commodities': 3,
  'crise-cambial': 3,
  'acordo-terceiros': 2,
}

/** Sorteia os eventos que começam no ano ctx.t. */
export function drawEvents(seed: number, ctx: EventContext): EventOccurrence[] {
  const rng = yearRng(seed, ctx.t)
  const out: EventOccurrence[] = []
  const activeIds = new Set(ctx.active.map((e) => e.id))

  // Fuga de capitais: risco específico dos anos 1–3 numa separação conflituosa.
  const capitalRoll = rng()
  if (ctx.separation === 'conflituosa' && ctx.t <= 3 && !activeIds.has('fuga-capitais') && capitalRoll < 0.4) {
    out.push({
      id: 'fuga-capitais',
      year: ctx.t,
      duration: 1,
      title: 'Fuga de capitais',
      effectA: -0.8,
      effectB: -1.2,
      explanation:
        'Com a disputa sobre dívida e ativos sem solução, empresas e famílias retiram recursos dos dois blocos. B, com mercado financeiro menor, sente mais.',
    })
  }

  const roll = rng()
  const pick = rng()
  const sub = rng()
  if (roll < ctx.probability / 100) {
    const ids = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).filter((id) => !activeIds.has(id))
    const total = ids.reduce((s, id) => s + WEIGHTS[id], 0)
    let acc = 0
    for (const id of ids) {
      acc += WEIGHTS[id] / total
      if (pick < acc) {
        out.push(BUILDERS[id](ctx, () => sub))
        break
      }
    }
  }
  return out
}
