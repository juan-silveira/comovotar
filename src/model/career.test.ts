import { describe, expect, it } from 'vitest'
import { DEFAULT_BASELINE } from './baseline'
import { canRunFor, chooseNextOffice, fillAiDecisions, firstElection, newCareer, pendingItems, settleYear, type CareerState } from './career'
import { drawClimate } from './climate'
import { congressPassProbability, institutionsYear, INITIAL_INSTITUTIONS, senateApproval, DEFAULT_INSTITUTIONS_COEFFICIENTS } from './institutions'
import { MISSIONS, missionInput } from './game'
import { simulate } from './simulation'
import { ALL_UFS, type UF } from './states'

const mission = MISSIONS[0]

function play(state: CareerState, years: number): CareerState {
  let s = state
  for (let i = 0; i < years; i++) {
    const input = { ...missionInput(mission, 30, s.decisions), lawEffects: s.lawEffects, ufEffects: s.ufEffects }
    s = fillAiDecisions(s, input)
    s = { ...s, t: s.t + 1, resolved: [] }
    const after = { ...missionInput(mission, 30, s.decisions), lawEffects: s.lawEffects, ufEffects: s.ufEffects }
    s = settleYear(s, after, simulate(after))
    if (s.needsCareerChoice) s = chooseNextOffice(s, null)
  }
  return s
}

describe('carreira', () => {
  it('calendário: municipais em 2028, gerais em 2026, senado em 2030', () => {
    expect(2023 + firstElection('prefeito', 0)!).toBe(2028)
    expect(2023 + firstElection('deputado-federal', 0)!).toBe(2026)
    expect(2023 + firstElection('senador', 0)!).toBe(2030)
    expect(firstElection('ministro-stf', 0)).toBeNull()
  })

  it('o presidente decide as cartas nacionais; o deputado vota nas que dependem do Congresso', () => {
    const input = missionInput(mission, 30, [])
    const results = simulate(input)
    const pres = newCareer({ office: 'presidente', uf: 'SP', municipio: null, party: 'UDC' })
    expect(pendingItems(pres, input, results).some((i) => i.kind === 'card')).toBe(true)
    const dep = newCareer({ office: 'deputado-federal', uf: 'SP', municipio: null, party: 'UDC' })
    expect(pendingItems(dep, input, results).some((i) => i.kind === 'card')).toBe(false)
  })

  it('executivos têm no máximo uma reeleição consecutiva', () => {
    let s = newCareer({ office: 'governador', uf: 'MG', municipio: null, party: 'PMF' })
    s = { ...s, approval: 95 }
    s = play(s, 12)
    const limit = s.log.find((l) => l.title.includes('segundo mandato'))
    expect(limit ?? s.log.find((l) => l.title.startsWith('Derrota'))).toBeTruthy()
  })

  it('após perder, a candidatura vale para a próxima eleição', () => {
    const s = chooseNextOffice({ ...newCareer({ office: 'deputado-federal', uf: 'BA', municipio: null, party: 'MTI' }), t: 3, office: null }, 'governador')
    expect(s.candidacy).toBe('governador')
    expect(s.nextElection).toBe(7) // 2030
  })
})

describe('clima', () => {
  const ufs: Record<'A' | 'B', UF[]> = {
    A: ALL_UFS.filter((u) => ['SE', 'S', 'CO'].includes(DEFAULT_BASELINE.states[u].region)),
    B: ALL_UFS.filter((u) => ['N', 'NE'].includes(DEFAULT_BASELINE.states[u].region)),
  }
  const base = {
    seed: 5,
    frequency: 100,
    trend: 0,
    ufsByBlock: ufs,
    ufGdp: () => 1e11,
    blockGdp: { A: 8e12, B: 2e12 },
    response: { A: 1, B: 1 },
    energyDependent: true,
  }
  it('o preparo alto reduz os danos', () => {
    const low = drawClimate({ ...base, t: 3, preparedness: { A: 'baixo', B: 'baixo' } })
    const high = drawClimate({ ...base, t: 3, preparedness: { A: 'alto', B: 'alto' } })
    expect(high[0].damage).toBeCloseTo(low[0].damage * 0.45, 9)
  })
  it('eventos ocorrem em UFs do próprio bloco', () => {
    for (let t = 1; t < 20; t++)
      for (const e of drawClimate({ ...base, t, preparedness: { A: 'medio', B: 'medio' } })) expect(ufs[e.block]).toContain(e.uf)
  })
})

describe('instituições', () => {
  it('indicação de carreira é quase sempre aprovada; por afinidade depende do apoio', () => {
    expect(senateApproval('carreira', 10)).toBeGreaterThan(0.95)
    expect(senateApproval('alinhado', 20)).toBeLessThan(senateApproval('alinhado', 80))
  })
  it('mais apoio no Congresso aumenta a chance de aprovar propostas; liderança pesa', () => {
    expect(congressPassProbability(70)).toBeGreaterThan(congressPassProbability(30))
    expect(congressPassProbability(50, 'favor')).toBeGreaterThan(congressPassProbability(50, 'contra'))
  })
  it('a bolsa tem retorno real médio positivo com crescimento normal', () => {
    let sum = 0
    for (let seed = 0; seed < 200; seed++) {
      const y = institutionsYear({
        block: 'A', t: 1, seed, cabinet: 'misto', court: 'carreira', approval: 50, emendasTotal: 0.42, growth: 2,
        decisionShock: 0, alternation: false, coef: DEFAULT_INSTITUTIONS_COEFFICIENTS, prev: INITIAL_INSTITUTIONS,
      })
      sum += y.state.marketReturn
    }
    expect(sum / 200).toBeGreaterThan(2)
    expect(sum / 200).toBeLessThan(6)
  })
})

describe('limite de mandatos do Executivo', () => {
  it('dois mandatos seguidos, um fora, e pode voltar', () => {
    let s = newCareer({ office: 'governador', uf: 'MG', municipio: null, party: 'PMF' })
    s = { ...s, approval: 95, partyLoyalty: 100 }
    // Eleições gerais: 2026 (t=3) reeleição; 2030 (t=7) limite.
    s = play({ ...s }, 3)
    expect(s.log.some((l) => l.title === 'Reeleito(a)!')).toBe(true)
    let t = s
    for (let i = 0; i < 4; i++) t = { ...play({ ...t, approval: 95 }, 1) }
    const limit = t.log.find((l) => l.title === 'Fim do segundo mandato consecutivo')
    expect(limit?.year).toBe(7)
    expect(t.termLimited).toEqual([{ office: 'governador', year: 7 }])
    // Logo após o limite, a próxima eleição de governador é em 2034 (t=11): um mandato fora.
    expect(canRunFor(t, 'governador', 7)).toBe(false)
    expect(canRunFor(t, 'governador', 11)).toBe(true)
    const back = chooseNextOffice({ ...t, needsCareerChoice: true }, 'governador')
    expect(back.nextElection).toBe(11)
  })
})
