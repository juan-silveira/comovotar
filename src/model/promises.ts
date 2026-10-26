// Promessas de campanha dentro do jogo. Na campanha, o jogador escolhe uma
// promessa: ela rende votos na eleição, e no fim do mandato o eleitor cobra.
// Algumas são viáveis com as escolhas do jogo; outras esbarram no orçamento ou
// na competência do cargo e nunca podem ser cumpridas.

import { fmtBRL, fmtNum } from '../lib/format'
import type { Office } from './bills'
import { FINANCE } from './finance'

export type Feasibility = 'viavel' | 'dificil' | 'impossivel'

/** Escolhas anuais registradas para avaliar promessas. */
export interface ChoiceRecord {
  year: number
  /** voto: votos contra a orientação do partido; oferta: resposta a propostas ilícitas; crise: resposta a crises globais; pressao: “evento:opção” */
  kind: 'orcamento' | 'emendas' | 'voto' | 'oferta' | 'crise' | 'pressao'
  id: string
}

export interface PromiseContext {
  history: ChoiceRecord[]
  /** Anos (t) de leis de autoria do jogador promulgadas */
  ownLaws: number[]
  from: number
  to: number
}

export interface CampaignPromise {
  id: string
  offices: Office[]
  label: string
  description: string
  feasibility: Feasibility
  /** Pontos de aprovação somados na eleição em que é feita */
  voteBonus: number
  /** O que é preciso fazer para cumprir (ou por que não dá) */
  how: string
  fulfilled: (c: PromiseContext) => boolean
}

export const FEASIBILITY_LABELS: Record<Feasibility, string> = {
  viavel: 'Viável',
  dificil: 'Difícil',
  impossivel: 'Impossível',
}

const EXEC: Office[] = ['presidente', 'governador', 'prefeito']
const LEG: Office[] = ['vereador', 'deputado-estadual', 'deputado-federal', 'senador']

const count = (c: PromiseContext, kind: ChoiceRecord['kind'], id: string) =>
  c.history.filter((h) => h.kind === kind && h.id === id && h.year > c.from && h.year <= c.to).length

const bolsa10k = (10000 - FINANCE.bolsaMedio.value) * FINANCE.bolsaFamilias.value * 12
const minimo5k = (5000 - FINANCE.salarioMinimo.value) * FINANCE.custoPorRealMinimo.value
const pctReceita = (v: number) => fmtNum((v / FINANCE.receitaLiquida.value) * 100, 0)

export const CAMPAIGN_PROMISES: CampaignPromise[] = [
  // Executivo ------------------------------------------------------------------------------
  {
    id: 'obras',
    offices: EXEC,
    label: 'Mais obras de infraestrutura',
    description: 'Estradas, saneamento e escolas novas.',
    feasibility: 'viavel',
    voteBonus: 3,
    how: 'Escolher o orçamento de investimento em pelo menos 2 anos do mandato.',
    fulfilled: (c) => count(c, 'orcamento', 'investimento') >= 2,
  },
  {
    id: 'social',
    offices: EXEC,
    label: 'Ampliar programas sociais',
    description: 'Mais famílias atendidas e benefícios maiores.',
    feasibility: 'viavel',
    voteBonus: 4,
    how: 'Escolher o orçamento social em pelo menos 2 anos do mandato.',
    fulfilled: (c) => count(c, 'orcamento', 'social') >= 2,
  },
  {
    id: 'contas',
    offices: EXEC,
    label: 'Colocar as contas em ordem',
    description: 'Cortar desperdícios e reduzir a dívida.',
    feasibility: 'viavel',
    voteBonus: 2,
    how: 'Escolher o orçamento austero em pelo menos 2 anos do mandato.',
    fulfilled: (c) => count(c, 'orcamento', 'austero') >= 2,
  },
  {
    id: 'bolsa-10k',
    offices: ['presidente'],
    label: 'Bolsa Família de R$ 10.000 por família',
    description: 'Acabar com a pobreza de uma vez.',
    feasibility: 'impossivel',
    voteBonus: 9,
    how: `Custaria cerca de ${fmtBRL(bolsa10k)} por ano a mais, ${pctReceita(bolsa10k)}% de toda a receita líquida da União. Nenhum orçamento comporta: seria preciso mais que dobrar os impostos ou imprimir dinheiro, o que geraria inflação.`,
    fulfilled: () => false,
  },
  {
    id: 'servidores-2x',
    offices: ['governador'],
    label: 'Dobrar o salário de todos os servidores estaduais',
    description: 'Valorizar professores, policiais e médicos.',
    feasibility: 'impossivel',
    voteBonus: 8,
    how: 'A folha de pessoal já consome perto do limite da Lei de Responsabilidade Fiscal (60% da receita corrente líquida dos estados). Dobrar os salários estouraria o limite e obrigaria a cortar todo o resto.',
    fulfilled: () => false,
  },
  {
    id: 'iptu-zero',
    offices: ['prefeito'],
    label: 'Zerar o IPTU e dobrar o gasto com saúde',
    description: 'Menos imposto e mais serviço ao mesmo tempo.',
    feasibility: 'impossivel',
    voteBonus: 8,
    how: 'O IPTU é uma das principais receitas próprias do município. Sem ele, a prefeitura perde dinheiro justamente quando promete gastar mais: as duas metades da promessa se anulam.',
    fulfilled: () => false,
  },
  // Legislativo ----------------------------------------------------------------------------
  {
    id: 'lei-propria',
    offices: LEG,
    label: 'Aprovar uma lei de minha autoria',
    description: 'Transformar uma bandeira de campanha em lei.',
    feasibility: 'dificil',
    voteBonus: 2,
    how: 'Ter um projeto seu promulgado durante o mandato. Depende de apoio dos outros partidos.',
    fulfilled: (c) => c.ownLaws.some((y) => y > c.from && y <= c.to),
  },
  {
    id: 'saude-regiao',
    offices: LEG,
    label: 'Levar recursos para a saúde da minha região',
    description: 'Postos, ambulâncias e equipamentos.',
    feasibility: 'viavel',
    voteBonus: 3,
    how: 'Destinar as emendas para saúde e educação em pelo menos 2 anos do mandato.',
    fulfilled: (c) => count(c, 'emendas', 'saude') >= 2,
  },
  {
    id: 'obras-base',
    offices: LEG,
    label: 'Trazer obras para a minha base',
    description: 'Pavimentação, praças e ginásios nas cidades que me elegeram.',
    feasibility: 'viavel',
    voteBonus: 3,
    how: 'Destinar as emendas para obras no reduto em pelo menos 2 anos do mandato.',
    fulfilled: (c) => count(c, 'emendas', 'obra') >= 2,
  },
  {
    id: 'hospital',
    offices: ['vereador'],
    label: 'Construir um hospital na cidade',
    description: 'Atendimento de qualidade perto de casa.',
    feasibility: 'impossivel',
    voteBonus: 7,
    how: 'Vereador não executa obras nem contrata médicos: isso é papel do prefeito (e do estado, no caso de hospitais regionais). O vereador pode propor, cobrar e indicar emendas, mas não construir.',
    fulfilled: () => false,
  },
  {
    id: 'mais-policiais',
    offices: ['deputado-estadual'],
    label: 'Contratar mais policiais',
    description: 'Mais segurança nas ruas.',
    feasibility: 'impossivel',
    voteBonus: 7,
    how: 'Criar cargos e contratar servidores é iniciativa privativa do governador (CF, art. 61, § 1º, por simetria). Um deputado pode cobrar e aprovar o orçamento, mas não contratar.',
    fulfilled: () => false,
  },
  {
    id: 'minimo-5k',
    offices: ['deputado-federal', 'senador'],
    label: 'Salário mínimo de R$ 5.000',
    description: 'Renda digna para quem ganha menos.',
    feasibility: 'impossivel',
    voteBonus: 8,
    how: `Cada R$ 1 a mais no mínimo custa ${fmtBRL(FINANCE.custoPorRealMinimo.value)} por ano à União (aposentadorias, BPC e abono). Chegar a R$ 5.000 custaria ${fmtBRL(minimo5k)} por ano, ${pctReceita(minimo5k)}% da receita líquida, sem contar prefeituras e empresas.`,
    fulfilled: () => false,
  },
]

export function promisesFor(office: Office): CampaignPromise[] {
  return CAMPAIGN_PROMISES.filter((p) => p.offices.includes(office))
}

export function findPromise(id: string): CampaignPromise | undefined {
  return CAMPAIGN_PROMISES.find((p) => p.id === id)
}

/** Promessa feita pelo jogador numa campanha. */
export interface PromiseRecord {
  id: string
  office: Office
  /** Ano (t) da eleição em que foi feita */
  year: number
  /** Ano (t) da cobrança: fim do mandato */
  dueYear: number
  status: 'campanha' | 'pendente' | 'cumprida' | 'quebrada' | 'sem-mandato'
}

/** Aprovação ganha ou perdida quando o eleitor cobra a promessa. */
export function promiseVerdictDelta(p: CampaignPromise, kept: boolean): number {
  if (kept) return 4
  return p.feasibility === 'impossivel' ? -8 : -5
}
