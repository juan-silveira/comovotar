import { describe, expect, it } from 'vitest'
import { DEFAULT_FGTS_INPUT, simulateFgts } from './fgts'
import { DEFAULT_INFLATION_INPUT, simulateInflation } from './inflation'

describe('inflação', () => {
  it('com Banco Central crível e sem emissão, fica perto da meta', () => {
    const r = simulateInflation(DEFAULT_INFLATION_INPUT)
    expect(r[10].inflation).toBeGreaterThan(2)
    expect(r[10].inflation).toBeLessThan(5)
  })
  it('financiar gasto imprimindo dinheiro dispara a inflação e corrói o poder de compra', () => {
    const base = simulateInflation(DEFAULT_INFLATION_INPUT)
    const printing = simulateInflation({ ...DEFAULT_INFLATION_INPUT, moneyFinancing: 5, credibility: 0.3, indexation: 0.6 })
    expect(printing[10].inflation).toBeGreaterThan(base[10].inflation * 5)
    expect(printing[10].purchasingPower).toBeLessThan(base[10].purchasingPower / 2)
  })
  it('salário reajustado abaixo da inflação perde poder de compra', () => {
    const r = simulateInflation({ ...DEFAULT_INFLATION_INPUT, moneyFinancing: 3, wageIndexation: 3, indexation: 0 })
    expect(r[10].realWage).toBeLessThan(100)
  })
})

describe('FGTS', () => {
  it('deposita 8% do salário por mês', () => {
    const r = simulateFgts({ ...DEFAULT_FGTS_INPUT, salary: 1000, years: 1, inflation: 0 })
    expect(r[1].deposited).toBeCloseTo(960, 6)
  })
  it('com inflação acima de 3%, a regra antiga perde para a inflação e a do STF empata', () => {
    const r = simulateFgts({ ...DEFAULT_FGTS_INPUT, inflation: 6 })
    const last = r[r.length - 1]
    expect(last.oldRule).toBeLessThan(last.inflationOnly)
    expect(last.ipcaFloor).toBeCloseTo(last.inflationOnly, 0)
    expect(last.alternative).toBeGreaterThan(last.ipcaFloor)
  })
})

describe('jornada', () => {
  it('de 44 para 36 horas, a hora fica cerca de 22% mais cara; produtividade compensa parte', async () => {
    const { workweekImpact } = await import('./pautas')
    const r = workweekImpact({ current: 44, proposed: 36, productivityGain: 0, laborShare: 30 })
    expect(r.hourlyCost).toBeCloseTo(22.2, 1)
    expect(r.unitLaborCost).toBeCloseTo(22.2, 1)
    const p = workweekImpact({ current: 44, proposed: 36, productivityGain: 22.2, laborShare: 30 })
    expect(p.unitLaborCost).toBeCloseTo(0, 0)
  })
})

describe('finanças públicas', () => {
  it('Bolsa Família de R$ 10.000 custaria mais de 15% do PIB por ano: impossível', async () => {
    const { PROMISES, verdict, fundingOptions } = await import('./finance')
    const bolsa = PROMISES.find((p) => p.id === 'bolsa')!
    const cost = bolsa.cost(10000)
    expect(fundingOptions(cost).gdpShare).toBeGreaterThan(15)
    expect(verdict(cost)).toBe('impossivel')
  })
  it('cada R$ 100 no salário mínimo custa cerca de R$ 41 bi por ano', async () => {
    const { PROMISES } = await import('./finance')
    expect(PROMISES.find((p) => p.id === 'minimo')!.cost(1721) / 1e9).toBeCloseTo(41.3, 0)
  })
  it('a dívida fica estável com o superávit primário de equilíbrio', async () => {
    const { DEFAULT_DEBT, simulateDebt, stabilizingPrimary } = await import('./finance')
    const x = { ...DEFAULT_DEBT, primary: stabilizingPrimary(DEFAULT_DEBT) }
    const r = simulateDebt(x)
    expect(r[r.length - 1].debt).toBeCloseTo(x.debt, 6)
  })
  it('previdência: desvincular do mínimo reduz o gasto projetado', async () => {
    const { DEFAULT_PENSION, simulatePension } = await import('./finance')
    const linked = simulatePension(DEFAULT_PENSION)
    const unlinked = simulatePension({ ...DEFAULT_PENSION, linkedToMinWage: false })
    expect(linked[30].spending).toBeGreaterThan(unlinked[30].spending)
    expect(linked[0].spending).toBeCloseTo(8.2, 0)
  })
})

describe('lowerFirst', () => {
  it('preserva siglas e nomes próprios', async () => {
    const { lowerFirst } = await import('../lib/format')
    expect(lowerFirst('Ministro(a) do STF')).toBe('ministro(a) do STF')
    expect(lowerFirst('Presidente da República')).toBe('presidente da República')
    expect(lowerFirst('PEC')).toBe('PEC')
    expect(lowerFirst('PIB cai')).toBe('PIB cai')
  })
})
