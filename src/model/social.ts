// Indicadores sociais nacionais: "país melhor" não é só PIB. Partem dos
// valores oficiais de 2023 (ano 0 do jogo) e reagem ao crescimento e às
// escolhas sociais. As elasticidades são hipóteses didáticas, não previsões.

import type { CareerState } from './career'
import type { YearResult } from './simulation'

/** Valores de partida (2023) e referências mais recentes. */
export const SOCIAL_BASE = {
  /** Desocupação média de 2023, % (IBGE, PNAD Contínua) */
  unemployment: 7.8,
  /** Pobreza (US$ 6,85/dia PPC), % da população, 2023 (IBGE, SIS 2025) */
  poverty: 27.3,
  /** Extrema pobreza (US$ 2,15/dia PPC), %, 2023 (IBGE, SIS 2025) */
  extremePoverty: 4.4,
  /** Índice de Gini do rendimento domiciliar per capita, 2023 (IBGE) */
  gini: 0.518,
}

export const SOCIAL_LATEST = [
  'Pobreza em 2024: 23,1%; extrema pobreza: 3,5%, os menores da série (IBGE, Síntese de Indicadores Sociais 2025).',
  'Sem os programas sociais, a extrema pobreza de 2024 teria sido de 10% e a pobreza de 28,7% (mesma fonte).',
  'Desemprego de 5,3% no trimestre até agosto de 2026, o menor para o período desde 2012 (IBGE, PNAD Contínua).',
]

export interface SocialYear {
  unemployment: number
  poverty: number
  extremePoverty: number
  gini: number
}

/**
 * Peso das escolhas do jogador em políticas sociais no ano t (efeito nacional).
 * Presidente pesa muito; governador e prefeito, pouco no total do país.
 */
export function socialEffort(career: CareerState, t: number): number {
  let effort = 0
  const scale = career.office === 'presidente' ? 1 : career.office === 'governador' ? 0.12 : 0.02
  for (const h of career.history) {
    if (h.year !== t) continue
    if (h.kind === 'orcamento' && h.id === 'social') effort += scale
    if (h.kind === 'orcamento' && h.id === 'austero') effort -= 0.4 * scale
    if (h.kind === 'crise' && h.id === 'auxilio') effort += 1.5
    if (h.kind === 'crise' && h.id === 'minimizar') effort -= 0.5
  }
  return effort
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Série nacional dos indicadores sociais, do ano 0 até `upTo`. */
export function socialSeries(career: CareerState, results: YearResult[], upTo: number): SocialYear[] {
  const out: SocialYear[] = [
    { unemployment: SOCIAL_BASE.unemployment, poverty: SOCIAL_BASE.poverty, extremePoverty: SOCIAL_BASE.extremePoverty, gini: SOCIAL_BASE.gini },
  ]
  // Trajetória "estrutural" (crescimento e emprego) e apoio social acumulado.
  // Transferências mudam o nível da pobreza enquanto duram; o apoio decai se
  // não for renovado. Manter o gasto mantém o efeito, mas não o multiplica.
  let structural = SOCIAL_BASE.poverty
  let structuralGini = SOCIAL_BASE.gini
  let support = 0
  for (let t = 1; t <= Math.min(upTo, results.length - 1); t++) {
    const r = results[t]
    const w = r.A.gdp / (r.A.gdp + r.B.gdp)
    const g = w * r.A.growth + (1 - w) * r.B.growth
    const prev = out[t - 1]
    support = 0.6 * support + socialEffort(career, t)
    // Lei de Okun: cada ponto de crescimento acima de ~2% reduz o desemprego; há retorno lento ao nível de equilíbrio.
    const unemployment = clamp(prev.unemployment - 0.4 * (g - 2) + 0.08 * (6.5 - prev.unemployment), 3, 20)
    const du = unemployment - prev.unemployment
    structural = clamp(structural - 0.6 * (g - 1.5) + 0.9 * du, 8, 45)
    const poverty = clamp(structural - 1.2 * support, 5, 45)
    const extremePoverty = clamp((SOCIAL_BASE.extremePoverty * structural) / SOCIAL_BASE.poverty - 0.5 * support, 0.5, 15)
    structuralGini = clamp(structuralGini - 0.0006 * (g - 2) + 0.0015 * Math.max(0, du), 0.4, 0.62)
    const gini = clamp(structuralGini - 0.004 * support, 0.4, 0.62)
    out.push({ unemployment, poverty, extremePoverty, gini })
  }
  return out
}
