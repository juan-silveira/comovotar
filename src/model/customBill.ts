// Propostas criadas pelo jogador. A IA (opcional) ou um formulário guiado
// produzem uma análise estruturada; o jogo valida, limita os números a
// faixas plausíveis e converte para um BillTemplate que passa pela
// tramitação normal.

import { z } from 'zod'
import type { BillArguments, BillTemplate, Level, NormType, Office, Vice } from './bills'
import { CONSTITUTION } from './constitution'
import { SPECTRUM_ORDER } from './legislature'

export const ProposalAnalysisSchema = z.object({
  title: z.string().describe('Título curto da proposta'),
  summary: z.string().describe('Resumo em uma ou duas frases, em linguagem simples'),
  area: z.string().describe('Área temática (ex.: Educação, Saúde, Transporte, Impostos)'),
  competentLevel: z.enum(['federal', 'estadual', 'municipal']).describe('Nível da federação que tem competência para legislar sobre o tema'),
  competenceExplanation: z.string(),
  requiredNorm: z.enum(['lei-ordinaria', 'lei-complementar', 'pec']),
  executiveInitiativeOnly: z.boolean().describe('Verdadeiro se só o chefe do Executivo pode propor (cria cargos, órgãos, aumenta salários de servidores)'),
  initiativeExplanation: z.string(),
  constitutionalIssues: z
    .array(
      z.object({
        kind: z.enum(['iniciativa', 'competencia', 'clausula-petrea', 'material', 'forma']),
        ref: z.string().describe('Identificador da lista de referências fornecida, ou vazio'),
        text: z.string(),
      }),
    )
    .describe('Problemas constitucionais prováveis; lista vazia se não houver'),
  econ: z.number().describe('Posição econômica de -1 (mais Estado) a 1 (mais mercado)'),
  env: z.number().describe('Posição ambiental de -1 (prioriza produção) a 1 (prioriza proteção)'),
  popularity: z.number().describe('Popularidade junto ao eleitorado, de -1 a 1'),
  hurtsPragmatic: z.boolean().describe('Verdadeiro se reduz cargos, emendas ou recursos de políticos'),
  provisions: z.array(z.string()).describe('2 a 4 dispositivos principais do texto'),
  pros: z.array(z.string()).describe('2 a 4 argumentos a favor'),
  cons: z.array(z.string()).describe('2 a 4 argumentos contra'),
  annualCostBRL: z.number().describe('Custo anual estimado para o orçamento, em reais (negativo se gera receita)'),
  costExplanation: z.string().describe('Como o custo foi estimado, com as hipóteses'),
  growthEffectPp: z.number().describe('Efeito anual estimado no crescimento do território, em pontos percentuais (normalmente entre -0,3 e 0,3)'),
  climateDamageChangePct: z.number().describe('Variação nos danos de desastres climáticos, em % (negativo reduz)'),
  approvalEffect: z.number().describe('Efeito na aprovação de quem aprova, de -10 a 10'),
  yearsOfEffect: z.number().describe('Por quantos anos os efeitos duram'),
  partyReactions: z
    .array(
      z.object({
        spectrum: z.enum(SPECTRUM_ORDER as [string, ...string[]]),
        stance: z.enum(['apoia', 'dividido', 'resiste']),
        reason: z.string(),
      }),
    )
    .describe('Reação provável de cada posição do espectro, com o motivo'),
})

export type ProposalAnalysis = z.infer<typeof ProposalAnalysisSchema>

export interface CustomBill {
  id: string
  /** Texto original escrito pelo jogador */
  text: string
  analysis: ProposalAnalysis
  /** Nível em que o jogador propôs */
  level: Level
  /** PIB do território (R$), para converter custo em % */
  territoryGdp: number
  createdBy: 'ia' | 'formulario'
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0)
const trimList = (xs: string[], max: number) => xs.map((x) => x.trim()).filter(Boolean).slice(0, max)

/** Limita números a faixas plausíveis e descarta referências inexistentes. */
export function sanitizeAnalysis(a: ProposalAnalysis): ProposalAnalysis {
  return {
    ...a,
    title: a.title.trim().slice(0, 140) || 'Proposta sem título',
    summary: a.summary.trim().slice(0, 600),
    area: a.area.trim().slice(0, 40) || 'Outros',
    constitutionalIssues: a.constitutionalIssues
      .slice(0, 4)
      .map((i) => ({ ...i, ref: CONSTITUTION[i.ref] ? i.ref : '', text: i.text.trim().slice(0, 300) })),
    econ: clamp(a.econ, -1, 1),
    env: clamp(a.env, -1, 1),
    popularity: clamp(a.popularity, -1, 1),
    provisions: trimList(a.provisions, 4),
    pros: trimList(a.pros, 5),
    cons: trimList(a.cons, 5),
    annualCostBRL: clamp(a.annualCostBRL, -1e12, 2e12),
    growthEffectPp: clamp(a.growthEffectPp, -0.5, 0.5),
    climateDamageChangePct: clamp(a.climateDamageChangePct, -60, 30),
    approvalEffect: clamp(a.approvalEffect, -10, 10),
    yearsOfEffect: Math.round(clamp(a.yearsOfEffect, 1, 30)),
    partyReactions: a.partyReactions.slice(0, 7),
  }
}

export function customBillId(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return `custom-${(h >>> 0).toString(36)}`
}

const COMPETENCE_REF: Record<Level, string> = { federal: 'art22', estadual: 'art24', municipal: 'art30' }
const LEVEL_NAMES: Record<Level, string> = { federal: 'da União', estadual: 'dos estados', municipal: 'dos municípios' }
const EXECUTIVE: Record<Level, Office> = { federal: 'presidente', estadual: 'governador', municipal: 'prefeito' }

/** Converte a proposta num BillTemplate jogável. */
export function toBillTemplate(c: CustomBill): BillTemplate {
  const a = c.analysis
  const vices: Vice[] = a.constitutionalIssues
    .filter((i) => i.kind !== 'iniciativa')
    .map((i) => ({ ref: i.ref || 'art102', kind: i.kind, text: i.text }))
  if (a.competentLevel !== c.level && !vices.some((v) => v.kind === 'competencia')) {
    vices.push({
      ref: COMPETENCE_REF[a.competentLevel],
      kind: 'competencia',
      text: `O tema é de competência ${LEVEL_NAMES[a.competentLevel]}, não ${LEVEL_NAMES[c.level]}. ${a.competenceExplanation}`,
    })
  }
  const pct = c.territoryGdp > 0 ? (a.annualCostBRL / c.territoryGdp) * 100 : 0
  const fiscal = -pct
  const growth = a.growthEffectPp
  const climateFactor = a.climateDamageChangePct !== 0 ? 1 + a.climateDamageChangePct / 100 : undefined
  return {
    id: c.id,
    level: c.level,
    area: a.area,
    title: a.title,
    summary: a.summary,
    requiredNorm: a.requiredNorm as NormType,
    initiative: a.executiveInitiativeOnly ? [EXECUTIVE[c.level]] : 'qualquer',
    initiativeRef: 'art61p1',
    vices,
    position: { econ: a.econ, env: a.env, popularity: a.popularity, antiDemocratic: vices.some((v) => v.kind === 'clausula-petrea') },
    hurtsPragmatic: a.hurtsPragmatic,
    jabutiRisk: 0.3,
    provisions: a.provisions.length ? a.provisions : [a.title],
    effect:
      c.level === 'federal'
        ? {
            national: (side) =>
              side === 'A'
                ? { growthA: growth, fiscalA: fiscal, ...(climateFactor && climateFactor < 1 ? { climatePrepA: 'alto' as const } : {}) }
                : { growthB: growth, fiscalB: fiscal, ...(climateFactor && climateFactor < 1 ? { climatePrepB: 'alto' as const } : {}) },
            approval: a.approvalEffect,
          }
        : {
            localGrowth: growth,
            fiscalCost: pct,
            climateFactor,
            years: a.yearsOfEffect,
            approval: a.approvalEffect,
          },
    refs: [...new Set([COMPETENCE_REF[a.competentLevel], ...a.constitutionalIssues.map((i) => i.ref).filter(Boolean)])],
  }
}

export function customArguments(c: CustomBill): BillArguments {
  return { pros: c.analysis.pros, cons: c.analysis.cons }
}

/** Formulário guiado (modo sem IA): o jogador informa os dados e o jogo monta a análise. */
export interface ManualProposal {
  text: string
  title: string
  area: string
  annualCostBRL: number
  econ: number
  popularity: number
  pros: string
  cons: string
}

export function manualAnalysis(m: ManualProposal, level: Level): ProposalAnalysis {
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)
  return sanitizeAnalysis({
    title: m.title || m.text.slice(0, 80),
    summary: m.text,
    area: m.area,
    competentLevel: level,
    competenceExplanation: 'Informado pelo jogador (sem verificação automática de competência).',
    requiredNorm: 'lei-ordinaria',
    executiveInitiativeOnly: false,
    initiativeExplanation: '',
    constitutionalIssues: [],
    econ: m.econ,
    env: 0,
    popularity: m.popularity,
    hurtsPragmatic: false,
    provisions: [m.title || 'dispositivo principal'],
    pros: lines(m.pros),
    cons: lines(m.cons),
    annualCostBRL: m.annualCostBRL,
    costExplanation: 'Valor informado pelo jogador.',
    growthEffectPp: 0,
    climateDamageChangePct: 0,
    approvalEffect: Math.round(m.popularity * 4),
    yearsOfEffect: 10,
    partyReactions: [],
  })
}
