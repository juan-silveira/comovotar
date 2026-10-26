// Dicas de primeira vez: aparecem só na primeira decisão de cada tipo
// (tutorial jogável), guardadas no navegador.

import type { TurnItem } from '../../model/career'

export const TIPS: Partial<Record<TurnItem['kind'], string>> = {
  card: 'Decisões de governo têm efeito por vários anos. Veja quem decide (você, o Congresso ou o tribunal) e o que cada opção custa.',
  'vote-card': 'Seu partido orienta o voto. Seguir rende capital político; contrariar custa, mas às vezes o mérito vale mais.',
  'ai-bill-vote': 'Projetos de outros autores também passam por você. Repare se o partido vota pelo mérito ou por estratégia.',
  orcamento: 'Só uma pequena parte do orçamento é livre. Investir rende depois; gastar no social ajuda já; cortar protege as contas.',
  emendas: 'Emendas são a parte do orçamento que você indica. Em lugares pequenos fazem diferença; nos grandes, quase não aparecem.',
  promessa: 'Promessas rendem votos agora e cobrança no fim do mandato. Prometer o impossível rende mais votos e mais desgaste.',
  oferta: 'Propostas ilícitas aumentam o seu patrimônio, mas cada uma eleva a chance de investigação. Ninguém é obrigado a aceitar.',
  campanha: 'Dinheiro dá votos, dentro de limites: autofinanciamento até 10% do teto é legal; caixa dois é crime.',
  crise: 'Crises climáticas testam a sua resposta. Minimizar custa caro na aprovação; agir rápido protege a economia local.',
  'crise-global': 'O mundo afeta o Brasil. Gastar amortece a crise, mas aumenta a dívida; esperar protege as contas e cobra na aprovação.',
  pressao: 'Grupos organizados pressionam todo político. Atender um grupo quase sempre desagrada outro.',
  cpi: 'CPIs fiscalizam, mas não condenam: mandam as conclusões ao Ministério Público. Assinar ou não é uma escolha política.',
  impeachment: 'Impeachment é um julgamento jurídico e político. Sem votos no Legislativo, argumentos jurídicos pesam pouco.',
  quiz: 'Perguntas “pode ou não pode?” testam o que o cargo permite. Acertar rende capital político.',
}

const KEY = 'sdr.tips.seen'

export function seenTips(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function markTipSeen(kind: string) {
  try {
    const s = seenTips()
    s.add(kind)
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    // ignorado
  }
}
