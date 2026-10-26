// Cartas de decisão nacionais. Cada carta aparece antes do ano indicado e a
// opção escolhida vale daquele ano em diante.
//
// Alcance:
//   'tratado'   – acordo entre os dois blocos; precisa ser ratificado pelos
//                 dois Congressos quando needsCongress = true.
//   'domestico' – cada bloco decide por si (o efeito é aplicado ao lado que decide).
//   'A'         – só faz sentido para o Bloco A.
// A primeira opção de cada carta é o "status quo".

import type { Cabinet, CourtNomination } from './institutions'
import type { Preparedness } from './climate'
import type { FirmPolicy, MigrationPolicy, SeparationType } from './params'
import type { Transparency } from './politics'

export type Side = 'A' | 'B'

export interface DecisionEffect {
  /** Substitui a parcela da dívida assumida por B (%) */
  debtShareB?: number
  /** Soma ao prêmio de risco (p.p.) dos dois blocos */
  riskPremiumDelta?: number
  /** Fundo de transição pago por A a B: % do PIB de A durante N anos */
  transitionFund?: { pctOfA: number; years: number }
  /** Multiplica o custo de energia de A */
  energyCostMult?: number
  /** Soma ao bônus de recursos de B (p.p.) */
  resourceBonusBDelta?: number
  /** Multiplica a perda de comércio remanescente */
  tradeLossMult?: number
  /** Multiplica o prazo de recuperação comercial */
  tradeRecoveryMult?: number
  /** Substitui a parcela reinvestida por A (%) */
  reinvestShare?: number
  migrationPolicyA?: MigrationPolicy
  migrationPolicyB?: MigrationPolicy
  firmPolicyA?: FirmPolicy
  firmPolicyB?: FirmPolicy
  cabinetA?: Cabinet
  cabinetB?: Cabinet
  courtA?: CourtNomination
  courtB?: CourtNomination
  climatePrepA?: Preparedness
  climatePrepB?: Preparedness
  transparencyA?: Transparency
  transparencyB?: Transparency
  /** Multiplica os fundos eleitoral e partidário */
  politicalFundsMult?: number
  /** Teto para emendas, % do PIB */
  emendasCapA?: number
  emendasCapB?: number
  /** Crescimento adicional por ano, p.p. (leis aprovadas) */
  growthA?: number
  growthB?: number
  /** Efeito no saldo primário, % do PIB por ano (leis aprovadas) */
  fiscalA?: number
  fiscalB?: number
  /** Reação da bolsa no ano da decisão, % */
  marketA?: number
  marketB?: number
}

/** Contexto usado para calcular o efeito de uma opção. */
export interface DecisionContext {
  separation: SeparationType
  /** Participação de B no PIB e na população nacionais (%) */
  gdpShareB: number
  popShareB: number
  /** Lado que decide (cartas domésticas) */
  side: Side
}

export interface DecisionOption {
  id: string
  label: string
  description: string
  effect: DecisionEffect | ((ctx: DecisionContext) => DecisionEffect)
}

export type CardScope = 'tratado' | 'domestico' | 'A'

export interface DecisionCard {
  id: string
  /** Ano a partir do qual a decisão vale (a carta aparece antes de simulá-lo) */
  year: number
  title: string
  context: string
  scope: CardScope
  /** Quem decide, em linguagem simples */
  decider: string
  /** Fundamento constitucional ou legal */
  legalBasis: string
  /** Depende de aprovação do Congresso (lei, emenda ou ratificação) */
  needsCongress: boolean
  options: DecisionOption[]
}

export interface DecisionChoice {
  cardId: string
  optionId: string
  /** Lado que decidiu (cartas domésticas). Ausente = vale para os dois. */
  side?: Side
}

/** Monta um efeito para o lado que decide. */
function forSide(ctx: DecisionContext, a: DecisionEffect, b: DecisionEffect): DecisionEffect {
  return ctx.side === 'A' ? a : b
}

export const DECISION_CARDS: DecisionCard[] = [
  {
    id: 'ministerio',
    year: 1,
    scope: 'domestico',
    title: 'Composição do ministério',
    decider: 'Presidente',
    legalBasis: 'Constituição, art. 84, I: o presidente nomeia e exonera ministros livremente.',
    needsCongress: false,
    context:
      'O novo governo precisa montar o ministério. A escolha entre perfis técnicos e indicações de partidos aliados afeta a eficiência das políticas e o apoio no Congresso.',
    options: [
      {
        id: 'misto',
        label: 'Ministério misto',
        description: 'Economia e áreas técnicas com especialistas; articulação política com aliados.',
        effect: (ctx) => forSide(ctx, { cabinetA: 'misto' }, { cabinetB: 'misto' }),
      },
      {
        id: 'tecnico',
        label: 'Ministério técnico',
        description: 'Mais eficiência e juros menores; menos cargos para aliados e menos apoio no Congresso.',
        effect: (ctx) =>
          forSide(ctx, { cabinetA: 'tecnico', marketA: 4 }, { cabinetB: 'tecnico', marketB: 4 }),
      },
      {
        id: 'politico',
        label: 'Ministério político',
        description: 'Mais apoio no Congresso; políticas menos eficientes e juros um pouco maiores.',
        effect: (ctx) =>
          forSide(ctx, { cabinetA: 'politico', marketA: -3 }, { cabinetB: 'politico', marketB: -3 }),
      },
    ],
  },
  {
    id: 'divida',
    year: 1,
    scope: 'tratado',
    title: 'Tratado da dívida pública',
    decider: 'Presidentes negociam; os dois Congressos ratificam',
    legalBasis: 'Constituição, art. 49, I e art. 84, VIII: tratados assinados pelo presidente dependem do Congresso.',
    needsCongress: true,
    context:
      'A dívida federal precisa ser dividida entre os dois novos países. A regra escolhida define quanto cada bloco deve em relação ao próprio PIB.',
    options: [
      {
        id: 'pib',
        label: 'Proporcional ao PIB',
        description: 'Cada bloco assume a sua participação no PIB. Dívida/PIB igual nos dois blocos.',
        effect: (ctx) => ({ debtShareB: ctx.gdpShareB }),
      },
      {
        id: 'populacao',
        label: 'Proporcional à população',
        description:
          'Cada bloco assume a sua participação na população. Como B tem renda per capita menor, alivia A e pesa sobre a dívida/PIB de B.',
        effect: (ctx) => ({ debtShareB: ctx.popShareB, marketA: 3, marketB: -5 }),
      },
      {
        id: 'fundo',
        label: 'Fundo comum de amortização',
        description:
          'Divisão pelo PIB, administrada por um fundo conjunto com garantias cruzadas. Reduz o prêmio de risco em 0,5 p.p. (0,25 p.p. numa separação conflituosa).',
        effect: (ctx) => ({
          debtShareB: ctx.gdpShareB,
          riskPremiumDelta: ctx.separation === 'conflituosa' ? -0.25 : -0.5,
          marketA: 3,
          marketB: 3,
        }),
      },
    ],
  },
  {
    id: 'fundo-transicao',
    year: 2,
    scope: 'tratado',
    title: 'Fundo de transição',
    decider: 'Presidentes negociam; os dois Congressos ratificam',
    legalBasis: 'Transferência entre países depende de tratado e de autorização orçamentária (art. 165 e art. 49, I).',
    needsCongress: true,
    context:
      'B perde de uma vez as transferências federais. Um fundo temporário pago por A suavizaria o ajuste de B, ao custo de parte da economia fiscal de A.',
    options: [
      { id: 'nenhum', label: 'Sem fundo', description: 'Cada bloco arca com o próprio ajuste.', effect: {} },
      {
        id: 'curto',
        label: 'Fundo de 1% por 8 anos',
        description: 'A transfere 1% do seu PIB a B durante 8 anos.',
        effect: { transitionFund: { pctOfA: 1, years: 8 }, marketA: -1, marketB: 3 },
      },
      {
        id: 'longo',
        label: 'Fundo de 0,5% por 15 anos',
        description: 'A transfere 0,5% do seu PIB a B durante 15 anos.',
        effect: { transitionFund: { pctOfA: 0.5, years: 15 }, marketA: -0.5, marketB: 2 },
      },
    ],
  },
  {
    id: 'clima',
    year: 2,
    scope: 'domestico',
    title: 'Plano nacional de prevenção a desastres',
    decider: 'Presidente propõe; Congresso aprova no orçamento',
    legalBasis: 'Constituição, art. 21, XVIII (defesa permanente contra calamidades) e Lei 12.608/2012 (Política Nacional de Proteção e Defesa Civil).',
    needsCongress: true,
    context:
      'Secas, enchentes e queimadas estão mais frequentes. O governo decide quanto investir em alertas, drenagem, reservatórios, brigadas e redundância elétrica.',
    options: [
      {
        id: 'medio',
        label: 'Manter o nível atual',
        description: 'Custa 0,15% do PIB ao ano e reduz os danos em 30%.',
        effect: (ctx) => forSide(ctx, { climatePrepA: 'medio' }, { climatePrepB: 'medio' }),
      },
      {
        id: 'alto',
        label: 'Plano de adaptação',
        description: 'Custa 0,35% do PIB ao ano e reduz os danos em 55%.',
        effect: (ctx) => forSide(ctx, { climatePrepA: 'alto' }, { climatePrepB: 'alto' }),
      },
      {
        id: 'baixo',
        label: 'Cortar a prevenção',
        description: 'Economiza 0,1% do PIB ao ano, mas os danos ficam integrais.',
        effect: (ctx) => forSide(ctx, { climatePrepA: 'baixo' }, { climatePrepB: 'baixo' }),
      },
    ],
  },
  {
    id: 'energia',
    year: 3,
    scope: 'tratado',
    title: 'Contrato de energia',
    decider: 'Governos negociam; agências reguladoras supervisionam',
    legalBasis: 'Contratos de suprimento entre países seguem tratados (art. 49, I) e a regulação setorial.',
    needsCongress: false,
    context:
      'Boa parte da energia consumida em A é gerada em B. O formato do contrato define o custo para A, a receita para B e o risco de falta de energia em secas.',
    options: [
      { id: 'spot', label: 'Mercado de curto prazo', description: 'Preços livres, sem contrato.', effect: {} },
      {
        id: 'longo-prazo',
        label: 'Contrato de 20 anos',
        description:
          'Reduz pela metade o custo extra de energia de A, dá a B receita estável (+0,1 p.p. ao ano) e prioriza o abastecimento em secas.',
        effect: { energyCostMult: 0.5, resourceBonusBDelta: 0.1, marketA: 2, marketB: 2 },
      },
    ],
  },
  {
    id: 'stf',
    year: 3,
    scope: 'domestico',
    title: 'Critério para indicações ao tribunal constitucional',
    decider: 'Presidente indica; Senado aprova por maioria absoluta',
    legalBasis: 'Constituição, art. 101: ministros escolhidos entre cidadãos de notável saber jurídico e reputação ilibada.',
    needsCongress: false,
    context:
      'Cada novo país forma o seu tribunal constitucional com 11 ministros, e vagas abrem ao longo dos anos. O governo define o critério para as indicações.',
    options: [
      {
        id: 'carreira',
        label: 'Juristas de carreira',
        description: 'Aprovação quase certa no Senado e mais previsibilidade das decisões.',
        effect: (ctx) => forSide(ctx, { courtA: 'carreira' }, { courtB: 'carreira' }),
      },
      {
        id: 'alinhado',
        label: 'Afinidade com o governo',
        description:
          'Constitucional, mas com risco de rejeição no Senado e de as decisões passarem a ser vistas como dependentes da composição do tribunal.',
        effect: (ctx) => forSide(ctx, { courtA: 'alinhado', marketA: -2 }, { courtB: 'alinhado', marketB: -2 }),
      },
    ],
  },
  {
    id: 'empresas',
    year: 4,
    scope: 'domestico',
    title: 'Política para empresas',
    decider: 'Presidente propõe; Congresso aprova a lei tributária',
    legalBasis: 'Constituição, art. 150, I: tributo só pode ser criado ou aumentado por lei; incentivos dependem de lei específica (art. 150, § 6º).',
    needsCongress: true,
    context:
      'Empresas com operações nos dois blocos reavaliam onde manter fábricas e sedes. O governo pode oferecer incentivos, ficar neutro ou sobretaxar empresas do outro bloco.',
    options: [
      {
        id: 'neutra',
        label: 'Neutralidade',
        description: 'Tratamento igual a empresas de qualquer origem.',
        effect: (ctx) => forSide(ctx, { firmPolicyA: 'neutra' }, { firmPolicyB: 'neutra' }),
      },
      {
        id: 'atrair',
        label: 'Incentivos para atrair empresas',
        description: 'Renúncia de 0,5% do PIB ao ano; atrai atividade do outro bloco se ele não fizer o mesmo.',
        effect: (ctx) =>
          forSide(ctx, { firmPolicyA: 'atrair', marketA: 3 }, { firmPolicyB: 'atrair', marketB: 3 }),
      },
      {
        id: 'repelir',
        label: 'Sobretaxar empresas do outro bloco',
        description: 'Receita no curto prazo; menos comércio e investimento.',
        effect: (ctx) =>
          forSide(ctx, { firmPolicyA: 'repelir', marketA: -5, marketB: -2 }, { firmPolicyB: 'repelir', marketB: -5, marketA: -2 }),
      },
    ],
  },
  {
    id: 'comercio',
    year: 5,
    scope: 'tratado',
    title: 'Política comercial',
    decider: 'Presidentes negociam; os dois Congressos ratificam',
    legalBasis: 'Acordos comerciais são tratados (art. 49, I e art. 84, VIII).',
    needsCongress: true,
    context:
      'Cinco anos após a separação, o comércio entre os blocos ainda está abaixo do nível anterior. É possível negociar ou buscar outros parceiros.',
    options: [
      { id: 'manter', label: 'Manter as regras', description: 'Nada muda.', effect: {} },
      {
        id: 'livre-comercio',
        label: 'Acordo de livre comércio',
        description:
          'Reduz a perda de comércio remanescente pela metade (30% numa separação conflituosa, em que a confiança é menor).',
        effect: (ctx) => ({ tradeLossMult: ctx.separation === 'conflituosa' ? 0.7 : 0.5, marketA: 5, marketB: 5 }),
      },
      {
        id: 'diversificar',
        label: 'Diversificar parceiros',
        description: 'Os dois blocos aceleram a busca por mercados terceiros: recuperação comercial 40% mais rápida.',
        effect: { tradeRecoveryMult: 0.6, marketA: 2, marketB: 2 },
      },
    ],
  },
  {
    id: 'reforma-politica',
    year: 6,
    scope: 'domestico',
    title: 'Reforma política',
    decider: 'Congresso, por emenda constitucional (3/5 em dois turnos nas duas casas)',
    legalBasis: 'Constituição, art. 60: emendas exigem 3/5 dos votos em dois turnos na Câmara e no Senado.',
    needsCongress: true,
    context:
      'O Congresso discute regras para o gasto político: transparência das emendas e dos gastos sob sigilo, tamanho dos fundos eleitoral e partidário e limites às emendas.',
    options: [
      { id: 'manter', label: 'Manter as regras', description: 'Nada muda.', effect: {} },
      {
        id: 'transparencia',
        label: 'Transparência total',
        description:
          'Emendas rastreáveis e fim dos sigilos sobre gastos corporativos. Gasto mais eficiente, menos escândalos e juros um pouco menores.',
        effect: (ctx) =>
          forSide(ctx, { transparencyA: 'alta', marketA: 3 }, { transparencyB: 'alta', marketB: 3 }),
      },
      {
        id: 'fundos',
        label: 'Cortar fundos pela metade',
        description: 'Reduz à metade os fundos eleitoral e partidário. Economia fiscal pequena, mas visível para o eleitor.',
        effect: { politicalFundsMult: 0.5 },
      },
      {
        id: 'teto-emendas',
        label: 'Teto para emendas',
        description:
          'Limita as emendas a 0,25% do PIB, inclusive as usadas para formar maioria. Melhora o saldo fiscal, mas dificulta a governabilidade de governos impopulares.',
        effect: (ctx) => forSide(ctx, { emendasCapA: 0.25, marketA: 2 }, { emendasCapB: 0.25, marketB: 2 }),
      },
    ],
  },
  {
    id: 'uso-economia',
    year: 10,
    scope: 'A',
    title: 'Destino da economia fiscal de A',
    decider: 'Presidente de A propõe; Congresso de A aprova no orçamento',
    legalBasis: 'Constituição, art. 165 e 166: o orçamento é proposto pelo Executivo e votado pelo Congresso.',
    needsCongress: true,
    context: 'O governo de A revisa o que faz com a receita que antes financiava transferências para B.',
    options: [
      { id: 'manter', label: 'Manter a política', description: 'Mantém a parcela reinvestida atual.', effect: {} },
      {
        id: 'infraestrutura',
        label: 'Plano de infraestrutura',
        description: 'Eleva a parcela reinvestida para 70%. Mais crescimento, menos melhora no saldo fiscal.',
        effect: { reinvestShare: 70, marketA: 2 },
      },
      {
        id: 'divida',
        label: 'Abater dívida',
        description: 'Reduz a parcela reinvestida para 10%. Menos crescimento, saldo fiscal maior.',
        effect: { reinvestShare: 10, marketA: 3 },
      },
    ],
  },
  {
    id: 'mobilidade',
    year: 15,
    scope: 'domestico',
    title: 'Política migratória',
    decider: 'Presidente propõe; Congresso aprova a lei de migração',
    legalBasis: 'Constituição, art. 22, XV: compete à União legislar sobre emigração, imigração e entrada de estrangeiros.',
    needsCongress: true,
    context:
      'A diferença de renda entre os blocos estimula a migração. Migrantes jovens elevam a produção no destino e reduzem o envelhecimento relativo, mas a origem perde trabalhadores.',
    options: [
      { id: 'manter', label: 'Manter as regras atuais', description: 'Nada muda.', effect: {} },
      {
        id: 'livre',
        label: 'Fronteira livre',
        description: 'Entrada livre de trabalhadores do outro bloco.',
        effect: (ctx) => forSide(ctx, { migrationPolicyA: 'livre' }, { migrationPolicyB: 'livre' }),
      },
      {
        id: 'incentivar',
        label: 'Atrair e reter trabalhadores',
        description: 'Programas de moradia, qualificação e validação de diplomas. Custa 0,1% do PIB ao ano.',
        effect: (ctx) => forSide(ctx, { migrationPolicyA: 'incentivar' }, { migrationPolicyB: 'incentivar' }),
      },
      {
        id: 'restringir',
        label: 'Vistos com cotas',
        description: 'Entrada limitada a 30% do fluxo livre.',
        effect: (ctx) => forSide(ctx, { migrationPolicyA: 'restringir' }, { migrationPolicyB: 'restringir' }),
      },
      {
        id: 'proibir',
        label: 'Fechar a fronteira',
        description: 'Nenhuma entrada de trabalhadores do outro bloco; fiscalização custa 0,05% do PIB ao ano.',
        effect: (ctx) =>
          forSide(ctx, { migrationPolicyA: 'proibir', marketA: -2 }, { migrationPolicyB: 'proibir', marketB: -2 }),
      },
    ],
  },
]

export function resolveEffect(option: DecisionOption, ctx: DecisionContext): DecisionEffect {
  return typeof option.effect === 'function' ? option.effect(ctx) : option.effect
}

/**
 * Ano (t) em que uma carta aparece. Cartas de tratado e exclusivas de A só
 * existem depois da separação e contam a partir dela; cartas domésticas
 * seguem o calendário absoluto. Retorna null se a carta não se aplica.
 */
export function cardYear(card: DecisionCard, separationYear: number | null): number | null {
  if (card.scope === 'domestico') return card.year
  return separationYear === null ? null : separationYear + card.year - 1
}

/** Lados que decidem uma carta: unido, só o governo nacional (lado A) decide. */
export function cardSidesAt(card: DecisionCard, separated: boolean): (Side | undefined)[] {
  if (!separated) return card.scope === 'domestico' ? ['A'] : []
  return cardSides(card)
}

export function findCard(cardId: string): DecisionCard | undefined {
  return DECISION_CARDS.find((c) => c.id === cardId)
}

export function findOption(cardId: string, optionId: string): DecisionOption | undefined {
  return findCard(cardId)?.options.find((o) => o.id === optionId)
}

/** Lados em que uma carta precisa de escolha. */
export function cardSides(card: DecisionCard): (Side | undefined)[] {
  return card.scope === 'domestico' ? ['A', 'B'] : card.scope === 'A' ? ['A'] : [undefined]
}
