// Núcleo do jogo sem React: estado, ações e redutor. É puro e
// determinístico, por isso uma partida pode ser repetida a partir do
// registro de ações (usado para verificar pontuações do ranking).

import type { Office } from '../model/bills'
import { registerCustomBill } from '../model/bills'
import {
  chooseNextOffice,
  fillAiDecisions,
  itemKey,
  newCareer,
  pendingItems,
  proposeBill,
  resolveItem,
  settleYear,
  type CareerState,
  type PlayerSetup,
  type TurnItem,
} from '../model/career'
import { customArguments, sanitizeAnalysis, toBillTemplate, type CustomBill } from '../model/customBill'
import { difficultyOf } from '../model/difficulty'
import { findMission, missionInput, type Mission } from '../model/game'
import type { BillDraft } from '../model/lawmaking'
import { SEPARATION_PRESETS } from '../model/params'
import { HORIZON, simulate, type SimInput } from '../model/simulation'

export interface GameState {
  missionId: string | null
  career: CareerState | null
  /** Registro das ações da partida, para repetir e verificar a pontuação */
  log?: Action[]
}

export type Action =
  | { type: 'start'; missionId: string; setup: PlayerSetup }
  | { type: 'resolve'; item: TurnItem; optionId: string }
  | { type: 'propose'; draft: BillDraft }
  | { type: 'advance' }
  | { type: 'career'; office: Office | null }
  | { type: 'spend'; amount: number }
  | { type: 'add-custom'; bill: CustomBill }
  | { type: 'quit' }

/** Registra no catálogo uma proposta criada pelo jogador. */
export function registerCustom(c: CustomBill) {
  registerCustomBill(toBillTemplate(c), customArguments(c))
}

export function gameInput(mission: Mission, career: CareerState): SimInput {
  const base = missionInput(mission, 30, career.decisions)
  // Separação decidida durante a partida sobrepõe o cenário (que pode ser o Brasil unido).
  const params = career.separation
    ? {
        ...base.params,
        ...SEPARATION_PRESETS[career.separation.type],
        separation: career.separation.type,
        separationYear: career.separation.year,
      }
    : base.params
  // Dificuldade: mais ou menos eventos e crises.
  const events = difficultyOf(career.setup.difficulty).events
  return { ...base, params: { ...params, eventProbability: params.eventProbability * events }, lawEffects: career.lawEffects, ufEffects: career.ufEffects }
}

export function withResults(mission: Mission, career: CareerState) {
  const input = gameInput(mission, career)
  return { input, results: simulate(input, HORIZON) }
}

function apply(s: GameState, a: Action): GameState {
  if (a.type === 'start') return { missionId: a.missionId, career: newCareer(a.setup) }
  if (a.type === 'quit') return { missionId: null, career: null }
  if (a.type === 'add-custom') {
    if (!s.career) return s
    registerCustom(a.bill)
    const others = s.career.customBills.filter((b) => b.id !== a.bill.id)
    return { ...s, career: { ...s.career, customBills: [...others, a.bill] } }
  }
  if (a.type === 'spend') return s.career ? { ...s, career: { ...s.career, capital: Math.max(0, s.career.capital - a.amount) } } : s
  const mission = s.missionId ? findMission(s.missionId) : undefined
  if (!mission || !s.career) return s
  const { input, results } = withResults(mission, s.career)
  switch (a.type) {
    case 'resolve':
      return { ...s, career: resolveItem(s.career, a.item, a.optionId, input, results) }
    case 'propose':
      return { ...s, career: proposeBill(s.career, a.draft, input, results) }
    case 'career':
      return { ...s, career: chooseNextOffice(s.career, a.office) }
    case 'advance': {
      if (s.career.t >= HORIZON) return s
      if (pendingItems(s.career, input, results).length > 0) return s
      const filled = fillAiDecisions(s.career, input)
      const moved: CareerState = { ...filled, t: filled.t + 1 }
      const after = withResults(mission, moved)
      return { ...s, career: settleYear(moved, after.input, after.results) }
    }
  }
}

/** Redutor do jogo: aplica a ação e a guarda no registro da partida. */
export function reducer(s: GameState, a: Action): GameState {
  const next = apply(s, a)
  if (next === s) return s
  if (a.type === 'quit') return next
  if (a.type === 'start') return { ...next, log: [a] }
  return { ...next, log: [...(s.log ?? []), a] }
}

/**
 * Repete uma partida a partir do registro, conferindo que cada decisão
 * estava de fato disponível naquele momento. Devolve null se o registro for
 * inválido.
 */
export function replay(log: Action[]): GameState | null {
  let s: GameState = { missionId: null, career: null }
  for (const a of log) {
    if (a.type === 'resolve') {
      if (!s.career || !s.missionId) return null
      const mission = findMission(s.missionId)
      if (!mission) return null
      const { input, results } = withResults(mission, s.career)
      const keys = pendingItems(s.career, input, results).map((i) => itemKey(i, s.career!.t + 1))
      if (!keys.includes(itemKey(a.item, s.career.t + 1))) return null
    }
    // Propostas criadas com IA são reavaliadas com os mesmos limites do jogo.
    const action: Action = a.type === 'add-custom' ? { ...a, bill: { ...a.bill, analysis: sanitizeAnalysis(a.bill.analysis) } } : a
    if (action.type === 'spend' && action.amount < 0) return null
    s = reducer(s, action)
  }
  return s
}
