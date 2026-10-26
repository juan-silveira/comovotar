// Análise de propostas livres com a IA escolhida pelo jogador.

import type { Level, Office } from '../model/bills'
import { CONSTITUTION } from '../model/constitution'
import {
  customBillId,
  ProposalAnalysisSchema,
  sanitizeAnalysis,
  type CustomBill,
  type ProposalAnalysis,
} from '../model/customBill'
import { ROLES } from '../model/roles'
import { aiChat, aiStructured, type ChatMessage } from './ai'

export interface ProposalContext {
  office: Office
  level: Level
  /** Ex.: "Santa Catarina (SC)" ou "Crato, CE" ou "Brasil" */
  territoryName: string
  territoryPop: number
  /** PIB anual do território, R$ */
  territoryGdp: number
  /** Partido do jogador e posição no espectro */
  party: string
}

const RULES = `Regras de competência (Constituição Federal):
- União (art. 21 e 22): direito penal, civil, trabalhista, eleitoral, trânsito, energia, telecomunicações, moeda, relações exteriores, defesa, imigração, normas gerais de educação.
- Concorrente União e estados (art. 24): tributário, financeiro, orçamento, meio ambiente, educação, saúde (a União fixa normas gerais; o estado complementa).
- Comum aos três níveis (art. 23): saúde, educação, meio ambiente, combate à pobreza, saneamento, moradia.
- Estados (art. 25): o que não for vedado; administram polícias, ensino médio e rede estadual de escolas, hospitais estaduais.
- Municípios (art. 30): interesse local, transporte coletivo, ensino infantil e fundamental, uso do solo, IPTU, ISS.
- Iniciativa privativa do chefe do Executivo (art. 61, § 1º, por simetria nos estados e municípios): criar cargos, órgãos, secretarias, ministérios, aumentar salário de servidores, organização administrativa.
- Cláusulas pétreas (art. 60, § 4º): forma federativa, voto direto, secreto, universal e periódico, separação dos poderes, direitos e garantias individuais.
- Despesas novas exigem estimativa de impacto e fonte de recursos (Lei de Responsabilidade Fiscal).`

function refsList(): string {
  return Object.values(CONSTITUTION)
    .map((r) => `${r.id}: ${r.ref} — ${r.title}`)
    .join('\n')
}

function systemPrompt(ctx: ProposalContext): string {
  const role = ROLES[ctx.office]
  return `Você é o analista legislativo de um jogo educativo e neutro sobre a política brasileira.
O jogador é ${role.title} (${role.body}) em ${ctx.territoryName}, população de ${Math.round(ctx.territoryPop).toLocaleString('pt-BR')} pessoas e PIB anual de cerca de R$ ${(ctx.territoryGdp / 1e9).toFixed(1).replace('.', ',')} bilhões. Partido: ${ctx.party || 'sem partido'}.
Ele escreveu uma proposta em linguagem livre. Analise-a como um consultor legislativo apartidário faria:
- diga qual nível da federação tem competência e se o cargo dele pode propor;
- aponte problemas constitucionais reais (use identificadores da lista de referências quando couber);
- estime o custo anual com hipóteses explícitas e números plausíveis para o território (por exemplo, quantas unidades, preço de cada uma, manutenção);
- liste argumentos a favor e contra que pessoas razoáveis de diferentes campos usariam;
- indique a reação provável de cada posição do espectro político e o motivo, sem caricaturas;
- mantenha linguagem simples, neutra e em português do Brasil. Não tome partido.

${RULES}

Referências disponíveis (use o identificador antes dos dois-pontos):
${refsList()}`
}

export async function analyzeProposal(text: string, ctx: ProposalContext): Promise<CustomBill> {
  const analysis = await aiStructured(systemPrompt(ctx), `Proposta do jogador:\n"""${text}"""`, ProposalAnalysisSchema)
  return {
    id: customBillId(`${ctx.level}:${text}`),
    text,
    analysis: sanitizeAnalysis(analysis),
    level: ctx.level,
    territoryGdp: ctx.territoryGdp,
    createdBy: 'ia',
  }
}

/** Conversa sobre a proposta: estratégia, resistências, como ajustar o texto. */
export async function askAboutProposal(history: ChatMessage[], text: string, a: ProposalAnalysis, ctx: ProposalContext, politicalContext: string) {
  const system = `${systemPrompt(ctx)}

Análise já feita da proposta "${text}":
${JSON.stringify(a)}

Situação política atual no jogo:
${politicalContext}

Responda às perguntas do jogador sobre a proposta: por que cada campo apoia ou resiste, como negociar votos, o que mudar no texto para reduzir resistências ou riscos de inconstitucionalidade, e o que esperar da tramitação. Seja breve, concreto e neutro.`
  return aiChat(history, system)
}
