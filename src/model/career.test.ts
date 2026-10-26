import { describe, expect, it } from 'vitest'
import { DEFAULT_BASELINE } from './baseline'
import { campaignBonus, canRunFor, chooseNextOffice, fillAiDecisions, firstElection, newCareer, pendingItems, resolveItem, settleYear, type CareerState } from './career'
import { budgetOutcome, emendaValue, findBudgetOption } from './budget'
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

describe('orçamento e emendas', () => {
  const input = missionInput(mission, 30, [])
  const results = simulate(input)

  it('o presidente recebe o orçamento a partir do segundo ano; investimento rende nos anos seguintes', () => {
    const pres = { ...newCareer({ office: 'presidente', uf: 'SP', municipio: null, party: 'UDC' }), t: 2 }
    const item = pendingItems(pres, input, results).find((i) => i.kind === 'orcamento')
    expect(item).toBeTruthy()
    const after = resolveItem(pres, { ...item!, kind: 'orcamento', support: 60, lastGrowth: 2 }, 'investimento', input, results)
    const budget = after.lawEffects.filter((l) => l.years !== undefined)
    expect(budget).toHaveLength(2)
    expect(budget[0]).toMatchObject({ fromYear: 3, years: 1 })
    expect(budget[1]).toMatchObject({ fromYear: 4, years: 4 })
    expect(budget[0].effect.fiscalA).toBeLessThan(0)
  })

  it('o efeito do orçamento dura só o período definido', () => {
    const withBudget = { ...input, lawEffects: [{ fromYear: 3, years: 1, effect: { fiscalA: -1 } }] }
    const r = simulate(withBudget, 5)
    expect(r[3].A.fiscalBalance).toBeLessThan(results[3].A.fiscalBalance - 0.9)
    expect(r[4].A.fiscalBalance - results[4].A.fiscalBalance).toBeCloseTo(0, 0)
  })

  it('pouco apoio atrasa o orçamento e economia fraca obriga a contingenciar', () => {
    const social = findBudgetOption('social')
    const weak = budgetOutcome(social, 30, 0.5, 'presidente')
    expect(weak.delayed).toBe(true)
    expect(weak.contingency).toBe(true)
    expect(weak.keep).toBe(0.5)
    expect(weak.text).toContain('Congresso')
    expect(budgetOutcome(social, 60, 2, 'governador').keep).toBe(1)
  })

  it('emendas individuais federais: senador recebe mais que deputado, como na EC 126/2022', () => {
    const dep = emendaValue('deputado-federal')
    const sen = emendaValue('senador')
    expect(dep).toBeGreaterThan(30e6)
    expect(dep).toBeLessThan(60e6)
    expect(sen / dep).toBeCloseTo((0.45 / 81) / (1.55 / 513), 5)
    const deputy = { ...newCareer({ office: 'deputado-federal', uf: 'RR', municipio: null, party: 'UDC' }), t: 1 }
    const item = pendingItems(deputy, input, results).find((i) => i.kind === 'emendas')
    expect(item).toBeTruthy()
    const after = resolveItem(deputy, item!, 'governo', input, results)
    expect(after.capital).toBe(deputy.capital + 3)
    expect(after.ufEffects.at(-1)!.growth).toBeGreaterThan(0)
  })
})

describe('promessas de campanha', () => {
  const input = missionInput(mission, 30, [])
  const results = simulate(input)

  it('no início do jogo o jogador escolhe a promessa do mandato atual', () => {
    const gov = newCareer({ office: 'governador', uf: 'MG', municipio: null, party: 'PMF' })
    const item = pendingItems(gov, input, results).find((i) => i.kind === 'promessa')
    expect(item).toMatchObject({ office: 'governador', initial: true })
    const after = resolveItem(gov, item!, 'obras', input, results)
    expect(after.promises[0]).toMatchObject({ id: 'obras', status: 'pendente', dueYear: gov.nextElection })
  })

  it('promessa cumprida rende aprovação; impossível derruba mais e conta votos na campanha', () => {
    const base = newCareer({ office: 'governador', uf: 'MG', municipio: null, party: 'PMF' })
    const due = base.nextElection!
    const kept = settleYear(
      {
        ...base,
        t: due,
        approval: 50,
        promises: [{ id: 'obras', office: 'governador', year: 0, dueYear: due, status: 'pendente' }],
        history: [
          { year: 1, kind: 'orcamento', id: 'investimento' },
          { year: 2, kind: 'orcamento', id: 'investimento' },
        ],
      },
      input,
      results,
    )
    expect(kept.promises[0].status).toBe('cumprida')
    expect(kept.log.some((l) => l.title.startsWith('Promessa cumprida'))).toBe(true)

    const broken = settleYear(
      { ...base, t: due, approval: 50, promises: [{ id: 'servidores-2x', office: 'governador', year: 0, dueYear: due, status: 'pendente' }] },
      input,
      results,
    )
    expect(broken.promises[0].status).toBe('quebrada')

    const campaign = { ...base, promises: [{ id: 'servidores-2x', office: 'governador' as const, year: 7, dueYear: 11, status: 'campanha' as const }] }
    expect(campaignBonus(campaign, 7)).toBe(8)
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
