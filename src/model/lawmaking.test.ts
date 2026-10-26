import { describe, expect, it } from 'vitest'
import { chooseBill, startBill, type BillDraft, type LegislativeContext } from './lawmaking'
import { assemblySeats, apportionFederalSeats, composeChamber, councilSeats, FEDERAL_SEATS } from './legislature'
import { DEFAULT_BASELINE } from './baseline'
import { ALL_UFS } from './states'

function federalCtx(over: Partial<LegislativeContext> = {}): LegislativeContext {
  return {
    level: 'federal',
    seed: 42,
    t: 3,
    author: 'deputado-federal',
    authorParty: 'RVS',
    chambers: [composeChamber('camara', 'Câmara dos Deputados', 513, 42), composeChamber('senado', 'Senado Federal', 81, 42)],
    initiatingHouse: 0,
    executiveParty: 'UDC',
    executiveCabinet: 'misto',
    executiveTitle: 'Presidente',
    courtName: 'STF',
    player: { author: false, executive: false, court: false },
    electionPressure: 0,
    ...over,
  }
}

const draft = (templateId: string, over: Partial<BillDraft> = {}): BillDraft => ({
  templateId,
  norm: 'lei-ordinaria',
  urgency: false,
  bargaining: 0,
  ...over,
})

describe('cadeiras', () => {
  it('as bancadas federais somam 513', () => {
    expect(ALL_UFS.reduce((a, u) => a + FEDERAL_SEATS[u], 0)).toBe(513)
  })
  it('regra do art. 27 para as Assembleias', () => {
    expect(assemblySeats(70)).toBe(94) // SP
    expect(assemblySeats(8)).toBe(24)
    expect(assemblySeats(12)).toBe(36)
  })
  it('faixas do art. 29 para as Câmaras Municipais', () => {
    expect(councilSeats(10_000)).toBe(9)
    expect(councilSeats(15_001)).toBe(11)
    expect(councilSeats(11_450_000)).toBe(55)
  })
  it('redistribuição pelo Censo respeita mínimo 8, máximo 70 e total 513', () => {
    const pop = Object.fromEntries(ALL_UFS.map((u) => [u, DEFAULT_BASELINE.states[u].pop])) as Record<(typeof ALL_UFS)[number], number>
    const seats = apportionFederalSeats(pop)
    expect(ALL_UFS.reduce((a, u) => a + seats[u], 0)).toBe(513)
    expect(Math.min(...ALL_UFS.map((u) => seats[u]))).toBe(8)
    expect(seats.SP).toBe(70)
  })
  it('compõe casas com o total exato de cadeiras', () => {
    const c = composeChamber('x', 'X', 94, 1)
    expect(c.parties.reduce((a, p) => a + p.seats, 0)).toBe(94)
  })
})

describe('processo legislativo', () => {
  it('cláusula pétrea é barrada na CCJ', () => {
    const s = startBill(federalCtx(), draft('eleicao-indireta', { norm: 'pec' }))
    expect(s.status).toBe('arquivado')
    expect(s.log.some((l) => l.refs?.includes('art60p4'))).toBe(true)
  })

  it('só o presidente pode editar medida provisória', () => {
    const s = startBill(federalCtx(), draft('isencao-ir', { norm: 'medida-provisoria' }))
    expect(s.status).toBe('arquivado')
    expect(s.log[0].refs).toContain('art62')
  })

  it('PEC é votada em dois turnos em cada casa e não vai à sanção', () => {
    for (let seed = 0; seed < 200; seed++) {
      // Autor da base do governo: sem voto estratégico contra ele.
      const s = startBill(federalCtx({ seed, authorParty: 'UDC' }), draft('teto-emendas', { norm: 'pec', bargaining: 1 }))
      if (s.status === 'lei' || s.status === 'inconstitucional') {
        const turns = s.log.filter((l) => l.stage === 'plenario' || l.stage === 'revisora').filter((l) => l.vote)
        expect(turns.length).toBeGreaterThanOrEqual(4)
        expect(s.log.some((l) => l.stage === 'sancao')).toBe(false)
        return
      }
    }
    throw new Error('nenhuma PEC aprovada em 200 sementes')
  })

  it('pausa para o autor decidir sobre o substitutivo e respeita a escolha', () => {
    for (let seed = 0; seed < 300; seed++) {
      const ctx = federalCtx({ seed, player: { author: true, executive: false, court: false } })
      const s = startBill(ctx, draft('licenciamento'))
      if (s.pending?.kind === 'relator') {
        const after = chooseBill(ctx, s, 'retirar')
        expect(after.status).toBe('arquivado')
        return
      }
    }
    throw new Error('nenhum substitutivo em 300 sementes')
  })

  it('é determinístico', () => {
    const a = startBill(federalCtx({ seed: 9 }), draft('fundo-desastres'))
    const b = startBill(federalCtx({ seed: 9 }), draft('fundo-desastres'))
    expect(a).toEqual(b)
  })

  it('o executivo jogador decide a sanção', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ctx = federalCtx({ seed, player: { author: false, executive: true, court: false } })
      const s = startBill(ctx, draft('fundo-desastres', { bargaining: 1 }))
      if (s.pending?.kind === 'sancao') {
        const after = chooseBill(ctx, s, 'veto-total')
        expect(after.log.some((l) => l.stage === 'veto')).toBe(true)
        return
      }
    }
    throw new Error('nenhum projeto chegou à sanção')
  })
})

describe('espectro político', () => {
  it('propostas contra regras democráticas só têm apoio nos extremos', async () => {
    const { PARTIES, partySupport } = await import('./legislature')
    const ctx = { coalition: new Set<string>(), governmentStance: 0, bargaining: 0, electionPressure: 0 }
    const bill = { econ: 0, popularity: 0, antiDemocratic: true }
    for (const p of PARTIES) {
      const s = partySupport(p, bill, ctx)
      if (p.democracy < 0.5) expect(s).toBeGreaterThan(0.4)
      else expect(s).toBeLessThan(0.3)
    }
  })
  it('há partidos nas sete posições e as cadeiras somam 100%', async () => {
    const { PARTIES, SPECTRUM_ORDER } = await import('./legislature')
    for (const sp of SPECTRUM_ORDER) expect(PARTIES.some((p) => p.spectrum === sp)).toBe(true)
    expect(PARTIES.reduce((a, p) => a + p.share, 0)).toBeCloseTo(1, 9)
  })
})

describe('paródia do Congresso eleito em 2026', () => {
  it('cadeiras somam 513 deputados e 81 senadores', async () => {
    const { PARODY_SEATS } = await import('./legislature')
    expect(Object.values(PARODY_SEATS.camara).reduce((a, b) => a + b, 0)).toBe(513)
    expect(Object.values(PARODY_SEATS.senado).reduce((a, b) => a + b, 0)).toBe(81)
  })
  it('a Câmara nacional usa a composição real e o maior partido tem 121 cadeiras', async () => {
    const { composeChamber, PARODY_SEATS } = await import('./legislature')
    const c = composeChamber('camara-BR-1', 'Câmara', 513, 1, 'parodia-2026', PARODY_SEATS.camara)
    expect(c.parties[0]).toMatchObject({ seats: 121 })
    expect(c.parties[0].party.id).toBe('PLT')
  })
  it('nenhum partido da paródia está nos extremos do espectro', async () => {
    const { PARODY_PARTIES } = await import('./legislature')
    for (const p of PARODY_PARTIES) expect(['extrema-esquerda', 'extrema-direita']).not.toContain(p.spectrum)
  })
})

describe('voto estratégico', () => {
  it('rivais do autor votam contra mesmo concordando com o mérito, mais perto da eleição', async () => {
    const { findParty, partySupportBreakdown, voteReason } = await import('./legislature')
    const party = findParty('ALR')!
    const bill = { econ: 0.7, popularity: 0 }
    const coalition = new Set(['ALR'])
    const base = { coalition, governmentStance: 0, bargaining: 0 }
    const ally = partySupportBreakdown(party, bill, { ...base, electionPressure: 0, authorParty: 'UDC', authorInGovernment: true })
    const rivalCalm = partySupportBreakdown(party, bill, { ...base, electionPressure: 0, authorParty: 'MTI', authorInGovernment: false })
    const rivalElection = partySupportBreakdown(party, bill, { ...base, electionPressure: 1, authorParty: 'MTI', authorInGovernment: false })
    expect(ally.merit).toBeCloseTo(rivalCalm.merit, 9)
    expect(rivalCalm.total).toBeLessThan(ally.total)
    expect(rivalElection.total).toBeLessThan(rivalCalm.total)
    expect(rivalElection.merit).toBeGreaterThan(0.55)
    expect(voteReason(rivalElection)).toBe('estrategia')
  })
})

describe('preço dos votos', () => {
  it('sobe com a aprovação baixa', async () => {
    const { bargainingCost, votePrice } = await import('./lawmaking')
    expect(votePrice(55)).toBe(1)
    expect(votePrice(35)).toBe(1.5)
    expect(votePrice(20)).toBe(2)
    expect(bargainingCost(1, true, 2)).toBe(10)
    expect(bargainingCost(0.5, false)).toBe(2)
  })
})
