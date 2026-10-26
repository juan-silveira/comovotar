// Catálogo de projetos que o jogador (ou outros atores) pode propor.
// Cada projeto registra os requisitos constitucionais (tipo de norma,
// iniciativa, competência, cláusulas pétreas, jurisprudência) e os efeitos
// no modelo se virar lei.

import type { DecisionEffect, Side } from './decisions'
import type { BillPosition } from './legislature'

export type Level = 'federal' | 'estadual' | 'municipal'
export type NormType = 'lei-ordinaria' | 'lei-complementar' | 'pec' | 'medida-provisoria'

export const NORM_LABELS: Record<NormType, string> = {
  'lei-ordinaria': 'Projeto de lei ordinária',
  'lei-complementar': 'Projeto de lei complementar',
  pec: 'Proposta de emenda à Constituição',
  'medida-provisoria': 'Medida provisória',
}

/** Força das espécies normativas: uma lei ordinária não pode tratar de tema reservado a lei complementar ou à Constituição. */
export const NORM_RANK: Record<NormType, number> = {
  'medida-provisoria': 1,
  'lei-ordinaria': 1,
  'lei-complementar': 2,
  pec: 3,
}

export type Office =
  | 'vereador'
  | 'prefeito'
  | 'deputado-estadual'
  | 'governador'
  | 'deputado-federal'
  | 'senador'
  | 'presidente'
  | 'ministro-stf'

export interface Vice {
  /** Referência em constitution.ts */
  ref: string
  /** Explicação curta do problema */
  text: string
  kind: 'iniciativa' | 'competencia' | 'clausula-petrea' | 'material' | 'forma'
}

/** Efeitos de uma lei no modelo. Valores por ano, a partir do ano seguinte à promulgação. */
export interface LawEffect {
  /** Efeito sobre parâmetros nacionais do bloco que aprovou a lei */
  national?: (side: Side) => DecisionEffect
  /** Crescimento adicional da UF (lei estadual) ou do município (lei municipal), p.p. */
  localGrowth?: number
  /** Multiplicador de danos climáticos na UF ou no município */
  climateFactor?: number
  /** Duração dos efeitos locais, anos */
  years?: number
  /** Custo fiscal, % do PIB do território (negativo = receita) */
  fiscalCost?: number
  /** Aprovação do chefe do Executivo do território, pontos */
  approval?: number
  /** Reação da bolsa, % */
  market?: number
}

export interface BillVariant {
  id: string
  label: string
  description: string
  vices?: Vice[]
  /** Multiplica os efeitos da lei */
  strength?: number
  position?: Partial<BillPosition>
}

export interface BillTemplate {
  id: string
  level: Level
  area: string
  title: string
  summary: string
  /** Espécie normativa exigida */
  requiredNorm: NormType
  /** Quem pode propor; se o autor não estiver na lista, há vício de iniciativa */
  initiative: Office[] | 'qualquer'
  /** Referência que explica a iniciativa privativa, quando houver */
  initiativeRef?: string
  /** Vícios presentes em qualquer redação */
  vices?: Vice[]
  position: BillPosition
  /** Reduz o apoio de partidos pragmáticos (ex.: limitar emendas) */
  hurtsPragmatic?: boolean
  /** Probabilidade base de o relator inserir um jabuti */
  jabutiRisk: number
  /** Itens principais do texto (o relator pode retirar alguns) */
  provisions: string[]
  effect: LawEffect
  variants?: BillVariant[]
  /** Referências para estudo */
  refs: string[]
}

export const JABUTIS = [
  { id: 'anistia', text: 'anistia de multas e dívidas de um setor específico', fiscal: 0.05 },
  { id: 'beneficio', text: 'benefício tributário para um segmento empresarial sem relação com o tema', fiscal: 0.08 },
  { id: 'eleitoral', text: 'mudança em regra eleitoral sem relação com o projeto', fiscal: 0 },
  { id: 'cargos', text: 'criação de cargos comissionados em órgão sem relação com o tema', fiscal: 0.02 },
]

const LEGISLATORS_FED: Office[] = ['deputado-federal', 'senador', 'presidente']

export const BILLS: BillTemplate[] = [
  // Federal ------------------------------------------------------------------------
  {
    id: 'transparencia-emendas',
    level: 'federal',
    area: 'Transparência',
    title: 'Transparência de emendas e gastos sob sigilo',
    summary:
      'Exige identificação do autor e do beneficiário final de toda emenda e limita o sigilo sobre gastos com cartões corporativos a casos de segurança.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0, popularity: 0.6 },
    hurtsPragmatic: true,
    jabutiRisk: 0.35,
    provisions: ['rastreio de emendas por beneficiário', 'fim do sigilo amplo de cartões corporativos', 'painel público em tempo real'],
    effect: {
      national: (side) => (side === 'A' ? { transparencyA: 'alta', marketA: 2 } : { transparencyB: 'alta', marketB: 2 }),
      approval: 3,
    },
    refs: ['art150', 'art165'],
  },
  {
    id: 'ministerio-clima',
    level: 'federal',
    area: 'Clima',
    title: 'Criação do Ministério da Adaptação Climática',
    summary: 'Cria um ministério para coordenar prevenção a secas, enchentes e queimadas.',
    requiredNorm: 'lei-ordinaria',
    initiative: ['presidente'],
    initiativeRef: 'art61p1',
    position: { econ: -0.2, env: 0.7, popularity: 0.3 },
    jabutiRisk: 0.2,
    provisions: ['estrutura do ministério', 'fundo de prevenção', 'metas de redução de danos'],
    effect: {
      national: (side) => (side === 'A' ? { climatePrepA: 'alto' } : { climatePrepB: 'alto' }),
    },
    refs: ['art61p1', 'art84', 'lei12608'],
  },
  {
    id: 'isencao-ir',
    level: 'federal',
    area: 'Impostos',
    title: 'Ampliação da faixa de isenção do imposto de renda',
    summary: 'Amplia a faixa de isenção do IR para salários mais baixos.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.2, popularity: 0.8 },
    jabutiRisk: 0.45,
    provisions: ['nova faixa de isenção', 'correção anual da tabela', 'compensação da perda de receita'],
    effect: {
      national: (side) => (side === 'A' ? { growthA: 0.05, fiscalA: -0.3 } : { growthB: 0.05, fiscalB: -0.3 }),
      approval: 5,
    },
    variants: [
      {
        id: 'com-compensacao',
        label: 'Com compensação',
        description: 'Compensa a perda de receita com tributação de dividendos acima de um limite, como exige a Lei de Responsabilidade Fiscal.',
        position: { econ: -0.4 },
      },
      {
        id: 'sem-compensacao',
        label: 'Sem compensação',
        description: 'Só amplia a isenção. Mais simples de aprovar, mas descumpre a regra de compensação da renúncia de receita.',
        strength: 1.3,
        vices: [{ ref: 'lrf14', kind: 'material', text: 'Renúncia de receita sem estimativa de impacto e sem medida de compensação.' }],
        position: { econ: 0 },
      },
    ],
    refs: ['art150', 'lrf14'],
  },
  {
    id: 'teto-emendas',
    level: 'federal',
    area: 'Orçamento',
    title: 'Teto para emendas parlamentares',
    summary: 'Limita o total de emendas parlamentares obrigatórias a 0,25% do PIB.',
    requiredNorm: 'pec',
    initiative: LEGISLATORS_FED,
    position: { econ: 0.3, popularity: 0.4 },
    hurtsPragmatic: true,
    jabutiRisk: 0.3,
    provisions: ['teto global', 'regra de transição', 'critérios de distribuição'],
    effect: {
      national: (side) =>
        side === 'A' ? { emendasCapA: 0.25, marketA: 3 } : { emendasCapB: 0.25, marketB: 3 },
    },
    refs: ['art60', 'art165'],
  },
  {
    id: 'eleicao-indireta',
    level: 'federal',
    area: 'Sistema político',
    title: 'Eleição indireta para presidente',
    summary: 'Propõe que o presidente seja escolhido pelo Congresso, e não pelo voto direto.',
    requiredNorm: 'pec',
    initiative: LEGISLATORS_FED,
    vices: [
      {
        ref: 'art60p4',
        kind: 'clausula-petrea',
        text: 'O voto direto é cláusula pétrea: a proposta não pode sequer ser deliberada.',
      },
    ],
    position: { econ: 0, popularity: -0.8, antiDemocratic: true },
    jabutiRisk: 0,
    provisions: ['eleição pelo Congresso'],
    effect: { approval: -10 },
    refs: ['art60p4', 'art14'],
  },
  {
    id: 'licenciamento',
    level: 'federal',
    area: 'Meio ambiente',
    title: 'Licenciamento ambiental simplificado',
    summary: 'Reduz prazos e etapas do licenciamento para obras e empreendimentos de médio porte.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0.5, env: -0.7, popularity: 0 },
    jabutiRisk: 0.5,
    provisions: ['prazos máximos', 'licença por adesão para médio porte', 'dispensa para obras de manutenção'],
    effect: {
      national: (side) =>
        side === 'A'
          ? { growthA: 0.1, climatePrepA: 'baixo', marketA: 3 }
          : { growthB: 0.1, climatePrepB: 'baixo', marketB: 3 },
    },
    refs: ['art23', 'art24'],
  },
  {
    id: 'fundo-desastres',
    level: 'federal',
    area: 'Clima',
    title: 'Fundo nacional de prevenção a desastres',
    summary: 'Cria um fundo para drenagem, contenção de encostas, reservatórios e brigadas contra incêndio.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.2, env: 0.5, popularity: 0.5 },
    jabutiRisk: 0.3,
    provisions: ['fontes de recursos', 'critérios de distribuição', 'metas de prevenção'],
    effect: {
      national: (side) => (side === 'A' ? { climatePrepA: 'alto' } : { climatePrepB: 'alto' }),
      approval: 2,
    },
    refs: ['art21', 'lei12608'],
  },
  {
    id: 'regra-fiscal',
    level: 'federal',
    area: 'Contas públicas',
    title: 'Regra fiscal com limite de crescimento dos gastos',
    summary: 'Limita o crescimento real das despesas a uma fração do crescimento da receita, com metas de resultado primário.',
    requiredNorm: 'lei-complementar',
    initiative: 'qualquer',
    position: { econ: 0.5, popularity: -0.1 },
    jabutiRisk: 0.3,
    provisions: ['limite de despesas', 'metas de resultado primário', 'gatilhos de correção'],
    effect: {
      national: (side) =>
        side === 'A' ? { fiscalA: 0.3, growthA: -0.03, marketA: 5 } : { fiscalB: 0.3, growthB: -0.03, marketB: 5 },
    },
    variants: [
      { id: 'lc', label: 'Como lei complementar', description: 'Respeita a reserva de lei complementar para finanças públicas (art. 163).' },
      {
        id: 'ordinaria',
        label: 'Como lei ordinária',
        description: 'Mais fácil de aprovar (maioria simples), mas o tema é reservado a lei complementar.',
        vices: [{ ref: 'art69', kind: 'forma', text: 'Matéria reservada a lei complementar aprovada como lei ordinária.' }],
      },
    ],
    refs: ['art69', 'art165'],
  },
  {
    id: 'jornada-36h',
    level: 'federal',
    area: 'Trabalho',
    title: 'Fim da escala 6x1: jornada de 36 horas',
    summary: 'Reduz a jornada máxima de 44 para 36 horas semanais, com duas folgas por semana e sem redução de salário, com transição gradual.',
    requiredNorm: 'pec',
    initiative: LEGISLATORS_FED,
    position: { econ: -0.6, popularity: 0.7 },
    jabutiRisk: 0.3,
    provisions: ['limite de 36 horas semanais', 'duas folgas por semana', 'transição gradual de 4 anos'],
    effect: {
      national: (side) => (side === 'A' ? { growthA: -0.08, marketA: -4 } : { growthB: -0.08, marketB: -4 }),
      approval: 6,
    },
    refs: ['art60'],
  },
  {
    id: 'aumento-servidores',
    level: 'federal',
    area: 'Administração',
    title: 'Reajuste salarial dos servidores federais',
    summary: 'Concede reajuste a todas as carreiras do Executivo federal.',
    requiredNorm: 'lei-ordinaria',
    initiative: ['presidente'],
    initiativeRef: 'art61p1',
    position: { econ: -0.4, popularity: 0.3 },
    jabutiRisk: 0.4,
    provisions: ['índice de reajuste', 'cronograma', 'reestruturação de carreiras'],
    effect: {
      national: (side) => (side === 'A' ? { fiscalA: -0.2 } : { fiscalB: -0.2 }),
      approval: 2,
    },
    refs: ['art61p1', 'art63'],
  },

  // Estadual ----------------------------------------------------------------------
  {
    id: 'icms-fabricas',
    level: 'estadual',
    area: 'Impostos',
    title: 'Incentivo de ICMS para atrair fábricas',
    summary: 'Reduz o ICMS para indústrias que se instalarem no estado.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0.3, popularity: 0.3 },
    jabutiRisk: 0.4,
    provisions: ['redução de alíquota', 'contrapartida de empregos', 'prazo do benefício'],
    effect: { localGrowth: 0.25, years: 8, fiscalCost: 0.4, approval: 3 },
    variants: [
      {
        id: 'confaz',
        label: 'Com convênio no CONFAZ',
        description: 'Benefício aprovado pelos demais estados: legal, porém menor e mais demorado.',
        strength: 0.6,
      },
      {
        id: 'unilateral',
        label: 'Unilateral',
        description: 'O estado concede sozinho: benefício maior, mas sem o convênio exigido pela Constituição (guerra fiscal).',
        vices: [{ ref: 'art155', kind: 'material', text: 'Benefício de ICMS sem convênio entre os estados.' }],
      },
    ],
    refs: ['art155'],
  },
  {
    id: 'cameras-policia',
    level: 'estadual',
    area: 'Segurança pública',
    title: 'Câmeras corporais nas polícias estaduais',
    summary: 'Torna obrigatório o uso de câmeras corporais por policiais militares e civis em serviço.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.1, popularity: 0.3 },
    jabutiRisk: 0.25,
    provisions: ['uso obrigatório', 'armazenamento das imagens', 'acesso por Ministério Público e Defensoria'],
    effect: { localGrowth: 0.02, years: 10, fiscalCost: 0.02, approval: 1 },
    refs: ['art23'],
  },
  {
    id: 'saneamento',
    level: 'estadual',
    area: 'Saneamento',
    title: 'Concessão regionalizada do saneamento',
    summary: 'Agrupa municípios em blocos e concede água e esgoto à iniciativa privada com metas de universalização.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0.5, popularity: -0.1 },
    jabutiRisk: 0.3,
    provisions: ['blocos regionais', 'metas de universalização', 'regulação tarifária'],
    effect: { localGrowth: 0.15, years: 12, climateFactor: 0.9, market: 2 },
    refs: ['art23', 'art30'],
  },
  {
    id: 'piso-professores',
    level: 'estadual',
    area: 'Educação',
    title: 'Reajuste do piso dos professores estaduais',
    summary: 'Eleva a remuneração dos professores da rede estadual.',
    requiredNorm: 'lei-ordinaria',
    initiative: ['governador'],
    initiativeRef: 'art61p1',
    position: { econ: -0.4, popularity: 0.6 },
    jabutiRisk: 0.3,
    provisions: ['novo piso', 'escalonamento', 'fonte de recursos'],
    effect: { localGrowth: 0.03, years: 15, fiscalCost: 0.15, approval: 4 },
    refs: ['art61p1'],
  },
  {
    id: 'defesa-civil-estadual',
    level: 'estadual',
    area: 'Clima',
    title: 'Plano estadual de prevenção a desastres',
    summary: 'Financia drenagem, contenção de encostas, alertas e brigadas no estado.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.2, env: 0.5, popularity: 0.4 },
    jabutiRisk: 0.3,
    provisions: ['obras de drenagem', 'sistema de alertas', 'brigadas e equipamentos'],
    effect: { climateFactor: 0.7, years: 30, fiscalCost: 0.1, approval: 2 },
    refs: ['art23', 'lei12608'],
  },

  // Municipal ---------------------------------------------------------------------
  {
    id: 'tarifa-zero',
    level: 'municipal',
    area: 'Transporte',
    title: 'Tarifa zero no transporte coletivo',
    summary: 'Elimina a tarifa dos ônibus municipais, financiada pelo orçamento e por taxa sobre empregadores.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.6, popularity: 0.8 },
    jabutiRisk: 0.3,
    provisions: ['gratuidade', 'fonte de custeio', 'ampliação de linhas'],
    effect: { localGrowth: 0.1, years: 30, fiscalCost: 0.6, approval: 6 },
    refs: ['art30'],
  },
  {
    id: 'iss-tecnologia',
    level: 'municipal',
    area: 'Impostos',
    title: 'ISS reduzido para empresas de tecnologia',
    summary: 'Reduz o ISS de empresas de tecnologia para atrair novos negócios.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0.5, popularity: 0.1 },
    jabutiRisk: 0.3,
    provisions: ['alíquota reduzida', 'contrapartidas', 'prazo do benefício'],
    effect: { localGrowth: 0.15, years: 10, fiscalCost: 0.2, market: 1 },
    variants: [
      { id: 'dois', label: 'ISS de 2%', description: 'Respeita a alíquota mínima nacional de 2%.', strength: 0.7 },
      {
        id: 'um',
        label: 'ISS de 1%',
        description: 'Benefício maior, mas abaixo da alíquota mínima de 2%.',
        vices: [{ ref: 'adct88', kind: 'material', text: 'Alíquota efetiva de ISS abaixo de 2%.' }],
      },
    ],
    refs: ['adct88', 'art30'],
  },
  {
    id: 'aplicativos',
    level: 'municipal',
    area: 'Transporte',
    title: 'Transporte por aplicativo',
    summary: 'Define regras para carros de aplicativo no município.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.2, popularity: 0 },
    jabutiRisk: 0.2,
    provisions: ['cadastro de motoristas', 'seguro obrigatório', 'taxa de uso do viário'],
    effect: { localGrowth: 0.02, years: 10, fiscalCost: -0.02 },
    variants: [
      { id: 'regulamentar', label: 'Regulamentar', description: 'Exige cadastro, seguro e taxa de uso do sistema viário.' },
      {
        id: 'proibir',
        label: 'Proibir',
        description: 'Proíbe o serviço para proteger os táxis.',
        strength: -1,
        vices: [{ ref: 're1054110', kind: 'material', text: 'Municípios não podem proibir o transporte por aplicativo.' }],
        position: { econ: -0.7, popularity: -0.2 },
      },
    ],
    refs: ['re1054110', 'art30'],
  },
  {
    id: 'alerta-enchentes',
    level: 'municipal',
    area: 'Clima',
    title: 'Sistema municipal de alerta e mapeamento de risco',
    summary: 'Mapeia áreas de risco, instala sirenes e cria planos de evacuação.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: -0.1, env: 0.4, popularity: 0.5 },
    jabutiRisk: 0.2,
    provisions: ['mapeamento de risco', 'sirenes e alertas por celular', 'planos de evacuação'],
    effect: { climateFactor: 0.6, years: 30, fiscalCost: 0.05, approval: 2 },
    refs: ['lei12608', 'art30'],
  },
  {
    id: 'secretaria-municipal',
    level: 'municipal',
    area: 'Administração',
    title: 'Criação da Secretaria Municipal de Inovação',
    summary: 'Cria uma nova secretaria com cargos e orçamento próprios.',
    requiredNorm: 'lei-ordinaria',
    initiative: ['prefeito'],
    initiativeRef: 'art61p1',
    position: { econ: 0.1, popularity: 0 },
    jabutiRisk: 0.3,
    provisions: ['estrutura da secretaria', 'cargos', 'programas'],
    effect: { localGrowth: 0.03, years: 10, fiscalCost: 0.05 },
    refs: ['art61p1', 'art30'],
  },
  {
    id: 'plano-diretor',
    level: 'municipal',
    area: 'Urbanismo',
    title: 'Revisão do plano diretor: moradia perto do transporte',
    summary: 'Permite prédios mais altos perto de corredores de ônibus e metrô e exige moradia popular nos empreendimentos.',
    requiredNorm: 'lei-ordinaria',
    initiative: 'qualquer',
    position: { econ: 0.3, popularity: 0.1 },
    jabutiRisk: 0.5,
    provisions: ['adensamento nos eixos', 'cota de moradia popular', 'áreas de proteção'],
    effect: { localGrowth: 0.1, years: 20, climateFactor: 1.05 },
    refs: ['art30'],
  },
]

/** Propostas criadas pelo jogador (registradas em tempo de execução). */
const CUSTOM = new Map<string, { template: BillTemplate; args: BillArguments }>()

export function registerCustomBill(template: BillTemplate, args: BillArguments) {
  CUSTOM.set(template.id, { template, args })
}

export function isCustomBill(id: string): boolean {
  return CUSTOM.has(id)
}

export function findBill(id: string): BillTemplate | undefined {
  return BILLS.find((b) => b.id === id) ?? CUSTOM.get(id)?.template
}

/** Cargos com poder de propor leis em cada nível. */
export const PROPOSERS: Record<Level, Office[]> = {
  federal: ['deputado-federal', 'senador', 'presidente'],
  estadual: ['deputado-estadual', 'governador'],
  municipal: ['vereador', 'prefeito'],
}

export function billsFor(level: Level): BillTemplate[] {
  return [...BILLS, ...[...CUSTOM.values()].map((c) => c.template)].filter((b) => b.level === level)
}

/** Argumentos a favor e contra cada projeto, como aparecem no debate público. */
export interface BillArguments {
  pros: string[]
  cons: string[]
}

export const BILL_ARGUMENTS: Record<string, BillArguments> = {
  'transparencia-emendas': {
    pros: ['O eleitor passa a saber quem indicou cada recurso e para onde ele foi.', 'Reduz o espaço para desvios e torna o gasto mais eficiente.', 'Tende a baixar os juros, porque aumenta a confiança nas contas públicas.'],
    cons: ['Diminui a moeda de troca usada para formar maioria no Congresso.', 'Cria custos e burocracia para registrar e publicar tudo.', 'Alguns gastos sensíveis (segurança, saúde de autoridades) podem ficar expostos.'],
  },
  'ministerio-clima': {
    pros: ['Coordena prevenção a secas, enchentes e queimadas num só lugar.', 'Reduz danos de desastres, que custam vidas e muito dinheiro.'],
    cons: ['Cria mais estrutura e cargos no governo.', 'Só o presidente pode propor a criação de ministérios: se outro propõe, é inconstitucional.'],
  },
  'isencao-ir': {
    pros: ['Aumenta a renda disponível de quem ganha menos.', 'É muito popular e estimula o consumo.'],
    cons: ['O governo arrecada menos; sem compensação, a dívida cresce.', 'A Lei de Responsabilidade Fiscal exige compensar a perda de receita.'],
  },
  'teto-emendas': {
    pros: ['Libera recursos para investimentos planejados pelo governo.', 'Limita o uso do orçamento como moeda de troca política.'],
    cons: ['Parlamentares perdem um instrumento para atender necessidades locais.', 'Governos impopulares podem ter mais dificuldade de aprovar projetos.', 'Exige emenda constitucional: 3/5 dos votos em dois turnos.'],
  },
  'eleicao-indireta': {
    pros: ['Defensores alegam que reduziria custos de campanha.'],
    cons: ['Tira do eleitor o direito de escolher o presidente.', 'O voto direto é cláusula pétrea: a proposta não pode nem ser votada.'],
  },
  licenciamento: {
    pros: ['Acelera obras e investimentos, gerando empregos.', 'Reduz custos e incerteza para empreendedores.'],
    cons: ['Menos análise ambiental pode aumentar desmatamento e riscos de desastres.', 'Pode gerar ações judiciais e insegurança para os próprios projetos.'],
  },
  'fundo-desastres': {
    pros: ['Cada real investido em prevenção evita perdas muito maiores depois.', 'Protege vidas em áreas de risco.'],
    cons: ['Custa dinheiro hoje para um benefício que pode demorar a aparecer.', 'Prevenção dá menos visibilidade política do que obras de reconstrução.'],
  },
  'regra-fiscal': {
    pros: ['Controla o crescimento da dívida e reduz os juros.', 'Dá previsibilidade às contas públicas e agrada investidores.'],
    cons: ['Limita gastos sociais e investimentos no curto prazo.', 'Pode desacelerar um pouco a economia.'],
  },
  'jornada-36h': {
    pros: ['Mais descanso, saúde e tempo com a família, sem perder salário.', 'Trabalhadores descansados tendem a produzir mais por hora.', 'Muito popular entre trabalhadores com carteira assinada.'],
    cons: ['Custo de cada hora trabalhada sobe cerca de 22% para as empresas.', 'Comércio e serviços que abrem todo dia precisariam contratar mais; pequenos negócios sofrem mais.', 'Pode estimular informalidade, automação e alta de preços.', 'Exige emenda constitucional: 3/5 dos votos em dois turnos.'],
  },
  'aumento-servidores': {
    pros: ['Repõe perdas salariais e ajuda a reter bons profissionais no serviço público.'],
    cons: ['Aumenta muito a despesa permanente do governo.', 'Só o presidente pode propor aumento para servidores federais.'],
  },
  'icms-fabricas': {
    pros: ['Atrai fábricas e empregos para o estado.', 'Estados mais pobres ganham uma ferramenta para competir.'],
    cons: ['O estado abre mão de arrecadação que pagaria saúde e educação.', 'Sem convênio no CONFAZ é inconstitucional e alimenta a guerra fiscal entre estados.'],
  },
  'cameras-policia': {
    pros: ['Registra abordagens, protegendo cidadãos e policiais de acusações falsas.', 'Estudos associam as câmeras à redução da letalidade policial.'],
    cons: ['Custo de equipamentos e de armazenamento das imagens.', 'Parte dos policiais vê como desconfiança sobre o seu trabalho.'],
  },
  saneamento: {
    pros: ['Atrai investimento privado para universalizar água e esgoto.', 'Menos doenças e menos poluição de rios.'],
    cons: ['As tarifas podem subir.', 'O poder público perde controle direto sobre um serviço essencial.'],
  },
  'piso-professores': {
    pros: ['Valoriza a carreira e ajuda a atrair bons professores.', 'Educação de qualidade aumenta a renda no longo prazo.'],
    cons: ['Aumenta a despesa permanente do estado.', 'Só o governador pode propor aumento para servidores estaduais.'],
  },
  'defesa-civil-estadual': {
    pros: ['Reduz mortes e prejuízos com enchentes e deslizamentos.', 'Alertas antecipados salvam vidas a baixo custo.'],
    cons: ['Exige recursos contínuos por anos.', 'Os benefícios só aparecem quando acontece um desastre.'],
  },
  'tarifa-zero': {
    pros: ['Mais acesso ao trabalho, à escola e à saúde para quem ganha pouco.', 'Tira carros das ruas e reduz poluição.'],
    cons: ['Custo alto para o orçamento da cidade.', 'Sem financiamento estável, a qualidade do serviço pode cair.'],
  },
  'iss-tecnologia': {
    pros: ['Atrai empresas e empregos qualificados.', 'Estimula inovação na cidade.'],
    cons: ['A prefeitura arrecada menos.', 'Abaixo de 2% é ilegal: a Constituição fixa uma alíquota mínima.'],
  },
  aplicativos: {
    pros: ['Regulamentar dá segurança a passageiros e motoristas.', 'A cidade pode cobrar pelo uso das ruas.'],
    cons: ['Regras demais encarecem o serviço.', 'Proibir é inconstitucional: o STF garantiu a livre iniciativa.'],
  },
  'alerta-enchentes': {
    pros: ['Sirenes e mapas de risco salvam vidas com custo baixo.', 'Cumpre a Política Nacional de Proteção e Defesa Civil.'],
    cons: ['Exige manutenção e treinamento contínuos.', 'Pode gerar falsos alarmes se mal calibrado.'],
  },
  'secretaria-municipal': {
    pros: ['Organiza e dá prioridade à inovação na cidade.'],
    cons: ['Cria cargos e despesas.', 'Só o prefeito pode propor a criação de secretarias.'],
  },
  'plano-diretor': {
    pros: ['Mais moradia perto do emprego e do transporte.', 'Reduz deslocamentos e o espraiamento da cidade.'],
    cons: ['Moradores temem prédios altos e trânsito nos bairros.', 'Pode valorizar terrenos e expulsar moradores antigos.'],
  },
}

export function billArguments(id: string): BillArguments {
  return BILL_ARGUMENTS[id] ?? CUSTOM.get(id)?.args ?? { pros: [], cons: [] }
}

/** Efeitos estimados de um projeto, em frases simples. */
export function billEffectSummary(t: BillTemplate): string[] {
  const out: string[] = []
  const e = t.effect
  const nat = e.national?.('A')
  const growth = (nat?.growthA ?? 0) + (e.localGrowth ?? 0)
  const fiscal = nat?.fiscalA ?? (e.fiscalCost !== undefined ? -e.fiscalCost : 0)
  if (growth > 0) out.push(`Economia: deve crescer um pouco mais (cerca de +${growth.toFixed(2).replace('.', ',')} ponto percentual por ano).`)
  if (growth < 0) out.push(`Economia: deve crescer um pouco menos (cerca de ${growth.toFixed(2).replace('.', ',')} ponto percentual por ano).`)
  if (fiscal < 0) out.push(`Contas públicas: custo de cerca de ${Math.abs(fiscal).toFixed(2).replace('.', ',')}% do PIB por ano.`)
  if (fiscal > 0) out.push(`Contas públicas: melhora de cerca de ${fiscal.toFixed(2).replace('.', ',')}% do PIB por ano.`)
  if (e.climateFactor !== undefined && e.climateFactor < 1) out.push(`Desastres: danos cerca de ${Math.round((1 - e.climateFactor) * 100)}% menores.`)
  if (e.climateFactor !== undefined && e.climateFactor > 1) out.push(`Desastres: danos cerca de ${Math.round((e.climateFactor - 1) * 100)}% maiores.`)
  if (nat?.climatePrepA === 'alto') out.push('Desastres: prevenção maior, danos menores.')
  if (nat?.climatePrepA === 'baixo') out.push('Desastres: menos prevenção, danos maiores.')
  if (nat?.transparencyA === 'alta') out.push('Transparência: gastos e emendas rastreáveis; menos escândalos.')
  if (nat?.emendasCapA !== undefined) out.push('Emendas: teto de 0,25% do PIB.')
  if (e.approval) out.push(`Opinião pública: ${e.approval > 0 ? 'tende a agradar' : 'tende a desagradar'} o eleitor.`)
  if (t.position.popularity >= 0.5) out.push('Popularidade: tema muito popular.')
  if (t.position.popularity <= -0.3) out.push('Popularidade: tema impopular.')
  return out
}
