// Orçamento anual (LOA) e emendas parlamentares dentro do jogo.
//
// O chefe do Executivo envia a proposta de orçamento; o Legislativo vota e,
// se o governo tem pouco apoio, cobra mais emendas ou atrasa a votação. Se a
// economia piora, a Lei de Responsabilidade Fiscal obriga a contingenciar.
// Parlamentares decidem o destino das suas emendas individuais.

import type { Office } from './bills'
import { lowerFirst } from '../lib/format'
import { FINANCE, PIB_2026 } from './finance'

export type BudgetChoice = 'austero' | 'equilibrado' | 'investimento' | 'social'

export interface BudgetOption {
  id: BudgetChoice
  label: string
  description: string
  pros: string[]
  cons: string[]
  /** Saldo primário no ano, % do PIB (só no orçamento federal) */
  fiscal: number
  /** Crescimento no próprio ano, p.p. */
  growthNow: number
  /** Crescimento nos anos seguintes, p.p. por ano */
  growthLater: number
  laterYears: number
  approval: number
}

/** Fração do orçamento que o governo pode mudar de um ano para o outro. */
export const FREE_SHARE: Record<'federal' | 'estadual' | 'municipal', number> = {
  federal: 100 - FINANCE.obrigatoriasShare.value,
  estadual: 10,
  municipal: 12,
}

export const BUDGET_OPTIONS: BudgetOption[] = [
  {
    id: 'austero',
    label: 'Austero: cortar despesas livres',
    description: 'Corta cerca de 15% das despesas não obrigatórias e usa a economia para reduzir a dívida.',
    pros: ['A dívida cresce menos e os juros tendem a cair com o tempo.', 'Sinaliza responsabilidade fiscal aos investidores.'],
    cons: ['Obras param e serviços pioram no curto prazo.', 'A economia cresce menos neste ano e a aprovação cai.'],
    fiscal: 0.3,
    growthNow: -0.12,
    growthLater: 0,
    laterYears: 0,
    approval: -3,
  },
  {
    id: 'equilibrado',
    label: 'Equilibrado: manter o que existe',
    description: 'Repete o orçamento do ano anterior, corrigido pela inflação.',
    pros: ['Sem sustos para o mercado nem para quem depende dos serviços.'],
    cons: ['Não resolve nenhum problema novo: só mantém a máquina funcionando.'],
    fiscal: 0,
    growthNow: 0,
    growthLater: 0,
    laterYears: 0,
    approval: 0,
  },
  {
    id: 'investimento',
    label: 'Investimento: ampliar obras',
    description: 'Amplia em cerca de 15% as despesas livres, concentrando em estradas, saneamento, energia e escolas.',
    pros: ['Infraestrutura aumenta a produtividade por vários anos.', 'Gera empregos na construção.'],
    cons: [
      'O resultado demora: no primeiro ano quase só aparece o custo.',
      'Aumenta o déficit; obras mal planejadas viram “elefantes brancos”.',
    ],
    fiscal: -0.3,
    growthNow: 0.05,
    growthLater: 0.08,
    laterYears: 4,
    approval: 1,
  },
  {
    id: 'social',
    label: 'Social: ampliar programas e transferências',
    description: 'Amplia em cerca de 15% as despesas livres, concentrando em transferência de renda e programas sociais.',
    pros: ['Efeito rápido no consumo das famílias mais pobres.', 'Reduz a pobreza no curto prazo e aumenta a aprovação.'],
    cons: ['O efeito no crescimento some quando o gasto para.', 'Aumenta o déficit; cortar depois é politicamente difícil.'],
    fiscal: -0.3,
    growthNow: 0.1,
    growthLater: 0,
    laterYears: 0,
    approval: 4,
  },
]

export function findBudgetOption(id: string): BudgetOption {
  return BUDGET_OPTIONS.find((o) => o.id === id) ?? BUDGET_OPTIONS[1]
}

export interface BudgetOutcome {
  /** Fração do efeito que sobrevive (contingenciamento e emendas) */
  keep: number
  /** Emendas extras exigidas pelo Legislativo, % do PIB (custo fiscal) */
  extraEmendas: number
  delayed: boolean
  contingency: boolean
  approvalDelta: number
  title: string
  text: string
}

/**
 * Reação do Legislativo e da arrecadação à proposta de orçamento.
 * `support`: apoio ao governo na casa legislativa (0 a 100).
 * `lastGrowth`: crescimento do território no ano que passou.
 */
export function budgetOutcome(option: BudgetOption, support: number, lastGrowth: number, office: Office): BudgetOutcome {
  const house = office === 'presidente' ? 'O Congresso' : office === 'governador' ? 'A Assembleia Legislativa' : 'A Câmara Municipal'
  let keep = 1
  let extraEmendas = 0
  let approvalDelta = 0
  const parts: string[] = []
  const delayed = support < 35
  if (delayed) {
    approvalDelta -= 2
    extraEmendas = 0.1
    parts.push(
      `${house} só votou o orçamento em março, depois de longa negociação: com pouco apoio, o governo teve de aceitar mais emendas dos parlamentares.`,
    )
  } else if (support < 50) {
    extraEmendas = 0.05
    parts.push(`${house} aprovou o orçamento, mas remanejou parte das despesas para emendas dos parlamentares em troca de votos.`)
  } else {
    parts.push(`${house} aprovou o orçamento com poucas mudanças: o governo tem maioria.`)
  }
  const spends = option.fiscal < 0
  const contingency = spends && lastGrowth < 1
  if (contingency) {
    keep = 0.5
    parts.push(
      'Com a economia fraca, a arrecadação veio abaixo do previsto e a Lei de Responsabilidade Fiscal obrigou a contingenciar: metade da ampliação de gastos foi bloqueada.',
    )
  }
  if (option.id === 'austero' && support < 50) {
    keep = 0.7
    parts.push('Parte dos cortes foi derrubada pelos parlamentares, que protegeram programas das suas bases.')
  }
  const title = delayed
    ? 'Orçamento aprovado com atraso'
    : contingency
      ? 'Orçamento aprovado, mas contingenciado'
      : `Orçamento aprovado: ${lowerFirst(option.label.split(':')[0])}`
  return { keep, extraEmendas, delayed, contingency, approvalDelta, title, text: parts.join(' ') }
}

// Emendas individuais -------------------------------------------------------------------------

/** Emendas individuais federais na LOA 2026 (2% da RCL; 1,55% para a Câmara e 0,45% para o Senado, EC 126/2022). */
const INDIVIDUAL_FEDERAL = FINANCE.emendasIndividuais.value

/** Valor anual aproximado das emendas individuais de um parlamentar, R$. */
export function emendaValue(office: Office, opts: { ufGdp?: number; assembly?: number; muniPop?: number; council?: number } = {}): number {
  switch (office) {
    case 'deputado-federal':
      return (INDIVIDUAL_FEDERAL * (1.55 / 2)) / 513
    case 'senador':
      return (INDIVIDUAL_FEDERAL * (0.45 / 2)) / 81
    case 'deputado-estadual':
      // Estimativa ilustrativa: receita do estado ≈ 9% do PIB estadual; emendas ≈ 1% dela.
      return opts.ufGdp && opts.assembly ? (opts.ufGdp * 0.09 * 0.01) / opts.assembly : 0
    case 'vereador':
      // Estimativa ilustrativa: receita ≈ R$ 4.500 por habitante; emendas ≈ 1,2% dela.
      return opts.muniPop && opts.council ? (opts.muniPop * 4500 * 0.012) / opts.council : 0
    default:
      return 0
  }
}

export type EmendaChoice = 'saude' | 'obra' | 'pix' | 'governo'

export interface EmendaOption {
  id: EmendaChoice
  label: string
  description: string
  pros: string[]
  cons: string[]
  approval: number
  capital: number
  /** Crescimento local por ano, em p.p. por ponto percentual do PIB local aplicado */
  multiplier: number
  years: number
  /** Chance de escândalo (falta de rastreabilidade) */
  scandalRisk: number
}

export const EMENDA_OPTIONS: EmendaOption[] = [
  {
    id: 'saude',
    label: 'Saúde e educação onde há mais carência',
    description: 'Equipamentos para postos de saúde, ambulâncias e reforma de escolas nas cidades com piores indicadores.',
    pros: ['Atende quem mais precisa, com resultado duradouro.', 'Fácil de fiscalizar.'],
    cons: ['Pouco visível: o eleitor raramente associa a melhoria a você.'],
    approval: 1,
    capital: 0,
    multiplier: 0.4,
    years: 4,
    scandalRisk: 0,
  },
  {
    id: 'obra',
    label: 'Obra visível no seu reduto eleitoral',
    description: 'Pavimentação, praça ou ginásio nas cidades onde você tem mais votos.',
    pros: ['Muito visível: ajuda na reeleição.'],
    cons: ['Nem sempre é a maior necessidade da região.', 'Obras pequenas e dispersas rendem pouco para a economia.'],
    approval: 3,
    capital: 0,
    multiplier: 0.8,
    years: 1,
    scandalRisk: 0.03,
  },
  {
    id: 'pix',
    label: 'Transferência especial (emenda Pix) a prefeitos aliados',
    description: 'O dinheiro cai direto no caixa da prefeitura, sem projeto definido; o prefeito decide como gastar.',
    pros: ['Chega rápido e fortalece aliados que pedem votos para você.'],
    cons: ['Difícil saber onde o dinheiro foi parar.', 'Risco de escândalo: o STF passou a exigir rastreabilidade.'],
    approval: 2,
    capital: 1,
    multiplier: 0.4,
    years: 1,
    scandalRisk: 0.2,
  },
  {
    id: 'governo',
    label: 'Negociar a liberação com o governo',
    description: 'Você aceita votar com o governo em troca de prioridade no pagamento das suas emendas.',
    pros: ['Ganha capital político para aprovar os seus projetos.'],
    cons: ['Você passa a ser cobrado a votar com o governo.', 'É a prática que críticos chamam de “toma lá, dá cá”.'],
    approval: 0,
    capital: 3,
    multiplier: 0.8,
    years: 1,
    scandalRisk: 0,
  },
]

export function findEmendaOption(id: string): EmendaOption {
  return EMENDA_OPTIONS.find((o) => o.id === id) ?? EMENDA_OPTIONS[0]
}

/** Despesas livres do orçamento federal em 2026, % do PIB (para dar escala às opções). */
export const FEDERAL_FREE_PCT = (FINANCE.discricionarias.value / PIB_2026) * 100

/** Efeito anual da emenda no crescimento local, p.p.: proporcional ao peso da emenda no PIB do território. */
export function emendaGrowth(option: EmendaOption, value: number, territoryGdp: number): number {
  if (territoryGdp <= 0) return 0
  return Math.min(0.5, (value / territoryGdp) * 100 * option.multiplier)
}
