import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { DEFAULT_BASELINE, type Baseline } from '../model/baseline'
import { DECISION_CARDS, type DecisionCard, type DecisionChoice } from '../model/decisions'
import {
  applySeparation,
  DEFAULT_COEFFICIENTS,
  defaultParams,
  type Coefficients,
  type Params,
  type SeparationType,
} from '../model/params'
import { normalizePartition, suggestParams, type Partition } from '../model/partition'
import { HORIZON, simulate, type SimInput, type YearResult } from '../model/simulation'

export interface ScenarioState {
  savedId: string | null
  name: string
  notes: string
  mode: 'livre' | 'missao'
  missionId: string | null
  baseline: Baseline
  params: Params
  coef: Coefficients
  seed: number
  decisions: DecisionChoice[]
  currentYear: number
  /** Ano-alvo de um avanço interrompido por carta de decisão */
  targetYear: number
  /** A última divisão escolhida teve os rótulos A/B trocados */
  partitionSwapped?: boolean
}

type Action =
  | { type: 'new'; mode: 'livre' | 'missao'; missionId?: string; separation?: SeparationType }
  | { type: 'params'; patch: Partial<Params> }
  | { type: 'separation'; separation: SeparationType }
  | { type: 'partition'; partition: Partition }
  | { type: 'coef'; patch: Partial<Coefficients> }
  | { type: 'baseline'; baseline: Baseline }
  | { type: 'seed'; seed: number }
  | { type: 'advance'; years: number }
  | { type: 'choose'; choice: DecisionChoice }
  | { type: 'reset' }
  | { type: 'meta'; patch: Partial<Pick<ScenarioState, 'name' | 'notes' | 'savedId'>> }
  | { type: 'load'; state: ScenarioState }

function randomSeed() {
  return Math.floor(Math.random() * 1e9)
}

function initial(): ScenarioState {
  return {
    savedId: null,
    name: 'Novo cenário',
    notes: '',
    mode: 'livre',
    missionId: null,
    baseline: DEFAULT_BASELINE,
    params: defaultParams('intermediaria'),
    coef: DEFAULT_COEFFICIENTS,
    seed: 2023,
    decisions: [],
    currentYear: 0,
    targetYear: 0,
  }
}

function decisionsActive(s: ScenarioState) {
  return s.params.decisionsEnabled
}

/** No laboratório, cada carta é escolhida uma vez e vale para os dois blocos. */
export function pendingCard(nextYear: number, choices: DecisionChoice[]): DecisionCard | undefined {
  return DECISION_CARDS.find((c) => c.year <= nextYear && !choices.some((ch) => ch.cardId === c.id))
}

/** Avança até o alvo, parando antes de um ano que tenha carta pendente. */
function advanceTo(s: ScenarioState, target: number): ScenarioState {
  let year = s.currentYear
  const goal = Math.min(HORIZON, target)
  while (year < goal) {
    if (decisionsActive(s) && pendingCard(year + 1, s.decisions)) break
    year++
  }
  return { ...s, currentYear: year, targetYear: year < goal ? goal : year }
}

function reducer(s: ScenarioState, a: Action): ScenarioState {
  // Mudanças de configuração reiniciam a linha do tempo.
  const restart = (n: ScenarioState): ScenarioState => ({ ...n, currentYear: 0, targetYear: 0, decisions: [] })
  switch (a.type) {
    case 'new': {
      const base = initial()
      return {
        ...base,
        params: defaultParams(a.separation ?? 'intermediaria'),
        seed: randomSeed(),
      }
    }
    case 'params':
      return restart({ ...s, params: { ...s.params, ...a.patch } })
    case 'separation':
      return restart({ ...s, params: applySeparation(s.params, a.separation) })
    case 'partition': {
      // A é sempre o bloco de maior renda per capita; os parâmetros são
      // recalculados para a nova divisão.
      const { partition, swapped } = normalizePartition(s.baseline, a.partition)
      return restart({
        ...s,
        partitionSwapped: swapped,
        params: { ...s.params, partition, ...suggestParams(s.baseline, partition) },
      })
    }
    case 'coef':
      return restart({ ...s, coef: { ...s.coef, ...a.patch } })
    case 'baseline':
      return restart({ ...s, baseline: a.baseline })
    case 'seed':
      return restart({ ...s, seed: a.seed })
    case 'advance':
      return advanceTo(s, s.currentYear + a.years)
    case 'choose': {
      const decisions = [...s.decisions.filter((d) => d.cardId !== a.choice.cardId), a.choice]
      const next = { ...s, decisions }
      return advanceTo(next, Math.max(s.targetYear, s.currentYear + 1))
    }
    case 'reset':
      return { ...s, currentYear: 0, targetYear: 0, decisions: [] }
    case 'meta':
      return { ...s, ...a.patch }
    case 'load':
      return a.state
  }
}

const STORAGE_KEY = 'sdr.current'

function loadState(): ScenarioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ScenarioState
      return {
        ...initial(),
        ...parsed,
        params: { ...defaultParams(), ...parsed.params },
        coef: { ...DEFAULT_COEFFICIENTS, ...parsed.coef },
      }
    }
  } catch {
    // estado inválido ou armazenamento indisponível
  }
  return initial()
}

interface ScenarioContextValue {
  state: ScenarioState
  dispatch: (a: Action) => void
  input: SimInput
  /** Resultados completos até o ano 30 (o painel mostra até currentYear). */
  results: YearResult[]
  /** Resultados até o ano atual */
  visible: YearResult[]
  current: YearResult
  pending: DecisionCard | undefined
}

const ScenarioContext = createContext<ScenarioContextValue | null>(null)

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignorado
    }
  }, [state])

  const input: SimInput = useMemo(
    () => ({
      baseline: state.baseline,
      params: state.params,
      coef: state.coef,
      seed: state.seed,
      decisions: state.decisions,
    }),
    [state.baseline, state.params, state.coef, state.seed, state.decisions],
  )

  const results = useMemo(() => simulate(input, HORIZON), [input])
  const visible = useMemo(() => results.slice(0, state.currentYear + 1), [results, state.currentYear])
  const pending =
    state.currentYear < state.targetYear && decisionsActive(state)
      ? pendingCard(state.currentYear + 1, state.decisions)
      : undefined

  const value: ScenarioContextValue = {
    state,
    dispatch,
    input,
    results,
    visible,
    current: results[state.currentYear],
    pending,
  }
  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>
}

export function useScenario(): ScenarioContextValue {
  const ctx = useContext(ScenarioContext)
  if (!ctx) throw new Error('useScenario fora do ScenarioProvider')
  return ctx
}

export { randomSeed }
