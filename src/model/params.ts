// Parâmetros ajustáveis e coeficientes avançados do modelo.

import { ORIGINAL_PARTITION, type Partition } from './partition'
import type { Preparedness } from './climate'
import {
  DEFAULT_INSTITUTIONS_COEFFICIENTS,
  DEFAULT_INSTITUTIONS_PARAMS,
  type InstitutionsCoefficients,
  type InstitutionsParams,
} from './institutions'
import {
  DEFAULT_POLITICS_COEFFICIENTS,
  DEFAULT_POLITICS_PARAMS,
  type PoliticsCoefficients,
  type PoliticsParams,
} from './politics'
// Unidades: percentuais em pontos percentuais (2,5 = 2,5%), efeitos de
// crescimento em p.p. ao ano.

export type SeparationType = 'amigavel' | 'intermediaria' | 'conflituosa'

export const SEPARATION_LABELS: Record<SeparationType, string> = {
  amigavel: 'Amigável',
  intermediaria: 'Intermediária',
  conflituosa: 'Conflituosa',
}

export const SEPARATION_DESCRIPTIONS: Record<SeparationType, string> = {
  amigavel: 'União aduaneira, livre circulação de pessoas e divisão negociada da dívida.',
  intermediaria: 'Acordo de livre comércio parcial, tarifas baixas e negociação lenta de ativos.',
  conflituosa: 'Tarifas altas, disputa sobre dívida e ativos, fronteira rígida.',
}

export type MigrationPolicy = 'incentivar' | 'livre' | 'restringir' | 'proibir'
export type FirmPolicy = 'atrair' | 'neutra' | 'repelir'

export const MIGRATION_POLICY_LABELS: Record<MigrationPolicy, string> = {
  incentivar: 'Incentivar',
  livre: 'Livre',
  restringir: 'Restringir',
  proibir: 'Proibir',
}

export const MIGRATION_POLICY_DESCRIPTIONS: Record<MigrationPolicy, string> = {
  incentivar:
    'Programas para atrair e reter trabalhadores (moradia, qualificação, validação de diplomas). Aumenta a entrada em 50%, reduz a saída em 20% e custa 0,1% do PIB ao ano.',
  livre: 'Entrada sem restrições, como entre estados hoje.',
  restringir: 'Vistos de trabalho com cotas: a entrada cai para 30% do fluxo livre.',
  proibir: 'Fronteira fechada à imigração do outro bloco. Fiscalização custa 0,05% do PIB ao ano.',
}

export const FIRM_POLICY_LABELS: Record<FirmPolicy, string> = {
  atrair: 'Atrair',
  neutra: 'Neutra',
  repelir: 'Repelir',
}

export const FIRM_POLICY_DESCRIPTIONS: Record<FirmPolicy, string> = {
  atrair:
    'Incentivos fiscais para empresas se instalarem (redução de tributos, crédito, terrenos). Custa receita e atrai atividade do outro bloco se ele não fizer o mesmo.',
  neutra: 'Tratamento igual a empresas de qualquer origem.',
  repelir:
    'Restrições e sobretaxas a empresas do outro bloco (conteúdo local, tributação de filiais). Gera receita no curto prazo, mas afasta investimento e aumenta a perda de comércio.',
}

export interface Params extends PoliticsParams, InstitutionsParams {
  /** Tipo de separação, quando ela ocorre */
  separation: SeparationType
  /** Ano (t) em que a separação começa; null = Brasil unido */
  separationYear: number | null
  /** Divisão das UFs entre os blocos (A = maior PIB per capita) */
  partition: Partition
  /** Política de cada bloco para a entrada de migrantes do outro bloco */
  migrationPolicyA: MigrationPolicy
  migrationPolicyB: MigrationPolicy
  /** Política de cada bloco para empresas */
  firmPolicyA: FirmPolicy
  firmPolicyB: FirmPolicy
  /** Eventos climáticos localizados ligados */
  climateEnabled: boolean
  /** Preparo para desastres de cada bloco */
  climatePrepA: Preparedness
  climatePrepB: Preparedness
  /** (2) Transferência fiscal líquida A→B hoje, % do PIB de A. Hipótese a calibrar. */
  transferAtoB: number
  /** (3) Parcela da economia fiscal de A reinvestida em crescimento, % */
  reinvestShare: number
  /** (4) Exposição comercial de A ao mercado de B, % do PIB de A */
  tradeExposureA: number
  /** (5) Perda de comércio após a separação, % das vendas A→B */
  tradeLoss: number
  /** (6) Arrecadação que migra de A para B (domicílio fiscal de filiais), % do PIB de A */
  taxMigration: number
  /** (7) Custo extra de energia importada por A, % do PIB de A ao ano */
  energyCostA: number
  /** (8) Choque de transição no ano 1, % do PIB (magnitude positiva) */
  transitionShock: number
  /** (8) Meia-vida do choque de transição, anos */
  shockHalfLife: number
  /** (10) Vantagem de recursos de B, p.p. de crescimento ao ano */
  resourceBonusB: number
  /** Ganho de autonomia de cada bloco após a separação, p.p. ao ano quando maduro */
  autonomyGain: number
  /** Parcela da dívida pública nacional assumida por B, % */
  debtShareB: number
  /** Prêmio de risco sobre os juros reais da dívida, p.p. */
  riskPremium: number
  /** (12) Eventos aleatórios ligados */
  eventsEnabled: boolean
  /** Probabilidade anual de um evento, % */
  eventProbability: number
  /** Cartas de decisão (modo jogo) ligadas */
  decisionsEnabled: boolean
}

export interface Coefficients extends PoliticsCoefficients, InstitutionsCoefficients {
  /** Probabilidade anual de evento climático por bloco no ano 1, % */
  climateFrequency: number
  /** Aumento anual dessa probabilidade, p.p. */
  climateTrend: number
  /** Fração do dano climático recuperada no ano seguinte (reconstrução), % */
  climateRebound: number
  /** Multiplicador de crescimento da economia fiscal reinvestida em A */
  fiscalMultiplierA: number
  /** Multiplicador da perda de transferências sobre o crescimento de B */
  fiscalMultiplierB: number
  /** Anos para o ganho de autonomia amadurecer */
  autonomyRampYears: number
  /** Peso da qualidade de governo (ministério, transparência, segurança jurídica) no ganho de autonomia */
  autonomyGovernanceWeight: number
  /** Anos de ajuste fiscal de B */
  fiscalAdjustYearsB: number
  /** Fração do efeito fiscal em B que persiste após o ajuste, % */
  fiscalPersistentShareB: number
  /** Coeficiente de transmissão da perda de comércio ao crescimento de A */
  tradeCoefA: number
  /** Coeficiente de transmissão do encarecimento das importações ao crescimento de B */
  tradeCoefB: number
  /** Anos para A e B encontrarem mercados/fornecedores alternativos */
  tradeRecoveryYears: number
  /** Fração da perda de comércio que persiste após a recuperação, % */
  tradeResidualShare: number
  /** Redução de crescimento por p.p. de idosos acima da média nacional */
  demographicDragPerPoint: number
  /** Crescimento anual do contrafactual "Brasil unido", % */
  unitedGrowth: number
  /** Saldo primário de base de cada bloco, % do PIB */
  basePrimaryBalance: number
  /** Juro real médio da dívida pública, % ao ano */
  realInterestRate: number
  /** Migração anual (% da população do bloco de origem) com a diferença de renda de 2023 e fronteira livre */
  migrationRate: number
  /** Produtividade do migrante em relação à média do bloco, % */
  migrantProductivity: number
  /** Atividade realocada por ano quando um bloco atrai e o outro não, % do PIB do bloco de origem */
  firmRelocation: number
  /** Ganho de crescimento próprio dos incentivos a empresas, p.p. */
  firmIncentiveGrowth: number
  /** Custo fiscal dos incentivos a empresas, % do PIB */
  firmIncentiveCost: number
  /** Receita das sobretaxas a empresas do outro bloco, % do PIB */
  firmRepelRevenue: number
  /** Perda de comércio adicional quando algum bloco repele empresas, p.p. */
  firmRepelTradeLoss: number
}

export interface ParamMeta {
  key: keyof Params
  label: string
  min: number
  max: number
  step: number
  unit: string
  tooltip: string
  group: 'basico' | 'avancado' | 'politica'
  calibrate?: boolean
}

export const PARAM_META: ParamMeta[] = [
  {
    key: 'transferAtoB',
    label: 'Transferência fiscal líquida A→B',
    min: 0,
    max: 6,
    step: 0.1,
    unit: '% do PIB de A',
    tooltip:
      'Quanto o Bloco A transfere hoje, em termos líquidos, para o Bloco B via orçamento federal (impostos arrecadados em A e gastos em B). Com a separação, esse fluxo deixa de existir.',
    group: 'basico',
    calibrate: true,
  },
  {
    key: 'reinvestShare',
    label: 'Parcela da economia fiscal reinvestida',
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    tooltip:
      'Fração da economia fiscal de A que vira investimento produtivo (infraestrutura, educação). O restante melhora o saldo fiscal.',
    group: 'basico',
  },
  {
    key: 'tradeExposureA',
    label: 'Exposição comercial de A ao mercado de B',
    min: 2,
    max: 15,
    step: 0.5,
    unit: '% do PIB de A',
    tooltip: 'Vendas de A para B como fração do PIB de A. Quanto maior, mais A sente a perda de comércio.',
    group: 'basico',
  },
  {
    key: 'tradeLoss',
    label: 'Perda de comércio após a separação',
    min: 0,
    max: 80,
    step: 5,
    unit: '% das vendas A→B',
    tooltip:
      'Parcela do comércio entre os blocos que deixa de existir por tarifas, burocracia de fronteira e incerteza. Definida pelo tipo de separação.',
    group: 'basico',
  },
  {
    key: 'transitionShock',
    label: 'Choque de transição no ano 1',
    min: 0,
    max: 12,
    step: 0.5,
    unit: '% do PIB',
    tooltip:
      'Perda de crescimento no primeiro ano, comum a ambos os blocos, causada por incerteza, criação de instituições e reorganização de contratos. Dissipa-se com a meia-vida definida.',
    group: 'basico',
  },
  {
    key: 'resourceBonusB',
    label: 'Vantagem de recursos de B',
    min: 0,
    max: 1,
    step: 0.05,
    unit: 'p.p./ano',
    tooltip:
      'Bônus de crescimento de B associado a minério, energia renovável e fronteira agrícola, que passam a ser exportados por B.',
    group: 'basico',
  },
  {
    key: 'autonomyGain',
    label: 'Ganho de autonomia',
    min: 0,
    max: 1,
    step: 0.05,
    unit: 'p.p./ano',
    tooltip:
      'Ganho de crescimento de cada bloco por ter política própria: leis, impostos, juros e câmbio ajustados à sua realidade e menos custo de coordenação federativa. Cresce aos poucos e é maior ou menor conforme a qualidade do governo (ministério técnico, transparência, segurança jurídica). Definido pelo tipo de separação.',
    group: 'basico',
  },
  {
    key: 'taxMigration',
    label: 'Arrecadação que migra de A para B',
    min: 0,
    max: 3,
    step: 0.1,
    unit: '% do PIB de A',
    tooltip:
      'Tributos que passam a ser recolhidos em B porque filiais de empresas de A mudam o domicílio fiscal para operar lá.',
    group: 'avancado',
  },
  {
    key: 'energyCostA',
    label: 'Custo extra de energia importada por A',
    min: 0,
    max: 1,
    step: 0.05,
    unit: '% do PIB de A/ano',
    tooltip:
      'A importa de B parte relevante da energia (hidrelétricas do Norte, eólica e solar do Nordeste). Após a separação, paga tarifas e margens de exportação.',
    group: 'avancado',
  },
  {
    key: 'shockHalfLife',
    label: 'Meia-vida do choque de transição',
    min: 0.5,
    max: 6,
    step: 0.5,
    unit: 'anos',
    tooltip: 'Tempo para o choque de transição cair pela metade.',
    group: 'avancado',
  },
  {
    key: 'debtShareB',
    label: 'Parcela da dívida assumida por B',
    min: 0,
    max: 50,
    step: 0.5,
    unit: '% da dívida',
    tooltip:
      'Divisão da dívida pública federal. Proporcional ao PIB, B assumiria cerca de 19,6%; proporcional à população, cerca de 35,4%.',
    group: 'avancado',
  },
  {
    key: 'riskPremium',
    label: 'Prêmio de risco sobre os juros',
    min: 0,
    max: 4,
    step: 0.25,
    unit: 'p.p.',
    tooltip: 'Juros adicionais cobrados pelos credores dos dois novos países em razão da incerteza.',
    group: 'avancado',
  },
  {
    key: 'mediaInfluence',
    label: 'Influência da mídia',
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    tooltip:
      'Quanto a cobertura da mídia amplifica a reação da opinião pública a crescimento, crises e escândalos. Afeta a aprovação do governo e, portanto, as chances de reeleição.',
    group: 'politica',
  },
  {
    key: 'emendas',
    label: 'Emendas parlamentares',
    min: 0,
    max: 1.5,
    step: 0.01,
    unit: '% do PIB/ano',
    tooltip:
      'Recursos do orçamento indicados por parlamentares, usados também para formar maioria no congresso. Em 2024 somaram cerca de R$ 49 bi (~0,42% do PIB). Sua eficiência depende da transparência.',
    group: 'politica',
  },
  {
    key: 'electoralFund',
    label: 'Fundo eleitoral',
    min: 0,
    max: 0.2,
    step: 0.005,
    unit: '% do PIB/eleição',
    tooltip: 'Financiamento público de campanhas, pago em cada ano eleitoral. Em 2024: R$ 4,96 bi (~0,045% do PIB).',
    group: 'politica',
  },
  {
    key: 'partyFund',
    label: 'Fundo partidário',
    min: 0,
    max: 0.05,
    step: 0.001,
    unit: '% do PIB/ano',
    tooltip: 'Repasse anual aos partidos para manutenção. Em 2024: ~R$ 1,2 bi (~0,01% do PIB).',
    group: 'politica',
  },
  {
    key: 'taxChangeA',
    label: 'Variação da carga tributária em A',
    min: -5,
    max: 5,
    step: 0.25,
    unit: 'p.p. do PIB',
    tooltip:
      'Mudança de impostos em A após a separação (carga de 2023: ~32,4% do PIB). Aumentar melhora o saldo fiscal, reduz o crescimento e custa aprovação no primeiro ano.',
    group: 'politica',
  },
  {
    key: 'taxChangeB',
    label: 'Variação da carga tributária em B',
    min: -5,
    max: 5,
    step: 0.25,
    unit: 'p.p. do PIB',
    tooltip:
      'Mudança de impostos em B após a separação. Aumentar ajuda a cobrir a perda de transferências, mas reduz o crescimento e custa aprovação no primeiro ano.',
    group: 'politica',
  },
  {
    key: 'eventProbability',
    label: 'Probabilidade anual de evento',
    min: 0,
    max: 50,
    step: 5,
    unit: '%',
    tooltip: 'Chance, a cada ano, de ocorrer um evento aleatório (boom de commodities, crise cambial, seca etc.).',
    group: 'avancado',
  },
]

export interface CoefMeta {
  key: keyof Coefficients
  label: string
  min: number
  max: number
  step: number
  doc: string
}

export const COEF_META: CoefMeta[] = [
  {
    key: 'fiscalMultiplierA',
    label: 'Multiplicador fiscal de A',
    min: 0,
    max: 0.5,
    step: 0.01,
    doc: 'Cada 1% do PIB reinvestido eleva o crescimento de A em 0,1 p.p. ao ano (padrão).',
  },
  {
    key: 'fiscalMultiplierB',
    label: 'Multiplicador da perda fiscal em B',
    min: 0,
    max: 0.5,
    step: 0.01,
    doc: 'Cada 1% do PIB de transferências perdidas reduz o crescimento de B em 0,15 p.p. durante o ajuste (padrão).',
  },
  {
    key: 'autonomyRampYears',
    label: 'Anos para a autonomia amadurecer',
    min: 1,
    max: 20,
    step: 1,
    doc: 'O ganho de autonomia sobe linearmente até o valor cheio nesse prazo: criar banco central, regras e agências leva tempo.',
  },
  {
    key: 'autonomyGovernanceWeight',
    label: 'Peso da qualidade de governo na autonomia',
    min: 0,
    max: 2,
    step: 0.1,
    doc: 'Com peso 1, um governo técnico, transparente e com segurança jurídica alta chega a cerca de 1,6 vez o ganho; um governo político, opaco e instável pode zerá-lo.',
  },
  {
    key: 'fiscalAdjustYearsB',
    label: 'Anos de ajuste fiscal de B',
    min: 1,
    max: 15,
    step: 1,
    doc: 'Período em que B reduz gastos e eleva receitas para fechar o buraco das transferências. O efeito sobre o crescimento cai linearmente ao longo desse período.',
  },
  {
    key: 'fiscalPersistentShareB',
    label: 'Efeito fiscal persistente em B (%)',
    min: 0,
    max: 100,
    step: 5,
    doc: 'Fração do efeito fiscal que permanece após o ajuste (menor investimento público). Hipótese a calibrar.',
  },
  {
    key: 'tradeCoefA',
    label: 'Transmissão comercial em A',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Fração das vendas perdidas que vira perda de crescimento em A no ano 1 (padrão 0,3).',
  },
  {
    key: 'tradeCoefB',
    label: 'Transmissão comercial em B',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'B compra majoritariamente de A; ao perder esse fornecedor paga mais caro por importações. Coeficiente aplicado ao comércio perdido medido no PIB de B.',
  },
  {
    key: 'tradeRecoveryYears',
    label: 'Anos de recuperação comercial',
    min: 1,
    max: 30,
    step: 1,
    doc: 'A perda de comércio diminui linearmente até zero (ou até o resíduo) nesse prazo, à medida que surgem mercados alternativos.',
  },
  {
    key: 'tradeResidualShare',
    label: 'Perda comercial residual (%)',
    min: 0,
    max: 100,
    step: 5,
    doc: 'Fração da perda de comércio que nunca é recuperada.',
  },
  {
    key: 'demographicDragPerPoint',
    label: 'Arrasto demográfico por p.p. de idosos',
    min: 0,
    max: 0.3,
    step: 0.01,
    doc: 'Redução de crescimento (p.p.) por ponto percentual de idosos acima da média nacional.',
  },
  {
    key: 'unitedGrowth',
    label: 'Crescimento do Brasil unido (%)',
    min: 0,
    max: 5,
    step: 0.1,
    doc: 'Taxa anual do cenário contrafactual sem separação usado no gráfico nacional.',
  },
  {
    key: 'basePrimaryBalance',
    label: 'Saldo primário de base (% do PIB)',
    min: -3,
    max: 3,
    step: 0.1,
    doc: 'Saldo primário de cada bloco antes dos efeitos da separação.',
  },
  {
    key: 'realInterestRate',
    label: 'Juro real da dívida (%)',
    min: 0,
    max: 8,
    step: 0.25,
    doc: 'Juro real médio sobre a dívida pública, usado na dinâmica da dívida/PIB.',
  },
  {
    key: 'migrationRate',
    label: 'Taxa de migração de referência (%/ano)',
    min: 0,
    max: 1,
    step: 0.01,
    doc: 'Parcela da população do bloco de menor renda que migra por ano com fronteira livre e a diferença de renda de 2023 entre S+SE+CO e N+NE. Escala com o log da razão de renda per capita. Hipótese a calibrar.',
  },
  {
    key: 'migrantProductivity',
    label: 'Produtividade do migrante (%)',
    min: 0,
    max: 150,
    step: 5,
    doc: 'Produção de cada migrante em relação à média do bloco. Define quanto o PIB sobe no destino e cai na origem.',
  },
  {
    key: 'firmRelocation',
    label: 'Realocação de empresas (% do PIB/ano)',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Atividade que muda de bloco por ano para cada nível de diferença entre as políticas para empresas (atrair = +1, neutra = 0, repelir = −1), medida no PIB do bloco de origem.',
  },
  {
    key: 'firmIncentiveGrowth',
    label: 'Ganho próprio dos incentivos (p.p.)',
    min: 0,
    max: 0.5,
    step: 0.01,
    doc: 'Investimento adicional induzido pelos incentivos, mesmo sem atrair empresas do outro bloco.',
  },
  {
    key: 'firmIncentiveCost',
    label: 'Custo dos incentivos (% do PIB)',
    min: 0,
    max: 2,
    step: 0.05,
    doc: 'Renúncia fiscal anual de quem atrai empresas; piora o saldo primário.',
  },
  {
    key: 'firmRepelRevenue',
    label: 'Receita das sobretaxas (% do PIB)',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Receita extra de quem sobretaxa empresas do outro bloco.',
  },
  {
    key: 'firmRepelTradeLoss',
    label: 'Perda comercial extra ao repelir (p.p.)',
    min: 0,
    max: 30,
    step: 1,
    doc: 'Pontos percentuais somados à perda de comércio quando algum bloco repele empresas do outro.',
  },
  {
    key: 'climateFrequency',
    label: 'Frequência de eventos climáticos (%/ano)',
    min: 0,
    max: 100,
    step: 5,
    doc: 'Probabilidade anual de um evento climático relevante em cada bloco no ano 1.',
  },
  {
    key: 'climateTrend',
    label: 'Tendência de aumento dos eventos (p.p./ano)',
    min: 0,
    max: 3,
    step: 0.1,
    doc: 'Quanto a probabilidade anual cresce a cada ano, refletindo eventos extremos mais frequentes.',
  },
  {
    key: 'climateRebound',
    label: 'Reconstrução no ano seguinte (%)',
    min: 0,
    max: 100,
    step: 5,
    doc: 'Parcela do dano de um evento climático recuperada no ano seguinte com obras de reconstrução.',
  },
  {
    key: 'legalCertaintyGrowth',
    label: 'Efeito da segurança jurídica no crescimento',
    min: 0,
    max: 0.05,
    step: 0.001,
    doc: 'Crescimento (p.p.) por ponto do índice de segurança jurídica acima de 60.',
  },
  {
    key: 'legalCertaintyPremium',
    label: 'Efeito da segurança jurídica nos juros',
    min: 0,
    max: 0.1,
    step: 0.005,
    doc: 'Prêmio de risco (p.p.) por ponto do índice de segurança jurídica abaixo de 60.',
  },
  {
    key: 'marketToInvestment',
    label: 'Efeito da bolsa no investimento',
    min: 0,
    max: 0.1,
    step: 0.005,
    doc: 'Crescimento (p.p.) por ponto de retorno da bolsa acima (ou abaixo) do normal de 4% no ano anterior, via custo de capital e confiança.',
  },
  {
    key: 'cycleMunicipal',
    label: 'Gasto extra em eleição municipal (% PIB)',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Ciclo político-orçamentário: obras e serviços ampliados por prefeituras e governo antes das eleições municipais.',
  },
  {
    key: 'cycleGeneral',
    label: 'Gasto extra em eleição geral (% PIB)',
    min: 0,
    max: 2,
    step: 0.05,
    doc: 'Ciclo político-orçamentário antes das eleições para presidente, governadores, senadores e deputados.',
  },
  {
    key: 'cycleMultiplier',
    label: 'Multiplicador do gasto eleitoral',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Quanto o gasto extra em ano eleitoral eleva o crescimento naquele ano.',
  },
  {
    key: 'emendaMultiplier',
    label: 'Multiplicador das emendas',
    min: 0,
    max: 1,
    step: 0.05,
    doc: 'Efeito das emendas sobre o crescimento, multiplicado pela eficiência (alta transparência 100%, atual 70%, baixa 40%). Medido em relação à situação de 2023.',
  },
  {
    key: 'taxDrag',
    label: 'Perda de crescimento por imposto (p.p.)',
    min: 0,
    max: 0.5,
    step: 0.01,
    doc: 'Redução de crescimento por ponto percentual de aumento da carga tributária (e ganho simétrico ao reduzir).',
  },
  {
    key: 'alternationShock',
    label: 'Choque de alternância de governo (p.p.)',
    min: 0,
    max: 2,
    step: 0.05,
    doc: 'Perda de crescimento no ano seguinte a uma troca de governo, pela incerteza sobre a nova política econômica.',
  },
]

export const DEFAULT_COEFFICIENTS: Coefficients = {
  fiscalMultiplierA: 0.1,
  fiscalMultiplierB: 0.15,
  autonomyRampYears: 8,
  autonomyGovernanceWeight: 1,
  fiscalAdjustYearsB: 5,
  fiscalPersistentShareB: 20,
  tradeCoefA: 0.3,
  tradeCoefB: 0.1,
  tradeRecoveryYears: 10,
  tradeResidualShare: 0,
  demographicDragPerPoint: 0.05,
  unitedGrowth: 2.2,
  basePrimaryBalance: 0,
  realInterestRate: 3,
  migrationRate: 0.15,
  migrantProductivity: 60,
  firmRelocation: 0.15,
  firmIncentiveGrowth: 0.05,
  firmIncentiveCost: 0.5,
  firmRepelRevenue: 0.2,
  firmRepelTradeLoss: 10,
  ...DEFAULT_POLITICS_COEFFICIENTS,
  ...DEFAULT_INSTITUTIONS_COEFFICIENTS,
  climateFrequency: 35,
  climateTrend: 0.5,
  climateRebound: 40,
}

/** Valores que dependem do tipo de separação. */
export const SEPARATION_PRESETS: Record<SeparationType, Partial<Params>> = {
  amigavel: { tradeLoss: 10, transitionShock: 2, riskPremium: 0, autonomyGain: 0.35, migrationPolicyA: 'livre', migrationPolicyB: 'livre' },
  intermediaria: {
    tradeLoss: 30,
    transitionShock: 4,
    riskPremium: 0.5,
    autonomyGain: 0.25,
    migrationPolicyA: 'restringir',
    migrationPolicyB: 'restringir',
  },
  conflituosa: {
    tradeLoss: 60,
    transitionShock: 8,
    riskPremium: 1.5,
    autonomyGain: 0.1,
    migrationPolicyA: 'proibir',
    migrationPolicyB: 'proibir',
  },
}

export function defaultParams(separation: SeparationType = 'intermediaria'): Params {
  return {
    separation,
    separationYear: 1,
    partition: ORIGINAL_PARTITION,
    migrationPolicyA: 'livre',
    migrationPolicyB: 'livre',
    firmPolicyA: 'neutra',
    firmPolicyB: 'neutra',
    transferAtoB: 2.5,
    reinvestShare: 30,
    tradeExposureA: 8,
    tradeLoss: 30,
    taxMigration: 1,
    energyCostA: 0.3,
    transitionShock: 4,
    shockHalfLife: 2,
    resourceBonusB: 0.3,
    autonomyGain: 0.25,
    debtShareB: 19.6,
    riskPremium: 0.5,
    eventsEnabled: true,
    eventProbability: 15,
    decisionsEnabled: false,
    climateEnabled: true,
    climatePrepA: 'medio',
    climatePrepB: 'medio',
    ...DEFAULT_POLITICS_PARAMS,
    ...DEFAULT_INSTITUTIONS_PARAMS,
    ...SEPARATION_PRESETS[separation],
  }
}

export function applySeparation(params: Params, separation: SeparationType): Params {
  return { ...params, separation, ...SEPARATION_PRESETS[separation] }
}
