// "Nem tudo é o que parece": CPIs, impeachment e órgãos de controle.
// Regras simplificadas a partir da Constituição e das leis, em linguagem
// neutra. As probabilidades são hipóteses do jogo.

import type { Office } from './bills'

// CPI ------------------------------------------------------------------------------------------

export const CPI_TOPICS = [
  'contratos emergenciais da saúde',
  'fraudes em aposentadorias e benefícios',
  'apostas esportivas on-line',
  'obras paradas e superfaturadas',
  'o uso de emendas parlamentares',
  'desvios no transporte público',
  'a resposta às enchentes',
]

/** Assinaturas exigidas para criar uma CPI: 1/3 da casa (CF, art. 58, § 3º). */
export function cpiSignatures(office: Office, councilSeats = 21, assembly = 70): { needed: number; house: string } {
  switch (office) {
    case 'senador':
      return { needed: 27, house: 'Senado' }
    case 'deputado-federal':
      return { needed: 171, house: 'Câmara dos Deputados' }
    case 'deputado-estadual':
      return { needed: Math.ceil(assembly / 3), house: 'Assembleia Legislativa' }
    default:
      return { needed: Math.ceil(councilSeats / 3), house: 'Câmara Municipal' }
  }
}

export type CpiChoice = 'assinar' | 'nao-assinar' | 'retirar'

export const CPI_SIGN_OPTIONS: { id: CpiChoice; label: string; pros: string[]; cons: string[]; govOnly?: boolean }[] = [
  {
    id: 'assinar',
    label: 'Assinar o pedido de CPI',
    pros: ['Fiscalizar é papel do Legislativo; eleitores valorizam (+2 de popularidade).'],
    cons: ['Se o seu partido é da base do governo, a liderança vê como traição.'],
  },
  {
    id: 'nao-assinar',
    label: 'Não assinar',
    pros: ['Sem atrito com ninguém.'],
    cons: ['Pode ser cobrado(a) por omissão se a investigação revelar problemas.'],
  },
  {
    id: 'retirar',
    label: 'Trabalhar para que colegas retirem as assinaturas',
    govOnly: true,
    pros: ['O governo agradece: +2 de capital político.'],
    cons: ['Se vazar, a imprensa acusa você de abafar a investigação (−3 de popularidade).'],
  },
]

export type CpiDefense = 'barrar' | 'colaborar' | 'contra-atacar'

export const CPI_DEFENSE_OPTIONS: { id: CpiDefense; label: string; pros: string[]; cons: string[]; cost?: number }[] = [
  {
    id: 'barrar',
    label: 'Usar a base para barrar ou esvaziar a CPI',
    cost: 3,
    pros: ['Grande chance de a CPI não ser instalada ou terminar sem relatório duro.'],
    cons: ['Custa 3 de capital político em cargos e emendas.', 'Passa a imagem de quem tem algo a esconder (−2 de aprovação).'],
  },
  {
    id: 'colaborar',
    label: 'Colaborar e entregar os documentos',
    pros: ['Mostra transparência (+2 de aprovação).'],
    cons: ['Se houver esquemas no seu governo, aumenta muito a chance de virem à tona.'],
  },
  {
    id: 'contra-atacar',
    label: 'Atacar a CPI como perseguição política',
    pros: ['Mobiliza a sua base e domina o noticiário.'],
    cons: ['Divide o eleitorado: o efeito na aprovação depende da sua popularidade.'],
  },
]

// Impeachment ----------------------------------------------------------------------------------

export function impeachmentRules(office: Office): { house: string; judge: string; rule: string; law: string } {
  switch (office) {
    case 'presidente':
      return {
        house: 'Câmara dos Deputados',
        judge: 'Senado Federal',
        rule: 'A Câmara autoriza o processo com 2/3 dos deputados (342 de 513); o Senado julga e afasta com 2/3 dos senadores (54 de 81).',
        law: 'CF, arts. 51, 52 e 85; Lei 1.079/1950.',
      }
    case 'governador':
      return {
        house: 'Assembleia Legislativa',
        judge: 'tribunal misto (deputados estaduais e desembargadores)',
        rule: 'A Assembleia autoriza com 2/3 dos deputados estaduais; um tribunal misto julga.',
        law: 'Lei 1.079/1950, arts. 74 a 79, e Constituição Estadual.',
      }
    default:
      return {
        house: 'Câmara Municipal',
        judge: 'Câmara Municipal',
        rule: 'A Câmara Municipal processa e cassa o prefeito com 2/3 dos vereadores.',
        law: 'Decreto-Lei 201/1967.',
      }
  }
}

export type ImpeachmentChoice = 'centrao' | 'rua' | 'defesa' | 'renunciar'

export const IMPEACHMENT_OPTIONS: { id: ImpeachmentChoice; label: string; pros: string[]; cons: string[]; cost?: number }[] = [
  {
    id: 'centrao',
    label: 'Entregar cargos e emendas a partidos do centro',
    cost: 3,
    pros: ['Compra apoio de quem decide: a chance de afastamento cai bastante.'],
    cons: ['Custa 3 de capital político e dinheiro público (emendas extras).', 'Você governa refém desses partidos.'],
  },
  {
    id: 'rua',
    label: 'Mobilizar apoiadores e a mídia',
    pros: ['Pressão popular pode virar votos (+2 de aprovação).'],
    cons: ['Só funciona se ainda houver apoio popular razoável.'],
  },
  {
    id: 'defesa',
    label: 'Confiar na defesa jurídica',
    pros: ['Sem custo político imediato.'],
    cons: ['O julgamento é político: argumentos jurídicos pesam pouco sem votos.'],
  },
  {
    id: 'renunciar',
    label: 'Renunciar antes do julgamento',
    pros: ['Evita a inabilitação de 8 anos para cargos públicos.'],
    cons: ['Você deixa o cargo imediatamente.'],
  },
]

/** Chance de o governante ser afastado, conforme apoio no Legislativo, aprovação e a reação escolhida. */
export function removalChance(support: number, approval: number, choice: ImpeachmentChoice): number {
  const base = Math.min(0.9, Math.max(0.1, 0.55 + (30 - support) * 0.02 + (25 - approval) * 0.015))
  const factor = choice === 'centrao' ? 0.45 : choice === 'rua' ? (approval >= 25 ? 0.75 : 0.95) : 1
  return base * factor
}

export const INHABILITATION_YEARS = 8

// Órgãos de controle ----------------------------------------------------------------------------

/** Chance de o tribunal de contas suspender obras do orçamento de investimento num ano. */
export const AUDIT_SUSPENSION_CHANCE = 0.2

export function auditBody(office: Office): string {
  return office === 'presidente' ? 'O TCU' : office === 'governador' ? 'O Tribunal de Contas do Estado' : 'O Tribunal de Contas'
}
