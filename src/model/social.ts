// Indicadores sociais nacionais: "país melhor" não é só PIB. Partem dos
// valores oficiais de 2023 (ano 0 do jogo) e reagem ao crescimento e às
// escolhas sociais. As elasticidades são hipóteses didáticas, não previsões.

import { findBill } from './bills'
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
  /** Mortalidade infantil, por mil nascidos vivos, 2023 (IBGE) */
  infantMortality: 12.5,
  /** Ideb do ensino médio, 2023 (Inep) */
  ideb: 4.3,
  /** Mortes violentas intencionais por 100 mil habitantes, 2023 (Anuário Brasileiro de Segurança Pública) */
  homicides: 22.8,
  /** Desmatamento na Amazônia Legal, km² (Prodes/Inpe, 2023) */
  deforestation: 9064,
}

export const SOCIAL_LATEST = [
  'Pobreza em 2024: 23,1%; extrema pobreza: 3,5%, os menores da série (IBGE, Síntese de Indicadores Sociais 2025).',
  'Sem os programas sociais, a extrema pobreza de 2024 teria sido de 10% e a pobreza de 28,7% (mesma fonte).',
  'Desemprego de 5,3% no trimestre até agosto de 2026, o menor para o período desde 2012 (IBGE, PNAD Contínua).',
  'Desmatamento na Amazônia: 6.288 km² em 2024 e 5.731 km² em 2025 (Prodes/Inpe).',
]

export interface SocialYear {
  unemployment: number
  poverty: number
  extremePoverty: number
  gini: number
  infantMortality: number
  ideb: number
  homicides: number
  deforestation: number
}

/** Peso nacional das escolhas de cada cargo. */
function weight(career: CareerState): number {
  switch (career.office) {
    case 'presidente':
      return 1
    case 'governador':
      return 0.12
    case 'deputado-federal':
    case 'senador':
      return 0.03
    default:
      return 0.02
  }
}

/** Escolhas do ano t que afetam saúde, educação, segurança e meio ambiente (efeito nacional). */
function serviceEffort(career: CareerState, t: number) {
  const w = weight(career)
  let health = 0
  let education = 0
  let security = 0
  let environment = 0
  for (const h of career.history) {
    if (h.year !== t) continue
    if (h.kind === 'orcamento' && h.id === 'social') health += w
    if (h.kind === 'orcamento' && h.id === 'investimento') education += w
    if (h.kind === 'orcamento' && h.id === 'austero') {
      health -= 0.5 * w
      education -= 0.5 * w
    }
    if (h.kind === 'emendas' && h.id === 'saude') {
      health += 0.5 * w
      education += 0.3 * w
    }
    if (h.kind === 'crise' && (h.id === 'auxilio' || h.id === 'saude')) health += 0.8
    if (h.kind === 'crise' && h.id === 'minimizar') health -= 2
    if (h.kind === 'pressao') {
      const [ev, opt] = h.id.split(':')
      if (ev === 'ambientalistas') environment += opt === 'apoiar' ? w : opt === 'equilibrar' ? 0.6 * w : -w
      if (ev === 'fundo-amazonia') environment += opt === 'aceitar' ? 0.8 : -0.3
      if (ev === 'agro' && opt === 'condicionar') environment += 0.3 * w
      if (ev === 'greve' && opt === 'reajuste') education += 0.3 * w
    }
  }
  // Leis de segurança pública de autoria do jogador.
  for (const b of career.bills)
    if (b.authorIsPlayer && b.state.status === 'lei' && b.year + 1 <= t && b.year + 6 > t && findBill(b.state.draft.templateId)?.area === 'Segurança pública') security += 3 * w
  return { health, education, security, environment }
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
    {
      unemployment: SOCIAL_BASE.unemployment,
      poverty: SOCIAL_BASE.poverty,
      extremePoverty: SOCIAL_BASE.extremePoverty,
      gini: SOCIAL_BASE.gini,
      infantMortality: SOCIAL_BASE.infantMortality,
      ideb: SOCIAL_BASE.ideb,
      homicides: SOCIAL_BASE.homicides,
      deforestation: SOCIAL_BASE.deforestation,
    },
  ]
  // Trajetória "estrutural" (crescimento e emprego) e apoio social acumulado.
  // Transferências mudam o nível da pobreza enquanto duram; o apoio decai se
  // não for renovado. Manter o gasto mantém o efeito, mas não o multiplica.
  let structural = SOCIAL_BASE.poverty
  let structuralGini = SOCIAL_BASE.gini
  let support = 0
  let envPolicy = 0
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
    const fx = serviceEffort(career, t)
    // Tendências de longo prazo melhoram devagar; escolhas aceleram ou atrasam.
    const infantMortality = clamp(prev.infantMortality * (1 - 0.015 - 0.02 * fx.health) + 0.1 * Math.max(0, du), 4, 25)
    const ideb = clamp(prev.ideb + 0.03 + 0.04 * fx.education - 0.02 * Math.max(0, -g), 3, 7)
    const homicides = clamp(prev.homicides * (1 - 0.01 - 0.03 * fx.security) + 0.6 * du, 5, 40)
    envPolicy = 0.7 * envPolicy + fx.environment
    const boom = r.activeEvents.some((e) => e.id === 'boom-commodities') ? 0.08 : 0
    const deforestation = clamp(SOCIAL_BASE.deforestation * Math.pow(0.97, t) * (1 - 0.15 * envPolicy) * (1 + boom + 0.02 * (g - 2)), 1500, 25000)
    out.push({ unemployment, poverty, extremePoverty, gini, infantMortality, ideb, homicides, deforestation })
  }
  return out
}
