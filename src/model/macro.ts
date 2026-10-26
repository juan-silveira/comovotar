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
  /** Saldo comercial de 2023: US$ 98,8 bilhões, cerca de 4,5% do PIB (MDIC) */
  tradeBalance: 4.5,
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

/** Efeito direto de eventos sobre o saldo comercial, p.p. do PIB. */
const TRADE_SHOCKS: Record<string, number> = {
  'boom-commodities': 0.8,
  china: -0.5,
  tarifas: -0.4,
  'acordo-ue': 0.3,
  guerra: -0.2,
  pandemia: 0.3,
  'acordo-terceiros': 0.2,
}

export interface MacroYear {
  dollar: number
  inflation: number
  selic: number
  /** Saldo da balança comercial (exportações − importações), % do PIB */
  tradeBalance: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export interface MacroDrivers {
  /** Crescimento nacional do ano, % */
  growth: number
  /** Variação do juro real efetivo da dívida no ano, p.p. (risco) */
  premiumChange: number
  /** Variação da dívida/PIB no ano, p.p. */
  debtChange: number
  newEvents: { id: string }[]
}

/** Um ano de câmbio, inflação e Selic a partir do ano anterior. */
export function stepMacro(prev: MacroYear, d: MacroDrivers): MacroYear {
  const shock = d.newEvents.reduce(
    (acc, e) => ({ dollar: acc.dollar + (SHOCKS[e.id]?.dollar ?? 0), inflation: acc.inflation + (SHOCKS[e.id]?.inflation ?? 0) }),
    { dollar: 0, inflation: 0 },
  )
  // Dólar: diferença de inflação com os EUA (~2,5%), risco fiscal e choques.
  const dollarChange = prev.inflation - 2.5 + 6 * d.premiumChange + 0.8 * d.debtChange + shock.dollar
  const dollar = clamp(prev.dollar * (1 + dollarChange / 100), 2.5, 40)
  // Inflação: ancorada na meta, com inércia, repasse do câmbio e economia aquecida.
  const inflation = clamp(0.45 * prev.inflation + 0.55 * MACRO_BASE.target + 0.15 * dollarChange + 0.25 * (d.growth - 2) + shock.inflation, -1, 25)
  // Banco Central: juro real neutro de ~5% mais reação à inflação acima da meta.
  const selic = clamp(inflation + 5 + 0.8 * (inflation - MACRO_BASE.target), 2, 25)
  // Balança comercial: dólar mais caro estimula exportações e freia importações;
  // economia aquecida importa mais; volta aos poucos para cerca de 3% do PIB.
  const tradeShock = d.newEvents.reduce((acc, e) => acc + (TRADE_SHOCKS[e.id] ?? 0), 0)
  const tradeBalance = clamp(
    (prev.tradeBalance ?? MACRO_BASE.tradeBalance) + 0.25 * (3 - (prev.tradeBalance ?? MACRO_BASE.tradeBalance)) + 0.05 * (dollarChange - inflation) - 0.3 * (d.growth - 2) + tradeShock,
    -6,
    10,
  )
  return { dollar, inflation, selic, tradeBalance }
}

/** Inflação de equilíbrio do modelo sem choques (o crescimento histórico usado como base já embute juros médios). */
export const NEUTRAL_INFLATION = 3.2

/**
 * Desvio do juro real da Selic em relação ao neutro, p.p. (aperto quando
 * positivo), medido a partir do equilíbrio do modelo e limitado.
 */
export function monetaryTightness(m: MacroYear): number {
  return Math.max(-2, Math.min(3, 0.8 * (m.inflation - NEUTRAL_INFLATION)))
}

/** Série de dólar, inflação e Selic do ano 0 até `upTo` (calculada dentro da simulação). */
export function macroSeries(results: YearResult[], upTo: number): MacroYear[] {
  return results.slice(0, Math.min(upTo, results.length - 1) + 1).map((r) => r.macro)
}

/** Perda de aprovação de governantes com inflação acima de 4,5% (teto da meta). */
export function inflationPenalty(inflation: number): number {
  return inflation > 4.5 ? -0.8 * (inflation - 4.5) : 0
}
