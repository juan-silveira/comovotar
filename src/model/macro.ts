// Câmbio, inflação e juros: um modelo didático, calculado a partir da
// simulação. Partem de 2023 (ano 0) e mostram os canais principais:
// risco fiscal e crises globais mexem no dólar; dólar, economia aquecida e
// choques mexem na inflação; o Banco Central reage com a Selic.

import type { YearResult } from './simulation'

export const MACRO_BASE = {
  /** Dólar médio de 2023, R$ (Banco Central) */
  dollar: 5.0,
  /** IPCA de 2023, % (IBGE) */
  inflation: 4.62,
  /** Selic no fim de 2023, % ao ano (Banco Central) */
  selic: 11.75,
  /** Meta de inflação, % */
  target: 3,
}

/** Choques de câmbio (variação % do dólar) e de inflação (p.p.) por evento no ano em que começa. */
const SHOCKS: Record<string, { dollar: number; inflation: number }> = {
  'crise-financeira': { dollar: 12, inflation: 0.8 },
  'crise-cambial': { dollar: 15, inflation: 1.2 },
  'fuga-capitais': { dollar: 10, inflation: 0.8 },
  guerra: { dollar: 5, inflation: 1.5 },
  tarifas: { dollar: 4, inflation: 0.3 },
  china: { dollar: 3, inflation: 0 },
  pandemia: { dollar: 15, inflation: -1 },
  retomada: { dollar: -5, inflation: 2 },
  'boom-commodities': { dollar: -6, inflation: 0.5 },
  'acordo-ue': { dollar: -2, inflation: -0.2 },
}

export interface MacroYear {
  dollar: number
  inflation: number
  selic: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Série nacional de dólar, inflação e Selic do ano 0 até `upTo`. */
export function macroSeries(results: YearResult[], upTo: number): MacroYear[] {
  const out: MacroYear[] = [{ dollar: MACRO_BASE.dollar, inflation: MACRO_BASE.inflation, selic: MACRO_BASE.selic }]
  for (let t = 1; t <= Math.min(upTo, results.length - 1); t++) {
    const r = results[t]
    const p = results[t - 1]
    const w = r.A.gdp / (r.A.gdp + r.B.gdp)
    const nat = (f: (b: YearResult['A']) => number, y: YearResult) => w * f(y.A) + (1 - w) * f(y.B)
    const g = nat((b) => b.growth, r)
    const premium = nat((b) => b.interestRate, r) - nat((b) => b.interestRate, p)
    const debtChange = nat((b) => b.debt, r) - nat((b) => b.debt, p)
    const prev = out[t - 1]
    const shock = r.newEvents.reduce(
      (acc, e) => ({ dollar: acc.dollar + (SHOCKS[e.id]?.dollar ?? 0), inflation: acc.inflation + (SHOCKS[e.id]?.inflation ?? 0) }),
      { dollar: 0, inflation: 0 },
    )
    // Dólar: diferença de inflação com os EUA (~2,5%), risco fiscal e choques.
    const dollarChange = (prev.inflation - 2.5) + 6 * premium + 0.8 * debtChange + shock.dollar
    const dollar = clamp(prev.dollar * (1 + dollarChange / 100), 2.5, 40)
    // Inflação: ancorada na meta, com inércia, repasse do câmbio e economia aquecida.
    const inflation = clamp(
      0.45 * prev.inflation + 0.55 * MACRO_BASE.target + 0.15 * dollarChange + 0.25 * (g - 2) + shock.inflation,
      -1,
      25,
    )
    // Banco Central: juro real neutro de ~5% mais reação à inflação acima da meta.
    const selic = clamp(inflation + 5 + 0.8 * (inflation - MACRO_BASE.target), 2, 25)
    out.push({ dollar, inflation, selic })
  }
  return out
}

/** Perda de aprovação de governantes com inflação acima de 4,5% (teto da meta). */
export function inflationPenalty(inflation: number): number {
  return inflation > 4.5 ? -0.8 * (inflation - 4.5) : 0
}
