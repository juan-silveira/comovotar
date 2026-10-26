// Esquema (zod) da análise de propostas feita pela IA. Fica separado de
// customBill.ts para que a biblioteca de validação só seja carregada quando
// o jogador usa a IA.

import { z } from 'zod'
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
