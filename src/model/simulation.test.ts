import { describe, expect, it } from 'vitest'
import { aggregateBlock, DEFAULT_BASELINE } from './baseline'
import {
  blockLabel,
  makePartition,
  normalizePartition,
  ORIGINAL_PARTITION,
  partitionByPopulation,
  regionsToUfs,
  suggestParams,
  ufsOf,
} from './partition'
import { electionType } from './politics'
import { drawEvents } from './events'
import { MISSIONS, missionInput, score, weeklyMission, isoWeek } from './game'
import { DEFAULT_COEFFICIENTS, defaultParams, type Coefficients, type Params } from './params'
import { computeYear, HORIZON, setup, simulate, sumComponents, type SimInput } from './simulation'

function zeroInput(): SimInput {
  const params: Params = {
    ...defaultParams('amigavel'),
    transferAtoB: 0,
    reinvestShare: 0,
    tradeExposureA: 0,
    tradeLoss: 0,
    taxMigration: 0,
    energyCostA: 0,
    transitionShock: 0,
    resourceBonusB: 0,
    autonomyGain: 0,
    eventsEnabled: false,
    decisionsEnabled: false,
    politicsEnabled: false,
    institutionsEnabled: false,
    climateEnabled: false,
    migrationPolicyA: 'livre',
    migrationPolicyB: 'livre',
  }
  const coef: Coefficients = { ...DEFAULT_COEFFICIENTS, demographicDragPerPoint: 0, migrationRate: 0 }
  return { baseline: DEFAULT_BASELINE, params, coef, seed: 1, decisions: [] }
}

const baseA = aggregateBlock(DEFAULT_BASELINE, ufsOf(ORIGINAL_PARTITION, 'A'))
const baseB = aggregateBlock(DEFAULT_BASELINE, ufsOf(ORIGINAL_PARTITION, 'B'))

describe('dados de base por UF', () => {
  it('tem 27 UFs e a população do Censo 2022', () => {
    expect(Object.keys(DEFAULT_BASELINE.states)).toHaveLength(27)
    expect(DEFAULT_BASELINE.popBrazil).toBe(203_080_756)
  })

  it('soma 100% de PIB e população entre os blocos', () => {
    expect(baseA.gdpShare + baseB.gdpShare).toBeCloseTo(100, 6)
    expect(baseA.popShare + baseB.popShare).toBeCloseTo(100, 6)
    expect(baseA.gdp + baseB.gdp).toBeCloseTo(DEFAULT_BASELINE.gdpBrazil, -3)
  })

  it('reproduz as participações regionais do IBGE 2023', () => {
    expect(baseA.gdpShare).toBeCloseTo(80.4, 0)
    expect(baseB.popShare).toBeCloseTo(35.4, 0)
  })

  it('preserva o crescimento regional de referência na agregação', () => {
    const ne = aggregateBlock(DEFAULT_BASELINE, regionsToUfs(['NE']))
    const n = aggregateBlock(DEFAULT_BASELINE, regionsToUfs(['N']))
    // Média ponderada pelo PIB fica próxima da taxa regional (2,4% e 3,2%).
    expect(ne.gdpGrowth).toBeCloseTo(2.4, 0)
    expect(n.gdpGrowth).toBeCloseTo(3.2, 0)
  })
})

describe('divisão por UF', () => {
  it('a sugestão de parâmetros reproduz os padrões na divisão original', () => {
    const sug = suggestParams(DEFAULT_BASELINE, ORIGINAL_PARTITION)
    expect(sug.transferAtoB).toBeCloseTo(2.5, 9)
    expect(sug.taxMigration).toBeCloseTo(1, 9)
    expect(sug.tradeExposureA).toBeCloseTo(8, 9)
    expect(sug.energyCostA).toBeCloseTo(0.3, 9)
    expect(sug.resourceBonusB).toBeCloseTo(0.3, 9)
  })

  it('A é sempre o bloco de maior PIB per capita', () => {
    const nordesteComoA = makePartition(regionsToUfs(['NE']))
    const { partition, swapped } = normalizePartition(DEFAULT_BASELINE, nordesteComoA)
    expect(swapped).toBe(true)
    expect(partition.BA).toBe('B')
    expect(partition.SP).toBe('A')
  })

  it('divide por população perto da meta', () => {
    const p = partitionByPopulation(DEFAULT_BASELINE, 50, 'renda')
    const a = aggregateBlock(DEFAULT_BASELINE, ufsOf(p, 'A'))
    expect(a.popShare).toBeGreaterThan(40)
    expect(a.popShare).toBeLessThan(60)
  })

  it('nomeia blocos por região e por UFs avulsas', () => {
    expect(blockLabel(ORIGINAL_PARTITION, 'B')).toBe('N + NE')
    const p = makePartition([...regionsToUfs(['S', 'SE', 'CO']), 'BA'])
    expect(blockLabel(p, 'A')).toBe('CO + SE + S + BA')
    expect(blockLabel(p, 'B')).toBe('N + NE sem BA')
  })
})

describe('simulação', () => {
  it('com todos os efeitos zerados, cada bloco cresce exatamente pela taxa base', () => {
    const r = simulate(zeroInput())
    expect(r).toHaveLength(HORIZON + 1)
    for (let t = 1; t <= HORIZON; t++) {
      expect(r[t].A.growth).toBeCloseTo(baseA.gdpGrowth, 12)
      expect(r[t].B.growth).toBeCloseTo(baseB.gdpGrowth, 12)
      expect(r[t].A.gdp).toBeCloseTo(baseA.gdp * Math.pow(1 + baseA.gdpGrowth / 100, t), -3)
      expect(r[t].A.vsNoSeparation).toBeCloseTo(0, 9)
      expect(r[t].B.vsNoSeparation).toBeCloseTo(0, 9)
    }
  })

  it('o crescimento é a soma dos componentes', () => {
    const r = simulate({ ...zeroInput(), params: { ...defaultParams('conflituosa'), firmPolicyB: 'atrair' } })
    for (const y of r.slice(1)) {
      expect(y.A.growth).toBeCloseTo(sumComponents(y.A.components), 12)
      expect(y.B.growth).toBeCloseTo(sumComponents(y.B.components), 12)
    }
  })

  it('o choque de transição cai pela metade a cada meia-vida', () => {
    const input = zeroInput()
    input.params = { ...input.params, transitionShock: 4, shockHalfLife: 2 }
    const r = simulate(input)
    expect(r[1].A.components.transition).toBeCloseTo(-4, 12)
    expect(r[3].A.components.transition).toBeCloseTo(-2, 12)
    expect(r[5].B.components.transition).toBeCloseTo(-1, 12)
  })

  it('aplica o efeito fiscal de A pela fórmula do enunciado', () => {
    const input = zeroInput()
    input.params = { ...input.params, transferAtoB: 2.5, taxMigration: 1, energyCostA: 0.3, reinvestShare: 30 }
    const r = simulate(input, 1)
    expect(r[1].A.components.fiscal).toBeCloseTo((2.5 - 1 - 0.3) * 0.3 * 0.1, 12)
  })

  it('converte a perda de transferências para a base do PIB de B', () => {
    const input = zeroInput()
    input.params = { ...input.params, transferAtoB: 2.5 }
    const r = simulate(input, 1)
    expect(r[1].detail.transferLossB).toBeCloseTo((2.5 * baseA.gdp) / baseB.gdp, 9)
    expect(r[1].B.components.fiscal).toBeCloseTo(-r[1].detail.transferLossB * 0.15, 9)
  })

  it('a perda de comércio de A cai linearmente até zero no prazo de recuperação', () => {
    const input = zeroInput()
    input.params = { ...input.params, tradeExposureA: 8, tradeLoss: 30 }
    const r = simulate(input)
    expect(r[1].A.components.trade).toBeCloseTo(-8 * 0.3 * 0.3, 12)
    expect(r[6].A.components.trade).toBeCloseTo(-8 * 0.3 * 0.3 * 0.5, 12)
    expect(r[11].A.components.trade).toBeCloseTo(0, 12)
  })

  it('o arrasto demográfico atinge só blocos acima da média de idosos', () => {
    const input = zeroInput()
    input.coef = { ...DEFAULT_COEFFICIENTS, migrationRate: 0 }
    const r = simulate(input, 1)
    expect(r[1].A.components.demography).toBeCloseTo(-Math.max(0, baseA.elderlyShare - 10.9) * 0.05, 12)
    expect(r[1].B.components.demography).toBeCloseTo(0, 12)
  })

  it('é reproduzível com a mesma semente', () => {
    const input: SimInput = { ...zeroInput(), params: { ...defaultParams('intermediaria'), eventProbability: 50 }, seed: 42 }
    expect(simulate(input)).toEqual(simulate(input))
  })

  it('avançar ano a ano dá o mesmo resultado que simular de uma vez', () => {
    const input: SimInput = { ...zeroInput(), params: { ...defaultParams('conflituosa'), eventProbability: 40 }, seed: 7 }
    const full = simulate(input)
    const s = setup(input)
    let prev = s.initial
    for (let t = 1; t <= HORIZON; t++) {
      prev = computeYear(input, s, prev, t)
      expect(prev).toEqual(full[t])
    }
  })

  it('o Brasil unido cresce pela taxa contrafactual', () => {
    const r = simulate(zeroInput())
    expect(r[10].united.gdp).toBeCloseTo(DEFAULT_BASELINE.gdpBrazil * Math.pow(1.022, 10), -3)
  })

  it('divide a dívida no ano 1 conforme a parcela de B', () => {
    const input = zeroInput()
    input.params = { ...input.params, debtShareB: (baseB.gdp / (baseA.gdp + baseB.gdp)) * 100 }
    input.coef = { ...input.coef, realInterestRate: 0, basePrimaryBalance: 0 }
    const r = simulate(input, 1)
    // Divisão proporcional ao PIB: mesma dívida/PIB antes do crescimento do ano.
    expect(r[1].A.debt * (1 + r[1].A.growth / 100)).toBeCloseTo(74.4, 9)
    expect(r[1].B.debt * (1 + r[1].B.growth / 100)).toBeCloseTo(74.4, 9)
  })
})

describe('autonomia após a separação', () => {
  it('sobe linearmente até o valor cheio e não existe sem separação', () => {
    const input = zeroInput()
    input.params = { ...input.params, autonomyGain: 0.4 }
    const r = simulate(input, 10)
    expect(r[4].A.sub.autonomy).toBeCloseTo((0.4 * 4) / 8, 9)
    expect(r[9].B.sub.autonomy).toBeCloseTo(0.4, 9)
    const united = simulate({ ...input, params: { ...input.params, separationYear: null } }, 5)
    expect(united[5].A.sub.autonomy).toBe(0)
  })

  it('é maior com governo técnico e transparente do que com governo político e opaco', () => {
    const base = { ...defaultParams('amigavel'), eventsEnabled: false, climateEnabled: false }
    const run = (o: Partial<Params>) => simulate({ baseline: DEFAULT_BASELINE, params: { ...base, ...o }, coef: DEFAULT_COEFFICIENTS, seed: 1, decisions: [] }, 10)[10].A.sub.autonomy
    const good = run({ cabinetA: 'tecnico', transparency: 'alta' })
    const bad = run({ cabinetA: 'politico', transparency: 'baixa' })
    expect(good).toBeGreaterThan(bad)
    expect(bad).toBeGreaterThanOrEqual(0)
  })

  it('separação amigável com governo médio fica perto do Brasil unido; conflituosa fica bem abaixo', () => {
    const run = (sep: 'amigavel' | 'conflituosa') =>
      simulate({ baseline: DEFAULT_BASELINE, params: { ...defaultParams(sep), eventsEnabled: false, climateEnabled: false, politicsEnabled: false, institutionsEnabled: false }, coef: DEFAULT_COEFFICIENTS, seed: 1, decisions: [] })[HORIZON]
    const friendly = run('amigavel')
    expect(Math.abs(friendly.A.vsNoSeparation)).toBeLessThan(5)
    expect(friendly.B.vsNoSeparation).toBeGreaterThan(-5)
    expect(run('conflituosa').A.vsNoSeparation).toBeLessThan(-20)
  })
})

describe('cartas de decisão', () => {
  it('são ignoradas quando desligadas', () => {
    const input: SimInput = { ...zeroInput(), params: defaultParams('amigavel') }
    const withChoices = { ...input, decisions: [{ cardId: 'fundo-transicao', optionId: 'curto' }] }
    expect(simulate(withChoices)).toEqual(simulate(input))
  })

  it('o fundo de transição reduz a perda de B e a economia de A durante a vigência', () => {
    const params = { ...defaultParams('amigavel'), decisionsEnabled: true, eventsEnabled: false }
    const base: SimInput = { ...zeroInput(), coef: DEFAULT_COEFFICIENTS, params }
    const fund = { ...base, decisions: [{ cardId: 'fundo-transicao', optionId: 'curto' }] }
    const r0 = simulate(base)
    const r1 = simulate(fund)
    expect(r1[1]).toEqual(r0[1])
    expect(r1[2].detail.transitionFund).toBe(1)
    expect(r1[9].detail.transitionFund).toBe(1)
    expect(r1[10].detail.transitionFund).toBe(0)
    expect(r1[2].B.components.fiscal).toBeGreaterThan(r0[2].B.components.fiscal)
    expect(r1[2].A.components.fiscal).toBeLessThan(r0[2].A.components.fiscal)
  })

})

describe('eventos', () => {
  it('não ocorrem com probabilidade zero fora da separação conflituosa', () => {
    for (let t = 1; t <= 30; t++)
      expect(
        drawEvents(9, { t, separation: 'amigavel', probability: 0, debtA: 80, debtB: 80, active: [] }),
      ).toEqual([])
  })

  it('a crise cambial atinge mais o bloco com maior dívida', () => {
    let found = false
    for (let seed = 0; seed < 500 && !found; seed++) {
      const ev = drawEvents(seed, { t: 5, separation: 'amigavel', probability: 100, debtA: 70, debtB: 120, active: [] })
      const crisis = ev.find((e) => e.id === 'crise-cambial')
      if (crisis) {
        found = true
        expect(crisis.effectB).toBeLessThan(crisis.effectA)
      }
    }
    expect(found).toBe(true)
  })
})

describe('modo jogo', () => {
  it('pontuação dá peso igual aos dois blocos', () => {
    const m = MISSIONS[0]
    const r = simulate(missionInput(m, 30, []))
    const s = score(m, r)
    const expected = Math.round(
      1000 * Math.sqrt((1 + r[30].A.vsNoSeparation / 100) * (1 + r[30].B.vsNoSeparation / 100)),
    )
    expect(s.base).toBe(expected)
    expect(s.total).toBe(s.base + s.objectivesMet * 100)
  })

  it('a missão é determinística para as mesmas escolhas', () => {
    const m = MISSIONS[2]
    const dec = [{ cardId: 'divida', optionId: 'fundo' }]
    expect(score(m, simulate(missionInput(m, 50, dec)))).toEqual(score(m, simulate(missionInput(m, 50, dec))))
  })

  it('o desafio semanal muda com a semana e é estável dentro dela', () => {
    expect(isoWeek(new Date(2026, 9, 26))).toBe('2026-W44')
    expect(weeklyMission(new Date(2026, 9, 26)).seed).toBe(weeklyMission(new Date(2026, 9, 28)).seed)
    expect(weeklyMission(new Date(2026, 9, 26)).id).not.toBe(weeklyMission(new Date(2026, 10, 5)).id)
  })
})

describe('migração', () => {
  function migInput(policyA: 'livre' | 'proibir' | 'incentivar', policyB: 'livre' | 'incentivar' = 'livre'): SimInput {
    const input = zeroInput()
    input.params = { ...input.params, migrationPolicyA: policyA, migrationPolicyB: policyB }
    input.coef = DEFAULT_COEFFICIENTS
    return input
  }

  it('flui do bloco de menor renda para o de maior renda', () => {
    const r = simulate(migInput('livre'), 1)
    expect(r[1].A.netMigration).toBeGreaterThan(0)
    expect(r[1].B.netMigration).toBeCloseTo(-r[1].A.netMigration, 6)
    // Calibração: ~0,15% da população de B com a diferença de renda de 2023.
    expect(r[1].A.netMigration / baseB.pop).toBeCloseTo(0.0015, 4)
  })

  it('é zero com a fronteira fechada, que tem custo de fiscalização', () => {
    const r = simulate(migInput('proibir'), 5)
    expect(r[5].A.cumulativeMigration).toBe(0)
    expect(r[5].A.fiscalBalance).toBeCloseTo(-0.05, 9)
  })

  it('incentivos no destino aumentam e programas de retenção na origem reduzem o fluxo', () => {
    const livre = simulate(migInput('livre'), 1)[1].A.netMigration
    expect(simulate(migInput('incentivar'), 1)[1].A.netMigration).toBeCloseTo(livre * 1.5, 0)
    expect(simulate(migInput('livre', 'incentivar'), 1)[1].A.netMigration).toBeCloseTo(livre * 0.8, 0)
  })

  it('migrantes jovens reduzem a proporção de idosos no destino', () => {
    const r = simulate(migInput('livre'), 10)
    expect(r[10].A.elderlyShare).toBeLessThan(baseA.elderlyShare)
    expect(r[10].B.elderlyShare).toBeGreaterThan(baseB.elderlyShare)
  })
})

describe('políticas para empresas', () => {
  it('quem atrai ganha atividade do outro bloco e paga o custo fiscal', () => {
    const input = zeroInput()
    input.params = { ...input.params, firmPolicyB: 'atrair' }
    const r = simulate(input, 1)
    expect(r[1].B.firmFlow).toBeGreaterThan(0)
    expect(r[1].A.firmFlow).toBeCloseTo(-r[1].B.firmFlow, 0)
    expect(r[1].B.components.resources).toBeGreaterThan(0)
    expect(r[1].A.components.resources).toBeLessThan(0)
    expect(r[1].B.fiscalBalance).toBeCloseTo(-0.5, 9)
  })

  it('guerra fiscal: os dois pagam e ninguém atrai do outro', () => {
    const input = zeroInput()
    input.params = { ...input.params, firmPolicyA: 'atrair', firmPolicyB: 'atrair' }
    const r = simulate(input, 1)
    expect(r[1].A.firmFlow).toBe(0)
    expect(r[1].A.fiscalBalance).toBeCloseTo(-0.5, 9)
    expect(r[1].B.fiscalBalance).toBeCloseTo(-0.5, 9)
  })

  it('repelir empresas aumenta a perda de comércio', () => {
    const input = zeroInput()
    input.params = { ...input.params, tradeExposureA: 8, tradeLoss: 30 }
    const base = simulate(input, 1)[1].A.components.trade
    input.params = { ...input.params, firmPolicyA: 'repelir' }
    expect(simulate(input, 1)[1].A.components.trade).toBeCloseTo(base * (40 / 30), 9)
  })
})

describe('política', () => {
  it('segue o calendário eleitoral brasileiro', () => {
    expect(electionType(2024)).toBe('municipal')
    expect(electionType(2026)).toBe('geral')
    expect(electionType(2027)).toBeNull()
    expect(electionType(2030)).toBe('geral')
  })

  it('com valores de 2023 e fora de ano eleitoral não altera o crescimento', () => {
    const input = zeroInput()
    input.params = { ...input.params, politicsEnabled: true }
    const r = simulate(input, 2)
    // 2025 (t=2) não é ano eleitoral: só o desgaste da aprovação muda.
    expect(r[2].A.growth).toBeCloseTo(baseA.gdpGrowth, 9)
    expect(r[2].A.fiscalBalance).toBeCloseTo(0, 9)
  })

  it('ano de eleição geral tem gasto extra e eleição nos dois blocos', () => {
    const input = zeroInput()
    input.params = { ...input.params, politicsEnabled: true }
    const r = simulate(input, 3)
    expect(r[3].year).toBe(2026)
    expect(r[3].A.sub.politics).toBeGreaterThan(0)
    expect(r[3].A.fiscalBalance).toBeLessThan(0)
    expect(r[3].politicalEvents.filter((e) => e.kind === 'eleicao-geral')).toHaveLength(2)
  })

  it('aumentar impostos melhora o saldo e reduz o crescimento', () => {
    const input = zeroInput()
    input.params = { ...input.params, politicsEnabled: true, taxChangeB: 2 }
    const r = simulate(input, 2)
    expect(r[2].B.fiscalBalance).toBeCloseTo(2, 9)
    expect(r[2].B.growth).toBeCloseTo(baseB.gdpGrowth - 0.2, 9)
  })
})

describe('Brasil unido e separação durante o jogo', () => {
  const unido = (): SimInput => ({
    ...zeroInput(),
    coef: DEFAULT_COEFFICIENTS,
    params: { ...defaultParams('conflituosa'), separationYear: null, politicsEnabled: true, institutionsEnabled: true },
  })

  it('sem separação não há choque, perda de comércio nem perda fiscal', () => {
    const r = simulate(unido(), 10)
    for (const y of r.slice(1)) {
      expect(y.A.components.transition).toBe(0)
      expect(y.A.components.trade).toBe(-0)
      expect(y.B.sub.separationFiscal).toBe(-0)
      expect(y.B.sub.naturalResources).toBe(0)
    }
  })

  it('unido, há um só governo e uma só dívida', () => {
    const r = simulate(unido(), 10)
    for (const y of r.slice(1)) {
      expect(y.A.approval).toBe(y.B.approval)
      expect(y.A.debt).toBeCloseTo(y.B.debt, 9)
    }
  })

  it('separação no ano 5: efeitos começam ali e a dívida é dividida', () => {
    const input = unido()
    input.params = { ...input.params, separationYear: 5 }
    const r = simulate(input, 8)
    expect(r[4].A.components.transition).toBe(0)
    expect(r[5].A.components.transition).toBeCloseTo(-8, 9)
    expect(r[4].A.debt).toBeCloseTo(r[4].B.debt, 9)
    expect(r[6].A.debt).not.toBeCloseTo(r[6].B.debt, 3)
  })
})
