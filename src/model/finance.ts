// Finanças públicas do Brasil (dados de 2026, com fonte). Usado pelas telas
// educativas e pelas calculadoras de promessas, previdência e dívida.
// Valores em R$ correntes de 2026, salvo indicação.

export interface Sourced {
  value: number
  /** Data ou período de referência */
  ref: string
  source: string
  url: string
}

const s = (value: number, ref: string, source: string, url: string): Sourced => ({ value, ref, source, url })

const LOA = 'https://www.gov.br/planejamento/pt-br/assuntos/orcamento/orcamento-cidadao/2026_02_18_oc-loa-2026.pdf'
const RARDP =
  'https://www.gov.br/planejamento/pt-br/assuntos/noticias-defeso-eleitoral-2026/governo-reduz-contencao-total-das-despesas-em-2026-para-r-16-1-bilhoes/4o-rardp-2026-coletiva-de-imprensa-apresentacao.pdf/@@display-file/file'
const BEPS =
  'https://www.gov.br/previdencia/pt-br/assuntos/previdencia-social/Dados-estatisticos-previdencia-social-e-inss/boletins-da-previdencia-social/2026/beps082026_final.pdf'
const DL172 = 'https://www2.camara.leg.br/legin/fed/decleg/2022/decretolegislativo-172-21-dezembro-2022-793529-publicacaooriginal-166604-pl.html'

export const FINANCE = {
  // Remuneração e estrutura dos cargos ---------------------------------------
  subsidioFederal: s(46366.19, 'desde fev/2025', 'Decreto Legislativo 172/2022 (deputados, senadores, presidente, vice e ministros)', DL172),
  subsidioStf: s(46366.19, 'desde fev/2025', 'Lei 14.520/2023 (teto constitucional)', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14520.htm'),
  deputadoVerbaGabinete: s(165806.07, 'fev/2026', 'Câmara, Ato da Mesa 243/2026', 'https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/verba-de-gabinete'),
  deputadoSecretariosMax: s(25, '2026', 'Câmara (de 5 a 25 secretários parlamentares)', 'https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/verba-de-gabinete'),
  deputadoCotaMin: s(41612.55, '2026', 'Câmara, cota parlamentar (DF)', 'https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar'),
  deputadoCotaMax: s(58474.7, '2026', 'Câmara, cota parlamentar (RR)', 'https://www2.camara.leg.br/comunicacao/assessoria-de-imprensa/guia-para-jornalistas/cota-parlamentar'),
  deputadoMoradia: s(4253, '2026', 'Câmara, auxílio-moradia (para quem não usa imóvel funcional)', 'https://www2.camara.leg.br/transparencia/imoveis-funcionais-e-auxilio-moradia'),
  senadorComissionadosMax: s(50, '2026', 'Senado, cargos comissionados por gabinete', 'https://www12.senado.leg.br/perguntas-frequentes/canais-de-atendimento/gestao-de-pessoas/22.-qual-e-o-total-de-cargos-comissionados-que-o-parlamentar-pode-ter-em-seu-gabinete'),
  senadorCotaFixa: s(15000, '2026', 'Senado, CEAPS (parte fixa, além de passagens)', 'https://www12.senado.leg.br/transparencia/perguntas-frequentes-1/sobre-os-senadores/o-que-e-ceaps'),
  senadorMoradia: s(5500, '2026', 'Senado, auxílio-moradia', 'https://www12.senado.leg.br/perguntas-frequentes/canais-de-atendimento/senadores/qual-o-valor-do-auxilio-moradia'),
  orcamentoCamara: s(9.0331e9, 'PLOA 2026', 'Nota técnica conjunta Conorf/Conof', 'https://www12.senado.leg.br/orcamento/documentos/estudos/tipos-de-estudos/notas-tecnicas-e-informativos/notatecnicaconjunta_ploa-2026_.pdf'),
  orcamentoSenado: s(6.6491e9, 'PLOA 2026', 'Nota técnica conjunta Conorf/Conof', 'https://www12.senado.leg.br/orcamento/documentos/estudos/tipos-de-estudos/notas-tecnicas-e-informativos/notatecnicaconjunta_ploa-2026_.pdf'),
  orcamentoLegislativo: s(19.39e9, 'LOA 2026', 'MPO, Orçamento Cidadão (inclui TCU)', LOA),
  ministerios: s(38, 'mar/2026', 'Poder360', 'https://www.poder360.com.br/poder-governo/com-38-ministerios-lula-diz-que-montou-o-pais-para-funcionar/'),

  // Orçamento federal ---------------------------------------------------------
  despesaTotal: s(6.54e12, 'LOA 2026', 'Agência Senado (inclui R$ 1,8 tri de refinanciamento da dívida)', 'https://www12.senado.leg.br/noticias/materias/2026/01/15/orcamento-2026-e-sancionado-com-previsao-de-superavit-de-rs-34-2-bi'),
  despesaPrimaria: s(2667.7e9, '4º bim/2026', 'MPO, Relatório de Avaliação (RARDP)', RARDP),
  receitaLiquida: s(2586.8e9, '4º bim/2026', 'MPO, RARDP (18,95% do PIB)', RARDP),
  rgpsBeneficios: s(1119.4e9, '4º bim/2026', 'MPO, RARDP', RARDP),
  rgpsArrecadacao: s(786.4e9, '4º bim/2026', 'MPO, RARDP', RARDP),
  pessoal: s(445.4e9, '4º bim/2026', 'MPO, RARDP', RARDP),
  bpc: s(142.9e9, '4º bim/2026', 'MPO, RARDP (BPC e RMV)', RARDP),
  abonoSeguro: s(98.5e9, '4º bim/2026', 'MPO, RARDP', RARDP),
  bolsaFamilia: s(158.63e9, 'LOA 2026', 'MPO, Orçamento Cidadão', LOA),
  discricionarias: s(244.4e9, '4º bim/2026', 'MPO, RARDP (Executivo)', RARDP),
  emendas: s(61e9, 'LOA 2026', 'Agência Senado (individuais, bancada e comissão)', 'https://www12.senado.leg.br/noticias/materias/2026/01/15/orcamento-2026-e-sancionado-com-previsao-de-superavit-de-rs-34-2-bi'),
  emendasIndividuais: s(26.6e9, 'LOA 2026', 'Agência Senado (emendas individuais; bancada R$ 11,2 bi; comissão R$ 12,1 bi)', 'https://www12.senado.leg.br/noticias/materias/2026/01/15/orcamento-2026-e-sancionado-com-previsao-de-superavit-de-rs-34-2-bi'),
  pisoSaude: s(245.5e9, 'PLOA 2026', 'Nota técnica Conorf/Conof (15% da RCL, art. 198)', 'https://www12.senado.leg.br/orcamento/documentos/estudos/tipos-de-estudos/notas-tecnicas-e-informativos/notatecnicaconjunta_ploa-2026_.pdf'),
  pisoEducacao: s(133.6e9, 'PLOA 2026', 'Nota técnica Conorf/Conof (18% dos impostos, art. 212)', 'https://www12.senado.leg.br/orcamento/documentos/estudos/tipos-de-estudos/notas-tecnicas-e-informativos/notatecnicaconjunta_ploa-2026_.pdf'),
  obrigatoriasShare: s(92, 'LOA 2026', 'MPO, Orçamento Cidadão (92% obrigatórias, 8% discricionárias)', LOA),
  juros12m: s(1.182e12, '12 meses até ago/2026', 'Banco Central via Agência Brasil (setor público, 8,86% do PIB)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/contas-publicas-tem-deficit-de-r-10-bilhoes-em-agosto'),
  jurosPib: s(8.86, '12 meses até ago/2026', 'Banco Central via Agência Brasil', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/contas-publicas-tem-deficit-de-r-10-bilhoes-em-agosto'),

  // Programas sociais ----------------------------------------------------------
  bolsaFamilias: s(19.29e6, 'set/2026', 'MDS via Agência Brasil', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/beneficiarios-com-nis-de-final-0-recebem-bolsa-familia-de-setembro'),
  bolsaMedio: s(777, 'out/2026', 'Governo federal, após reajuste de 15% (piso de R$ 691)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/bolsa-familia-e-reajustado-em-15-medida-vale-partir-de-outubro'),
  bolsaPiso: s(691, 'out/2026', 'Decreto 13.120/2026', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/bolsa-familia-e-reajustado-em-15-medida-vale-partir-de-outubro'),

  // Dívida e juros ----------------------------------------------------------------
  dividaBrutaPib: s(82.9, 'ago/2026', 'Banco Central (governo geral)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/contas-publicas-tem-deficit-de-r-10-bilhoes-em-agosto'),
  dividaBruta: s(11.055e12, 'ago/2026', 'Banco Central (governo geral)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/contas-publicas-tem-deficit-de-r-10-bilhoes-em-agosto'),
  dpf: s(9.293e12, 'ago/2026', 'Tesouro Nacional via Agência Brasil', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/divida-publica-federal-fica-estavel-em-agosto-e-chega-r-929-tri'),
  dpfInterna: s(8.944e12, 'ago/2026', 'Tesouro Nacional (DPMFi)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/divida-publica-federal-fica-estavel-em-agosto-e-chega-r-929-tri'),
  dpfExterna: s(348.26e9, 'ago/2026', 'Tesouro Nacional (DPFe, US$ 67,21 bi)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/divida-publica-federal-fica-estavel-em-agosto-e-chega-r-929-tri'),
  selic: s(13.75, 'desde 16/9/2026', 'Banco Central (Copom)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/bc-reduz-juros-basicos-para-1375-ao-ano'),

  // Salário mínimo e INSS ------------------------------------------------------------
  salarioMinimo: s(1621, '2026', 'Governo federal (INPC + 2,5% de ganho real)', 'https://agenciabrasil.ebc.com.br/economia/noticia/2026-02/salario-minimo-de-r-1621-comeca-ser-pago-nesta-segunda'),
  custoPorRealMinimo: s(413.2e6, 'PLDO 2027', 'Projeto de LDO 2027: custo anual de cada R$ 1 a mais no mínimo', 'https://www.cnnbrasil.com.br/economia/money/macroeconomia/proposta-do-minimo-de-2027-pode-elevar-despesas-do-governo-em-r-496-bi/'),
  beneficiosInss: s(42660183, 'ago/2026', 'BEPS (benefícios emitidos)', BEPS),
  beneficiosPiso: s(29485803, 'ago/2026', 'BEPS (benefícios de exatamente 1 salário mínimo: 69,12%)', BEPS),
  contribuintesRgps: s(62.18e6, 'média de 2024', 'BEPS (contribuintes por mês)', BEPS),
  idosos2023: s(15.6, '2023', 'IBGE, projeção 2024 (60 anos ou mais, % da população)', 'https://agenciagov.ebc.com.br/noticias/202408/populacao-do-pais-vai-parar-de-crescer-em-2041'),
  idosos2070: s(37.8, '2070', 'IBGE, projeção 2024 (60 anos ou mais, % da população)', 'https://agenciagov.ebc.com.br/noticias/202408/populacao-do-pais-vai-parar-de-crescer-em-2041'),
  reforma2019: s(800e9, '10 anos', 'Agência Senado (EC 103/2019)', 'https://www12.senado.leg.br/noticias/materias/2019/11/12/promulgada-emenda-constitucional-da-reforma-da-previdencia'),
}

/** PIB de 2026 implícito na receita líquida (R$ 2.586,8 bi = 18,95% do PIB). */
export const PIB_2026 = FINANCE.receitaLiquida.value / 0.1895

/** Orçamento por ministério (LOA 2026, MPO). */
export const MINISTRIES_2026 = [
  { name: 'Previdência Social', value: 1.15e12 },
  { name: 'Desenvolvimento e Assistência Social', value: 302.85e9 },
  { name: 'Saúde', value: 270.34e9 },
  { name: 'Educação', value: 233.71e9 },
  { name: 'Defesa', value: 142.18e9 },
  { name: 'Trabalho e Emprego', value: 123.14e9 },
  { name: 'Justiça e Segurança Pública', value: 26.4e9 },
  { name: 'Fazenda', value: 23.21e9 },
  { name: 'Transportes', value: 19.21e9 },
  { name: 'Cidades', value: 16.58e9 },
]

// Custo dos cargos -------------------------------------------------------------------

export interface OfficeCost {
  office: string
  seats: number | null
  /** Subsídio mensal */
  salary: number
  /** Outras verbas mensais (gabinete, cota, moradia) */
  allowances: { label: string; value: number }[]
  staff: string
  notes: string
}

const avgCota = (FINANCE.deputadoCotaMin.value + FINANCE.deputadoCotaMax.value) / 2

export const OFFICE_COSTS: OfficeCost[] = [
  {
    office: 'Deputado(a) federal',
    seats: 513,
    salary: FINANCE.subsidioFederal.value,
    allowances: [
      { label: 'Verba de gabinete (paga os assessores)', value: FINANCE.deputadoVerbaGabinete.value },
      { label: 'Cota parlamentar média (passagens, escritório, divulgação)', value: avgCota },
      { label: 'Auxílio-moradia (se não usar apartamento funcional)', value: FINANCE.deputadoMoradia.value },
    ],
    staff: 'De 5 a 25 secretários parlamentares.',
    notes: 'Também recebe ajuda de custo de um subsídio no início e no fim do mandato e tem plano de saúde.',
  },
  {
    office: 'Senador(a)',
    seats: 81,
    salary: FINANCE.subsidioFederal.value,
    allowances: [
      { label: 'Cota fixa (além de passagens aéreas)', value: FINANCE.senadorCotaFixa.value },
      { label: 'Auxílio-moradia (se não usar imóvel funcional)', value: FINANCE.senadorMoradia.value },
    ],
    staff: 'Até 50 cargos comissionados no gabinete, pagos pelo orçamento do Senado.',
    notes: 'O custo dos assessores entra no orçamento do Senado (R$ 6,6 bi em 2026), não na cota.',
  },
  {
    office: 'Presidente da República',
    seats: 1,
    salary: FINANCE.subsidioFederal.value,
    allowances: [],
    staff: `Comanda ${FINANCE.ministerios.value} ministérios e milhares de cargos de confiança.`,
    notes: 'Moradia oficial (Palácio da Alvorada), segurança e transporte pagos pelo Estado.',
  },
  {
    office: 'Ministro(a) do STF',
    seats: 11,
    salary: FINANCE.subsidioStf.value,
    allowances: [],
    staff: 'Gabinete com assessores e servidores do tribunal.',
    notes: 'O subsídio dos ministros do STF é o teto do serviço público (art. 37, XI).',
  },
  {
    office: 'Deputado(a) estadual',
    seats: null,
    salary: FINANCE.subsidioFederal.value * 0.75,
    allowances: [],
    staff: 'Varia por Assembleia.',
    notes: 'Fixado por lei estadual, no máximo 75% do subsídio do deputado federal (art. 27, § 2º). Valor mostrado é o teto.',
  },
  {
    office: 'Vereador(a)',
    seats: null,
    salary: FINANCE.subsidioFederal.value * 0.75 * 0.75,
    allowances: [],
    staff: 'Varia por Câmara Municipal.',
    notes: 'Teto entre 20% e 75% do subsídio do deputado estadual, conforme a população (art. 29, VI). Valor mostrado é o teto das maiores cidades.',
  },
]

export function monthlyTotal(c: OfficeCost): number {
  return c.salary + c.allowances.reduce((a, x) => a + x.value, 0)
}

/** Teto do subsídio de vereador pela população (art. 29, VI). */
export function councilorCapShare(pop: number): number {
  if (pop <= 10_000) return 0.2
  if (pop <= 50_000) return 0.3
  if (pop <= 100_000) return 0.4
  if (pop <= 300_000) return 0.5
  if (pop <= 500_000) return 0.6
  return 0.75
}

// Promessas de campanha ----------------------------------------------------------------

export interface Promise {
  id: string
  label: string
  /** Parâmetro ajustável pelo jogador */
  param: { label: string; min: number; max: number; step: number; default: number; unit: string }
  /** Custo anual adicional em R$, dado o parâmetro */
  cost: (x: number) => number
  explain: (x: number) => string
}

export const PROMISES: Promise[] = [
  {
    id: 'bolsa',
    label: 'Aumentar o Bolsa Família',
    param: { label: 'Benefício médio por família', min: 800, max: 10000, step: 50, default: 1500, unit: 'R$/mês' },
    cost: (x) => (x - FINANCE.bolsaMedio.value) * FINANCE.bolsaFamilias.value * 12,
    explain: (x) =>
      `${(FINANCE.bolsaFamilias.value / 1e6).toFixed(1).replace('.', ',')} milhões de famílias × (R$ ${x.toLocaleString('pt-BR')} − R$ ${FINANCE.bolsaMedio.value} atuais) × 12 meses.`,
  },
  {
    id: 'minimo',
    label: 'Aumentar o salário mínimo',
    param: { label: 'Novo salário mínimo', min: 1621, max: 5000, step: 10, default: 2000, unit: 'R$' },
    cost: (x) => (x - FINANCE.salarioMinimo.value) * FINANCE.custoPorRealMinimo.value,
    explain: (x) =>
      `Cada R$ 1 a mais no mínimo aumenta em R$ 413 milhões por ano os gastos com aposentadorias, BPC, abono e seguro-desemprego. São R$ ${(x - FINANCE.salarioMinimo.value).toLocaleString('pt-BR')} a mais. Não inclui o efeito sobre empresas, prefeituras e estados.`,
  },
  {
    id: 'professores',
    label: 'Contratar professores federais',
    param: { label: 'Professores contratados', min: 0, max: 500000, step: 10000, default: 100000, unit: 'pessoas' },
    cost: (x) => x * 6000 * 13.33 * 1.2,
    explain: () => 'Salário ilustrativo de R$ 6.000 por mês, com 13º, férias e encargos (cerca de 13,3 salários + 20%).',
  },
  {
    id: 'saude',
    label: 'Aumentar o orçamento da saúde',
    param: { label: 'Aumento', min: 0, max: 100, step: 5, default: 20, unit: '%' },
    cost: (x) => (FINANCE.pisoSaude.value * x) / 100,
    explain: () => 'Percentual sobre o piso federal da saúde em 2026 (R$ 245,5 bi).',
  },
  {
    id: 'cortar-politicos',
    label: 'Cortar pela metade salários e verbas de deputados e senadores',
    param: { label: 'Corte', min: 0, max: 100, step: 10, default: 50, unit: '%' },
    cost: (x) =>
      -((monthlyTotal(OFFICE_COSTS[0]) * 513 + monthlyTotal(OFFICE_COSTS[1]) * 81) * 12 * x) / 100,
    explain: () => 'Economia nos subsídios e verbas dos 594 parlamentares federais (não inclui o restante do orçamento da Câmara e do Senado).',
  },
]

export type Verdict = 'cabe' | 'dificil' | 'muito-dificil' | 'impossivel' | 'economia'

/** Classifica uma promessa pelo tamanho do custo frente ao orçamento. */
export function verdict(cost: number): Verdict {
  if (cost < 0) return 'economia'
  const discr = FINANCE.discricionarias.value
  if (cost <= discr * 0.05) return 'cabe'
  if (cost <= discr * 0.3) return 'dificil'
  if (cost <= PIB_2026 * 0.03) return 'muito-dificil'
  return 'impossivel'
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  economia: 'Gera economia: mas compare o tamanho com os grandes gastos.',
  cabe: 'Cabe no orçamento com remanejamentos.',
  dificil: 'Difícil: exige cortar outros programas do orçamento livre do governo.',
  'muito-dificil': 'Muito difícil: maior que boa parte do orçamento livre; exige aumento de impostos, cortes grandes ou mais dívida.',
  impossivel: 'Impossível sem efeitos graves: custa mais de 3% do PIB por ano.',
}

/** Formas de pagar uma promessa, em quantidades equivalentes. */
export function fundingOptions(cost: number) {
  return {
    /** % do orçamento livre (discricionárias) do Executivo */
    discretionaryShare: (cost / FINANCE.discricionarias.value) * 100,
    /** % da receita líquida do governo federal */
    revenueShare: (cost / FINANCE.receitaLiquida.value) * 100,
    /** % do PIB */
    gdpShare: (cost / PIB_2026) * 100,
    /** Aumento de impostos necessário, em pontos da carga tributária */
    taxPoints: (cost / PIB_2026) * 100,
    /** Juros anuais extras se tudo for pago com dívida por 10 anos (juro real de ~8%) */
    debtInterest10y: cost * 10 * 0.08,
  }
}

// Dívida -------------------------------------------------------------------------------

export interface DebtInput {
  years: number
  /** Dívida inicial, % do PIB */
  debt: number
  /** Juro real médio, % */
  realRate: number
  /** Crescimento real do PIB, % */
  growth: number
  /** Saldo primário, % do PIB (positivo = superávit) */
  primary: number
}

export const DEFAULT_DEBT: DebtInput = { years: 15, debt: FINANCE.dividaBrutaPib.value, realRate: 7, growth: 2, primary: 0 }

export function simulateDebt(x: DebtInput): { year: number; debt: number }[] {
  const out = [{ year: 0, debt: x.debt }]
  let d = x.debt
  for (let t = 1; t <= x.years; t++) {
    d = (d * (1 + x.realRate / 100)) / (1 + x.growth / 100) - x.primary
    out.push({ year: t, debt: d })
  }
  return out
}

/** Superávit primário que mantém a dívida estável: d × (r − g) ÷ (1 + g). */
export function stabilizingPrimary(x: DebtInput): number {
  return (x.debt * (x.realRate - x.growth)) / (100 + x.growth)
}

// Previdência --------------------------------------------------------------------------

export interface PensionInput {
  years: number
  /** Ganho real anual do salário mínimo, % */
  minWageReal: number
  /** Crescimento real do PIB, % */
  growth: number
  /** Benefícios atrelados ao mínimo seguem o mínimo? */
  linkedToMinWage: boolean
  /** Parcela do gasto do RGPS em benefícios de 1 mínimo (hipótese a calibrar), % */
  minWageSpendingShare: number
}

export const DEFAULT_PENSION: PensionInput = {
  years: 30,
  minWageReal: 2.5,
  growth: 2,
  linkedToMinWage: true,
  minWageSpendingShare: 45,
}

/**
 * Projeção didática do RGPS em % do PIB: o número de benefícios cresce com a
 * proporção de idosos (IBGE: 15,6% em 2023 → 37,8% em 2070), o valor dos
 * benefícios de 1 mínimo acompanha o ganho real do mínimo e a arrecadação
 * cresce com o PIB.
 */
export function simulatePension(x: PensionInput) {
  const pib = PIB_2026
  const spend0 = (FINANCE.rgpsBeneficios.value / pib) * 100
  const rev0 = (FINANCE.rgpsArrecadacao.value / pib) * 100
  const share = x.minWageSpendingShare / 100
  const oldShare = (y: number) => FINANCE.idosos2023.value + ((FINANCE.idosos2070.value - FINANCE.idosos2023.value) * (y - 2023)) / (2070 - 2023)
  const out: { year: number; spending: number; revenue: number; deficit: number }[] = []
  for (let t = 0; t <= x.years; t++) {
    const year = 2026 + t
    const beneficiaries = oldShare(year) / oldShare(2026)
    const benefitValue = share * Math.pow(1 + (x.linkedToMinWage ? x.minWageReal : 0) / 100, t) + (1 - share)
    const gdpIndex = Math.pow(1 + x.growth / 100, t)
    // O número de benefícios cresce com os idosos; o PIB cresce com a economia.
    const spending = (spend0 * beneficiaries * benefitValue) / gdpIndex
    const revenue = rev0
    out.push({ year, spending, revenue, deficit: spending - revenue })
  }
  return out
}
