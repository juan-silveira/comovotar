import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Office } from '../model/bills'
import {
  chooseNextOffice,
  fillAiDecisions,
  newCareer,
  pendingItems,
  proposeBill,
  resolveItem,
  settleYear,
  type CareerState,
  type PlayerSetup,
  type TurnItem,
} from '../model/career'
import { findMission, missionInput, type Mission } from '../model/game'
import type { BillDraft } from '../model/lawmaking'
import { SEPARATION_PRESETS } from '../model/params'
import { registerCustomBill } from '../model/bills'
import { customArguments, toBillTemplate, type CustomBill } from '../model/customBill'

/** Registra no catálogo uma proposta criada pelo jogador. */
export function registerCustom(c: CustomBill) {
  registerCustomBill(toBillTemplate(c), customArguments(c))
}
import { HORIZON, simulate, type SimInput, type YearResult } from '../model/simulation'

interface GameState {
  missionId: string | null
  career: CareerState | null
}

type Action =
  | { type: 'start'; missionId: string; setup: PlayerSetup }
  | { type: 'resolve'; item: TurnItem; optionId: string }
  | { type: 'propose'; draft: BillDraft }
  | { type: 'advance' }
  | { type: 'career'; office: Office | null }
  | { type: 'spend'; amount: number }
  | { type: 'add-custom'; bill: CustomBill }
  | { type: 'quit' }

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
  return { ...base, params, lawEffects: career.lawEffects, ufEffects: career.ufEffects }
}

function withResults(mission: Mission, career: CareerState) {
  const input = gameInput(mission, career)
  return { input, results: simulate(input, HORIZON) }
}

function reducer(s: GameState, a: Action): GameState {
  if (a.type === 'start') return { missionId: a.missionId, career: newCareer(a.setup) }
  if (a.type === 'quit') return { missionId: null, career: null }
  if (a.type === 'add-custom') {
    if (!s.career) return s
    registerCustom(a.bill)
    const others = s.career.customBills.filter((b) => b.id !== a.bill.id)
    return { ...s, career: { ...s.career, customBills: [...others, a.bill] } }
  }
  if (a.type === 'spend')
    return s.career ? { ...s, career: { ...s.career, capital: Math.max(0, s.career.capital - a.amount) } } : s
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

const KEY = 'sdr.game'

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const g = JSON.parse(raw) as GameState
      // Partidas salvas antes do modo unido não têm estes campos.
      if (g.career) {
        const c = g.career as Partial<CareerState>
        g.career = {
          ...g.career,
          separation: c.separation ?? null,
          movement: c.movement ?? { A: 8, B: 6 },
          separatistStance: c.separatistStance ?? 0,
          movementTiers: c.movementTiers ?? [],
          termLimited: c.termLimited ?? [],
          partyLoyalty: c.partyLoyalty ?? 70,
          customBills: c.customBills ?? [],
        }
        for (const cb of g.career.customBills) registerCustom(cb)
      }
      return g
    }
  } catch {
    // estado inválido
  }
  return { missionId: null, career: null }
}

interface GameContextValue {
  state: GameState
  dispatch: (a: Action) => void
  mission: Mission | undefined
  career: CareerState | null
  input: SimInput | null
  results: YearResult[]
  items: TurnItem[]
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // ignorado
    }
  }, [state])
  const mission = state.missionId ? findMission(state.missionId) : undefined
  const career = state.career
  const { input, results } = useMemo(() => {
    if (!mission || !career) return { input: null, results: [] as YearResult[] }
    return withResults(mission, career)
  }, [mission, career])
  const items = useMemo(
    () => (career && input ? pendingItems(career, input, results) : []),
    [career, input, results],
  )
  return (
    <GameContext.Provider value={{ state, dispatch, mission, career, input, results, items }}>{children}</GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame fora do GameProvider')
  return ctx
}
