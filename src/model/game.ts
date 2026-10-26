// Modo jogo: missões, objetivos e pontuação. A pontuação dá peso igual aos
// dois blocos (média geométrica do desempenho de cada um frente à própria
// trajetória sem separação), para não favorecer nenhuma região.

import { DEFAULT_BASELINE } from './baseline'
import { DEFAULT_COEFFICIENTS, defaultParams, type Params, type SeparationType } from './params'
import { HORIZON, type BlockId, type SimInput, type YearResult } from './simulation'

export type ObjectiveStatus = 'ok' | 'fail' | 'pending'

export interface Objective {
  id: string
  label: string
  /** Avalia o objetivo com os resultados até o ano `upTo`. */
  evaluate: (results: YearResult[], upTo: number) => ObjectiveStatus
}

export interface Mission {
  id: string
  title: string
  summary: string
  separation: SeparationType
  /** Ano (t) da separação; null = Brasil unido (a separação só ocorre se o jogador seguir esse caminho) */
  separationYear: number | null
  seed: number
  eventProbability: number
  objectives: Objective[]
}

export const OBJECTIVE_POINTS = 100

// Metas do cenário unido (calibradas para serem alcançáveis, mas não triviais).
const UNIDO_DEBT = 105
const UNIDO_APPROVAL = 38

// Construtores de objetivos -----------------------------------------------

const BOTH: BlockId[] = ['A', 'B']

/** Ambos os blocos com dívida/PIB <= limite no ano final. */
function debtCap(limit: number, blocks: BlockId[] = BOTH): Objective {
  const who = blocks.length === 2 ? 'dos dois blocos' : `do Bloco ${blocks[0]}`
  return {
    id: `divida-${blocks.join('')}-${limit}`,
    label: `Dívida/PIB ${who} até ${limit}% no ano ${HORIZON}`,
    evaluate: (r, upTo) =>
      upTo < HORIZON ? 'pending' : blocks.every((b) => r[HORIZON][b].debt <= limit) ? 'ok' : 'fail',
  }
}

/** Bloco com PIB per capita a no máximo `gap`% abaixo da trajetória sem separação no ano t. */
function perCapitaFloor(block: BlockId | 'ambos', gap: number, t: number = HORIZON): Objective {
  const blocks = block === 'ambos' ? BOTH : [block]
  const who = block === 'ambos' ? 'dos dois blocos' : `do Bloco ${block}`
  return {
    id: `pc-${block}-${gap}-${t}`,
    label:
      gap > 0
        ? `PIB per capita ${who} no máximo ${gap}% abaixo da trajetória sem separação no ano ${t}`
        : gap === 0
          ? `PIB per capita ${who} pelo menos igual ao do Brasil unido no ano ${t}`
          : `PIB per capita ${who} pelo menos ${-gap}% acima do Brasil unido no ano ${t}`,
    evaluate: (r, upTo) =>
      upTo < t ? 'pending' : blocks.every((b) => r[t][b].vsNoSeparation >= -gap) ? 'ok' : 'fail',
  }
}

/** Diferença entre os desempenhos relativos dos blocos <= `gap` p.p. no ano final. */
function balance(gap: number): Objective {
  return {
    id: `equilibrio-${gap}`,
    label: `Equilíbrio: desempenhos de A e B (frente à trajetória sem separação) a até ${gap} p.p. um do outro no ano ${HORIZON}`,
    evaluate: (r, upTo) =>
      upTo < HORIZON
        ? 'pending'
        : Math.abs(r[HORIZON].A.vsNoSeparation - r[HORIZON].B.vsNoSeparation) <= gap
          ? 'ok'
          : 'fail',
  }
}

/** Ambos os blocos com crescimento positivo no ano t. */
function recoveryBy(t: number): Objective {
  return {
    id: `retomada-${t}`,
    label: `Os dois blocos voltam a crescer até o ano ${t}`,
    evaluate: (r, upTo) =>
      upTo < t ? 'pending' : r[t].A.growth > 0 && r[t].B.growth > 0 ? 'ok' : 'fail',
  }
}

/** Aprovação do governo nacional no ano final. */
function approvalFloor(min: number): Objective {
  return {
    id: `aprovacao-${min}`,
    label: `Aprovação do governo de pelo menos ${min}% no ano ${HORIZON}`,
    evaluate: (r, upTo) => (upTo < HORIZON ? 'pending' : r[HORIZON].A.approval >= min ? 'ok' : 'fail'),
  }
}

// Missões --------------------------------------------------------------------

export const MISSIONS: Mission[] = [
  {
    id: 'unido',
    title: 'Brasil unido',
    summary:
      'O país como ele é: uma federação. Governe, legisle ou julgue por 30 anos. Movimentos separatistas podem surgir, e só haverá separação se você seguir esse caminho.',
    separation: 'intermediaria',
    separationYear: null,
    seed: 4004,
    eventProbability: 15,
    objectives: [perCapitaFloor('A', 4), debtCap(UNIDO_DEBT), approvalFloor(UNIDO_APPROVAL)],
  },
  {
    id: 'amigavel',
    title: 'Separação negociada',
    summary:
      'Uma separação amigável com união aduaneira. Com governo médio, os blocos ficam parecidos com o Brasil unido; o desafio é usar a autonomia bem o bastante para os dois ficarem melhores, sem deixar a dívida crescer.',
    separation: 'amigavel',
    separationYear: 1,
    seed: 1001,
    eventProbability: 15,
    objectives: [recoveryBy(3), perCapitaFloor('ambos', 0), debtCap(100)],
  },
  {
    id: 'intermediaria',
    title: 'Acordo parcial',
    summary:
      'Livre comércio só para parte dos produtos e negociação lenta. É preciso evitar que um dos blocos fique muito para trás.',
    separation: 'intermediaria',
    separationYear: 1,
    seed: 2002,
    eventProbability: 15,
    objectives: [recoveryBy(5), balance(3), debtCap(150, ['B'])],
  },
  {
    id: 'conflituosa',
    title: 'Ruptura',
    summary:
      'Tarifas altas, disputa por ativos e fronteira rígida. O objetivo é limitar os danos e reconstruir a confiança dos credores.',
    separation: 'conflituosa',
    separationYear: 1,
    seed: 3003,
    eventProbability: 20,
    objectives: [recoveryBy(7), perCapitaFloor('ambos', 40), debtCap(280)],
  },
]

/** Identificador ISO da semana (ex.: 2026-W43), usado no desafio semanal. */
export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function weeklyMission(date: Date = new Date()): Mission {
  return weeklyMissionFor(isoWeek(date))
}

function weeklyMissionFor(week: string): Mission {
  const seed = hashString(week)
  const types: SeparationType[] = ['amigavel', 'intermediaria', 'conflituosa']
  const separation = types[seed % 3]
  const caps: Record<SeparationType, number> = { amigavel: 100, intermediaria: 150, conflituosa: 280 }
  const recovery: Record<SeparationType, number> = { amigavel: 2, intermediaria: 5, conflituosa: 7 }
  return {
    id: `semanal-${week}`,
    title: `Desafio da semana ${week.split('-W')[1]}/${week.split('-')[0]}`,
    summary:
      'Tipo de separação e eventos sorteados para a semana, iguais para todos os jogadores. Eventos mais frequentes que nas missões fixas.',
    separation,
    separationYear: 1,
    seed,
    eventProbability: 30,
    objectives: [recoveryBy(recovery[separation]), balance(3), debtCap(caps[separation])],
  }
}

/** Data local no formato aaaa-mm-dd. */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Desafio do dia: Brasil unido, com crises e eventos sorteados pela data (iguais para todos). */
export function dailyMission(date: Date = new Date()): Mission {
  return dailyMissionFor(isoDay(date))
}

function dailyMissionFor(day: string): Mission {
  const [y, m, d] = day.split('-')
  const base = MISSIONS[0]
  return {
    ...base,
    id: `diaria-${day}`,
    title: `Desafio do dia ${d}/${m}/${y}`,
    summary: 'O Brasil como ele é, com crises, eventos e eleições sorteados para hoje, iguais para todos os jogadores.',
    seed: hashString(`diaria-${day}`),
    eventProbability: 22,
  }
}

export function allMissions(date: Date = new Date()): Mission[] {
  return [...MISSIONS, dailyMission(date), weeklyMission(date)]
}

// Cenários personalizados (turmas, grupos e editor) ----------------------------------------

/** Meta serializável, para guardar cenários personalizados no Firestore. */
export type ObjectiveSpec =
  | { type: 'pc'; block: BlockId | 'ambos'; gap: number }
  | { type: 'debt'; limit: number }
  | { type: 'approval'; min: number }
  | { type: 'recovery'; t: number }
  | { type: 'balance'; gap: number }

export interface MissionSpec {
  title: string
  summary: string
  separation: SeparationType
  separationYear: number | null
  seed: number
  eventProbability: number
  objectives: ObjectiveSpec[]
}

export function buildObjective(o: ObjectiveSpec): Objective {
  switch (o.type) {
    case 'pc':
      return perCapitaFloor(o.block, o.gap)
    case 'debt':
      return debtCap(o.limit)
    case 'approval':
      return approvalFloor(o.min)
    case 'recovery':
      return recoveryBy(o.t)
    case 'balance':
      return balance(o.gap)
  }
}

export function missionFromSpec(id: string, spec: MissionSpec): Mission {
  return {
    id,
    title: spec.title,
    summary: spec.summary,
    separation: spec.separation,
    separationYear: spec.separationYear,
    seed: spec.seed >>> 0,
    eventProbability: Math.max(0, Math.min(40, spec.eventProbability)),
    objectives: spec.objectives.slice(0, 3).map(buildObjective),
  }
}

const CUSTOM_KEY = 'sdr.custom-missions'
const custom = new Map<string, MissionSpec>(
  (() => {
    try {
      return Object.entries(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '{}') as Record<string, MissionSpec>)
    } catch {
      return []
    }
  })(),
)

/** Guarda um cenário personalizado para que partidas em andamento o encontrem depois. */
export function registerMission(id: string, spec: MissionSpec) {
  custom.set(id, spec)
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(Object.fromEntries(custom)))
  } catch {
    // ignorado
  }
}

/** Encontra a missão pelo id, inclusive desafios de dias e semanas anteriores (partidas em andamento). */
export function findMission(id: string, date: Date = new Date()): Mission | undefined {
  const fixed = allMissions(date).find((m) => m.id === id)
  if (fixed) return fixed
  const spec = custom.get(id)
  if (spec) return missionFromSpec(id, spec)
  const week = id.match(/^semanal-(\d{4}-W\d{2})$/)
  if (week) return weeklyMissionFor(week[1])
  const day = id.match(/^diaria-(\d{4}-\d{2}-\d{2})$/)
  if (day) return dailyMissionFor(day[1])
  return undefined
}

/**
 * Entrada da simulação de uma missão: dados de base e coeficientes travados
 * nos valores padrão. O jogador escolhe apenas a parcela reinvestida e as
 * cartas de decisão.
 */
export function missionInput(mission: Mission, reinvestShare: number, decisions: SimInput['decisions']): SimInput {
  const params: Params = {
    ...defaultParams(mission.separation),
    separationYear: mission.separationYear,
    reinvestShare,
    eventsEnabled: true,
    eventProbability: mission.eventProbability,
    decisionsEnabled: true,
  }
  return { baseline: DEFAULT_BASELINE, coef: DEFAULT_COEFFICIENTS, params, seed: mission.seed, decisions }
}

export interface ScoreBreakdown {
  /** 1000 × média geométrica de (1 + desempenho relativo) dos dois blocos */
  base: number
  objectivesMet: number
  bonus: number
  total: number
}

export function score(mission: Mission, results: YearResult[]): ScoreBreakdown {
  const last = results[HORIZON]
  const ra = 1 + last.A.vsNoSeparation / 100
  const rb = 1 + last.B.vsNoSeparation / 100
  const base = Math.round(1000 * Math.sqrt(Math.max(0, ra) * Math.max(0, rb)))
  const objectivesMet = mission.objectives.filter((o) => o.evaluate(results, HORIZON) === 'ok').length
  const bonus = objectivesMet * OBJECTIVE_POINTS
  return { base, objectivesMet, bonus, total: base + bonus }
}
