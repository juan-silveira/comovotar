// Mini-modelo educativo de inflação. Simplificado de propósito: mostra o
// mecanismo (excesso de demanda e dinheiro novo sem produção correspondente
// elevam preços; juros altos e expectativas ancoradas os contêm), não prevê
// números reais.

export interface InflationInput {
  /** Anos simulados */
  years: number
  /** Gasto do governo financiado com emissão de moeda, % do PIB ao ano */
  moneyFinancing: number
  /** Déficit financiado com dívida (pressiona a demanda), % do PIB */
  debtDeficit: number
  /** Juro real definido pelo Banco Central, % ao ano */
  realRate: number
  /** Meta de inflação, % ao ano */
  target: number
  /** Credibilidade do Banco Central, 0 a 1 (ancora expectativas na meta) */
  credibility: number
  /** Reajuste anual dos salários, % */
  wageIndexation: number
  /** Indexação: salários e preços corrigidos automaticamente pela inflação passada, 0 a 1 */
  indexation: number
}

export const DEFAULT_INFLATION_INPUT: InflationInput = {
  years: 10,
  moneyFinancing: 0,
  debtDeficit: 1,
  realRate: 5,
  target: 3,
  credibility: 0.8,
  wageIndexation: 3,
  indexation: 0.2,
}

export interface InflationYear {
  year: number
  /** Inflação do ano, % */
  inflation: number
  /** Índice de preços (ano 0 = 100) */
  priceIndex: number
  /** Poder de compra de R$ 100 guardados em casa */
  purchasingPower: number
  /** Salário real (ano 0 = 100) com o reajuste informado */
  realWage: number
  /** Expectativa de inflação, % */
  expected: number
}

/**
 * Inflação(t) = expectativa + pressão de demanda + dinheiro novo − efeito dos juros
 * Expectativa = credibilidade × meta + (1 − credibilidade) × inflação passada
 * A indexação faz a inflação passada se repetir (inércia inflacionária).
 */
export function simulateInflation(x: InflationInput): InflationYear[] {
  const out: InflationYear[] = [
    { year: 0, inflation: x.target, priceIndex: 100, purchasingPower: 100, realWage: 100, expected: x.target },
  ]
  let prev = x.target
  let price = 100
  let wage = 100
  for (let t = 1; t <= x.years; t++) {
    const expected = x.credibility * x.target + (1 - x.credibility) * prev
    const inertia = x.indexation * prev
    const demand = 0.5 * x.debtDeficit
    // Dinheiro sem produção correspondente: efeito forte e que se realimenta.
    const money = x.moneyFinancing * (2.5 + 0.15 * prev)
    const rates = 0.6 * (x.realRate - 4)
    const inflation = Math.max(-2, (1 - x.indexation) * expected + inertia + demand + money - rates)
    price *= 1 + inflation / 100
    const wageRaise = Math.max(x.wageIndexation, x.indexation * inflation)
    wage *= (1 + wageRaise / 100) / (1 + inflation / 100)
    out.push({
      year: t,
      inflation,
      priceIndex: price,
      purchasingPower: (100 * 100) / price,
      realWage: wage,
      expected,
    })
    prev = inflation
  }
  return out
}

/** Momentos da história da inflação no Brasil, para contexto. */
export const INFLATION_HISTORY = [
  { year: 1993, ipca: 2477.15, note: 'Antes do Plano Real: preços remarcados quase todo dia.' },
  { year: 1994, ipca: 916.46, note: 'Plano Real (URV em março, real em julho de 1994).' },
  { year: 1995, ipca: 22.41, note: 'Primeiro ano completo do real.' },
  { year: 2002, ipca: 12.53, note: 'Crise de confiança na transição de governo.' },
  { year: 2015, ipca: 10.67, note: 'Recessão com inflação alta.' },
  { year: 2017, ipca: 2.95, note: 'Abaixo do piso da meta pela primeira vez no regime de metas.' },
  { year: 2021, ipca: 10.06, note: 'Pandemia, alta de alimentos e energia.' },
]
