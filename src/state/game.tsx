import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { track } from '../lib/telemetry'
import { findPromise } from '../model/promises'
import { HORIZON } from '../model/simulation'
import { pendingItems, type CareerState, type TurnItem } from '../model/career'
import { findMission, type Mission } from '../model/game'
import type { SimInput, YearResult } from '../model/simulation'
import { reducer, registerCustom, withResults, type Action, type GameState } from './gameCore'

export { gameInput, registerCustom } from './gameCore'

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
          promises: c.promises ?? [],
          history: c.history ?? [],
          wealth: c.wealth ?? 1_000_000,
          wealthHistory: c.wealthHistory ?? [{ t: c.t ?? 0, value: c.wealth ?? 1_000_000 }],
          illicitGains: c.illicitGains ?? 0,
          exposure: c.exposure ?? 0,
          criminalCase: c.criminalCase ?? null,
          ineligibleUntil: c.ineligibleUntil ?? null,
          campaignSpend: c.campaignSpend ?? [],
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

/** Métricas anônimas a partir das ações do jogador. */
function trackAction(a: Action) {
  if (a.type === 'start') track('game_start')
  if (a.type === 'add-custom') track('custom_bill')
  if (a.type !== 'resolve') return
  const it = a.item
  if (it.kind === 'quiz') track(a.optionId === it.quiz.correct ? 'quiz_ok' : 'quiz_fail')
  if (it.kind === 'oferta') track(a.optionId === 'aceitar' ? 'offer_accept' : a.optionId === 'denunciar' ? 'offer_report' : 'offer_refuse')
  if (it.kind === 'orcamento')
    track(a.optionId === 'social' ? 'budget_social' : a.optionId === 'investimento' ? 'budget_invest' : a.optionId === 'austero' ? 'budget_austere' : 'budget_balanced')
  if (it.kind === 'promessa' && a.optionId !== 'nenhuma')
    track(findPromise(a.optionId)?.feasibility === 'impossivel' ? 'promise_impossible' : 'promise_possible')
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  const dispatch = useCallback((a: Action) => {
    trackAction(a)
    rawDispatch(a)
  }, [])
  // Votos pelo mérito e fim de partida são percebidos pelo estado.
  const meritVotes = state.career?.history.filter((h) => h.kind === 'voto' && h.id === 'merito').length ?? 0
  const prevMerit = useRef(meritVotes)
  useEffect(() => {
    if (meritVotes > prevMerit.current) track('merit_vote')
    prevMerit.current = meritVotes
  }, [meritVotes])
  const ended = (state.career?.t ?? 0) >= HORIZON
  const prevEnded = useRef(ended)
  useEffect(() => {
    if (ended && !prevEnded.current) track('game_end')
    prevEnded.current = ended
  }, [ended])
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
