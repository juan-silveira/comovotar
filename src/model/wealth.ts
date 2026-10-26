// Patrimônio pessoal do jogador: começa na faixa real declarada pelos eleitos
// (TSE), cresce com o salário poupado e rendimentos e pode crescer muito mais
// com propostas ilícitas. Cada proposta aceita aumenta a exposição; com o
// tempo, a imprensa e os órgãos de controle podem abrir uma investigação que
// termina em absolvição, prescrição ou condenação, com perda do cargo e
// inelegibilidade (Lei da Ficha Limpa). O patrimônio também paga campanhas,
// dentro ou fora da lei.

import { mulberry32 } from './events'
import type { Office } from './bills'
import { FINANCE } from './finance'
import { hashString } from './legislature'
import TSE from './tse-patrimonio.json'

export interface WealthStats {
  year: number
  group: 'eleitos' | 'candidatos'
  n: number
  p25: number
  median: number
  p75: number
  p90: number
  zeroShare: number
  millionShare: number
}

export const TSE_PATRIMONIO = TSE as unknown as {
  fetchedAt: string
  source: string
  offices: Partial<Record<Office, WealthStats>>
  reelectedGrowth: Partial<Record<Office, { n: number; medianGrowth: number; grewShare: number; doubledShare: number; median2022: number; median2026: number }>>
}

/** Estatística do TSE para o cargo; presidente e ministro do STF usam a dos senadores (aproximação). */
export function statsFor(office: Office): { stats: WealthStats; proxy: boolean } {
  const own = TSE_PATRIMONIO.offices[office]
  if (own) return { stats: own, proxy: false }
  return { stats: TSE_PATRIMONIO.offices.senador as WealthStats, proxy: true }
}

/** Patrimônio inicial: sorteado entre os quartis reais do cargo (distribuição log-normal). */
export function initialWealth(office: Office, seed: number): number {
  const { stats } = statsFor(office)
  const mu = Math.log(Math.max(1, stats.median))
  const sigma = (Math.log(Math.max(1, stats.p75)) - Math.log(Math.max(1, stats.p25))) / 1.349
  const rng = mulberry32((seed ^ hashString(`patrimonio:${office}`)) >>> 0)
  // Normal aproximada (soma de uniformes), limitada aos quartis (±0,674 desvio).
  const z = Math.max(-0.674, Math.min(0.674, (rng() + rng() + rng() - 1.5) * 2))
  return Math.round(Math.exp(mu + sigma * z) / 1000) * 1000
}

/** Proporção do subsídio de deputado estadual paga a vereadores, pela população (CF, art. 29, VI). */
function councilShare(pop: number): number {
  if (pop <= 10_000) return 0.2
  if (pop <= 50_000) return 0.3
  if (pop <= 100_000) return 0.4
  if (pop <= 300_000) return 0.5
  if (pop <= 500_000) return 0.6
  return 0.75
}

/** Salário bruto mensal do cargo, R$. Governador e prefeito são estimativas (cada ente fixa o seu). */
export function monthlySalary(office: Office, muniPop = 100_000): number {
  const fed = FINANCE.subsidioFederal.value
  switch (office) {
    case 'presidente':
    case 'deputado-federal':
    case 'senador':
      return fed
    case 'ministro-stf':
      return FINANCE.subsidioStf.value
    case 'deputado-estadual':
    case 'governador':
      return fed * 0.75
    case 'prefeito':
      return Math.min(fed * 0.75, 12_000 + Math.sqrt(muniPop) * 25)
    case 'vereador':
      return fed * 0.75 * councilShare(muniPop)
  }
}

/** Variação legal do patrimônio no ano: parte do salário líquido poupada + rendimento real. */
export function legalYearChange(wealth: number, office: Office | null, muniPop?: number): { savings: number; returns: number } {
  const savings = office ? monthlySalary(office, muniPop) * 13.33 * 0.75 * 0.25 : 0
  return { savings: Math.round(savings), returns: Math.round(Math.max(0, wealth) * 0.03) }
}

// Propostas ilícitas ---------------------------------------------------------------------------

export interface IllicitOffer {
  id: string
  offices: Office[]
  title: string
  text: string
  /** Valor oferecido, R$ */
  amount: (office: Office, muniPop: number) => number
  /** Pontos de exposição se aceitar */
  risk: number
  law: string
  /** Referência legal (id em CONSTITUTION) */
  ref: string
}

const EXEC: Office[] = ['presidente', 'governador', 'prefeito']
const LEG: Office[] = ['vereador', 'deputado-estadual', 'deputado-federal', 'senador']

const scaleByOffice = (office: Office, muniPop: number, values: Partial<Record<Office, number>>) => {
  const v = values[office] ?? 0
  return office === 'prefeito' || office === 'vereador' ? Math.round(v * Math.max(0.2, Math.min(5, Math.sqrt(muniPop / 100_000)))) : v
}

export const ILLICIT_OFFERS: IllicitOffer[] = [
  {
    id: 'licitacao',
    offices: EXEC,
    title: 'Empreiteira oferece “ajuda” para vencer licitação',
    text: 'Uma construtora propõe um pagamento por fora se o edital de uma grande obra for desenhado para que só ela possa vencer.',
    amount: (o, pop) => scaleByOffice(o, pop, { presidente: 8_000_000, governador: 3_000_000, prefeito: 400_000 }),
    risk: 3,
    law: 'Corrupção passiva (Código Penal, art. 317) e fraude à licitação (Lei 14.133/2021).',
    ref: 'cp317',
  },
  {
    id: 'rachadinha',
    offices: LEG,
    title: 'Assessor sugere a “rachadinha”',
    text: 'Um assessor propõe contratar funcionários que devolveriam parte do salário a você todo mês, pagos com a verba de gabinete.',
    amount: (o, pop) => scaleByOffice(o, pop, { 'deputado-federal': 600_000, senador: 500_000, 'deputado-estadual': 300_000, vereador: 60_000 }),
    risk: 2,
    law: 'Peculato (Código Penal, art. 312) e improbidade administrativa (Lei 8.429/1992).',
    ref: 'cp317',
  },
  {
    id: 'voto',
    offices: LEG,
    title: 'Lobista oferece dinheiro pelo seu voto',
    text: 'Um representante de um setor econômico oferece pagamento para você votar a favor de um projeto do interesse dele.',
    amount: (o, pop) => scaleByOffice(o, pop, { 'deputado-federal': 1_000_000, senador: 2_000_000, 'deputado-estadual': 300_000, vereador: 50_000 }),
    risk: 3,
    law: 'Corrupção passiva (Código Penal, art. 317).',
    ref: 'cp317',
  },
  {
    id: 'superfaturamento',
    offices: ['deputado-federal', 'senador', 'deputado-estadual'],
    title: 'Prefeito aliado propõe superfaturar obra paga com sua emenda',
    text: 'A obra paga com a sua emenda sairia mais cara do que vale, e 10% voltariam para você em dinheiro vivo.',
    amount: (o, pop) => scaleByOffice(o, pop, { 'deputado-federal': 2_000_000, senador: 3_500_000, 'deputado-estadual': 400_000 }),
    risk: 3,
    law: 'Corrupção passiva, peculato e lavagem de dinheiro (Lei 9.613/1998).',
    ref: 'cp317',
  },
  {
    id: 'palestra',
    offices: ['ministro-stf'],
    title: 'Escritório com causas no tribunal convida para palestra paga',
    text: 'Um escritório que tem processos no tribunal oferece um cachê alto e viagem para você palestrar num evento no exterior.',
    amount: () => 300_000,
    risk: 1,
    law: 'Palestras remuneradas não são proibidas, mas críticos apontam conflito de interesses; a Lei Orgânica da Magistratura e o Código de Processo Civil (art. 144 e 145) tratam de impedimento e suspeição.',
    ref: 'cp317',
  },
]

export function offerFor(office: Office, seed: number, t: number, frequency = 1): IllicitOffer | null {
  const pool = ILLICIT_OFFERS.filter((o) => o.offices.includes(office))
  if (pool.length === 0) return null
  const rng = mulberry32((seed ^ hashString(`oferta:${t}:${office}`)) >>> 0)
  if (rng() > 0.4 * frequency) return null
  return pool[Math.floor(rng() * pool.length)]
}

// Investigação -------------------------------------------------------------------------------

export type CaseStage = 'reportagem' | 'inquerito' | 'denuncia' | 'julgamento'

export interface CriminalCase {
  stage: CaseStage
  startYear: number
  /** Ano (t) em que o caso avança para a próxima fase */
  nextYear: number
  /** Valor que a investigação apura, R$ */
  amount: number
  defense: 'nenhuma' | 'advogado' | 'delacao' | null
}

/** Chance anual de o esquema vir à tona. */
export function exposureChance(exposure: number, mediaInfluence: number): number {
  return 1 - Math.exp(-exposure * 0.07 * (1 + mediaInfluence / 100))
}

export const CASE_STAGES: Record<CaseStage, { title: string; text: string; approval: number }> = {
  reportagem: {
    title: 'Reportagem revela suspeitas contra você',
    text: 'Um veículo de imprensa publica documentos e mensagens que apontam o esquema. A oposição pede explicações.',
    approval: -6,
  },
  inquerito: {
    title: 'Polícia e Ministério Público abrem inquérito',
    text: 'Investigadores cumprem mandados de busca e apreensão. Como você tem cargo, o caso pode ir para um tribunal superior (foro por prerrogativa de função).',
    approval: -4,
  },
  denuncia: {
    title: 'Ministério Público apresenta denúncia',
    text: 'O tribunal recebe a denúncia e você vira réu. A defesa começa a ser preparada.',
    approval: -3,
  },
  julgamento: {
    title: 'Julgamento',
    text: '',
    approval: 0,
  },
}

/** Chance de condenação no julgamento, conforme a defesa. */
export function convictionChance(defense: CriminalCase['defense']): number {
  if (defense === 'advogado') return 0.35
  if (defense === 'delacao') return 1
  return 0.55
}

export const INELIGIBILITY_YEARS = 8

// Campanha ------------------------------------------------------------------------------------

/** Teto de gastos de campanha em 2026 (repetido de 2022, Portaria TSE 449/2026); estimativas para governo, Senado e municípios. */
export function campaignCeiling(office: Office, ufPop: number, muniPop = 100_000): number {
  const spPop = 46_000_000
  const smallPop = 700_000
  const govern = 3_550_000 + ((26_600_000 - 3_550_000) * Math.max(0, ufPop - smallPop)) / (spPop - smallPop)
  const electors = muniPop * 0.75
  switch (office) {
    case 'presidente':
      return 88_900_000
    case 'deputado-federal':
      return 3_170_000
    case 'deputado-estadual':
      return 1_270_000
    case 'governador':
      return Math.round(govern)
    case 'senador':
      return Math.round((govern * 7.1) / 26.6)
    case 'prefeito':
      return Math.round(Math.max(160_000, electors * 7))
    case 'vereador':
      return Math.round(Math.max(16_000, electors * 0.45))
    case 'ministro-stf':
      return 0
  }
}

export type CampaignSpend = 'fundo' | 'proprio' | 'caixa2'

export const CAMPAIGN_SPEND: Record<CampaignSpend, { label: string; bonus: number; share: number; risk: number }> = {
  fundo: { label: 'Só os recursos do partido (fundo eleitoral)', bonus: 0, share: 0, risk: 0 },
  proprio: { label: 'Bancar parte da campanha com seu dinheiro (autofinanciamento)', bonus: 2, share: 0.1, risk: 0 },
  caixa2: { label: 'Caixa dois: gastar dinheiro não declarado', bonus: 5, share: 0.3, risk: 3 },
}
