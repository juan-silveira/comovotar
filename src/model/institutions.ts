// Instituições: perfil do ministério, tribunal constitucional, apoio no
// Congresso, segurança jurídica e bolsa de valores. Cada bloco, após a
// separação, tem o seu próprio tribunal de 11 ministros, Congresso e bolsa.
//
// Linguagem neutra: os efeitos refletem mecanismos discutidos na literatura
// (previsibilidade, custo de capital, governabilidade), sem atribuir
// intenções a pessoas ou grupos.

import { mulberry32 } from './events'

export type Cabinet = 'tecnico' | 'misto' | 'politico'
export type CourtNomination = 'carreira' | 'alinhado'

export const CABINET_LABELS: Record<Cabinet, string> = {
  tecnico: 'Técnico',
  misto: 'Misto',
  politico: 'Político',
}

export const CABINET_DESCRIPTIONS: Record<Cabinet, string> = {
  tecnico:
    'Ministros escolhidos por formação e experiência na área. Políticas mais eficientes e juros menores, mas menos apoio no Congresso, porque menos cargos vão para partidos aliados.',
  misto:
    'Áreas econômicas com perfil técnico e articulação política com aliados. Equilíbrio entre eficiência e governabilidade.',
  politico:
    'Ministérios distribuídos a partidos da coalizão (presidencialismo de coalizão). Mais apoio no Congresso, porém políticas menos eficientes e juros um pouco maiores.',
}

export const COURT_LABELS: Record<CourtNomination, string> = {
  carreira: 'Juristas de carreira',
  alinhado: 'Afinidade com o governo',
}

export const COURT_DESCRIPTIONS: Record<CourtNomination, string> = {
  carreira:
    'Indicações de juristas de carreira sem vínculo político recente. Aprovação quase certa no Senado e mais previsibilidade das decisões.',
  alinhado:
    'Indicações de pessoas próximas ao governo. A Constituição permite a escolha; o risco é o Senado rejeitar e as decisões passarem a ser vistas como dependentes da composição do tribunal.',
}

export interface InstitutionsParams {
  institutionsEnabled: boolean
  cabinetA: Cabinet
  cabinetB: Cabinet
  courtA: CourtNomination
  courtB: CourtNomination
}

export interface InstitutionsCoefficients {
  /** Crescimento por ponto de segurança jurídica acima de 60, p.p. */
  legalCertaintyGrowth: number
  /** Prêmio de risco por ponto de segurança jurídica abaixo de 60, p.p. */
  legalCertaintyPremium: number
  /** Crescimento do investimento por 1% de retorno da bolsa no ano anterior, p.p. */
  marketToInvestment: number
}

export const DEFAULT_INSTITUTIONS_PARAMS: InstitutionsParams = {
  institutionsEnabled: true,
  cabinetA: 'misto',
  cabinetB: 'misto',
  courtA: 'carreira',
  courtB: 'carreira',
}

export const DEFAULT_INSTITUTIONS_COEFFICIENTS: InstitutionsCoefficients = {
  legalCertaintyGrowth: 0.005,
  legalCertaintyPremium: 0.02,
  marketToInvestment: 0.02,
}

export const CABINET_EFFECTS: Record<Cabinet, { growth: number; premium: number; support: number; climateResponse: number }> = {
  tecnico: { growth: 0.1, premium: -0.15, support: 0, climateResponse: 1.2 },
  misto: { growth: 0.05, premium: 0, support: 8, climateResponse: 1 },
  politico: { growth: 0, premium: 0.1, support: 15, climateResponse: 0.8 },
}

export const COURT_SEATS = 11
const LEGAL_CERTAINTY_NEUTRAL = 60

export interface InstitutionalEvent {
  kind:
    | 'indicacao-aprovada'
    | 'indicacao-rejeitada'
    | 'mudanca-jurisprudencia'
    | 'omissao-legislativa'
    | 'congresso-rejeita'
    | 'congresso-aprova'
  block: 'A' | 'B'
  year: number
  title: string
  explanation: string
}

export interface InstitutionsState {
  /** Segurança jurídica, 0 a 100 */
  legalCertainty: number
  /** Ministros do tribunal indicados por afinidade com o governo atual */
  alignedSeats: number
  /** Apoio ao governo no Congresso, 0 a 100 */
  congressSupport: number
  /** Índice da bolsa (ano 0 = 100) */
  market: number
  /** Retorno da bolsa no ano, % */
  marketReturn: number
}

/** Retorno real médio esperado das ações (prêmio de risco), % ao ano. */
export const EQUITY_RETURN = 4

export const INITIAL_INSTITUTIONS: InstitutionsState = {
  legalCertainty: LEGAL_CERTAINTY_NEUTRAL,
  alignedSeats: 0,
  congressSupport: 50,
  market: 100,
  marketReturn: EQUITY_RETURN,
}

export interface InstitutionsYear {
  state: InstitutionsState
  growth: { cabinet: number; legal: number; market: number }
  /** Variação do prêmio de risco, p.p. */
  premium: number
  /** Variação de aprovação causada por eventos institucionais */
  approvalDelta: number
  events: InstitutionalEvent[]
}

export interface InstitutionsInput {
  block: 'A' | 'B'
  t: number
  seed: number
  cabinet: Cabinet
  court: CourtNomination
  approval: number
  emendasTotal: number
  /** Crescimento econômico do ano (sem efeitos institucionais) */
  growth: number
  /** Choques de mercado por decisões do ano, % */
  decisionShock: number
  /** Houve alternância de governo neste ano */
  alternation: boolean
  coef: InstitutionsCoefficients
  prev: InstitutionsState
  /** Nome do território nas notícias (padrão: "Bloco X") */
  name?: string
}

export function congressSupport(approval: number, cabinet: Cabinet, emendasTotal: number): number {
  const v = 10 + 0.6 * approval + CABINET_EFFECTS[cabinet].support + (emendasTotal - 0.42) * 40
  return Math.min(95, Math.max(5, v))
}

/** Probabilidade de o Senado aprovar uma indicação ao tribunal. */
export function senateApproval(style: CourtNomination, support: number): number {
  return style === 'carreira' ? 0.97 : Math.min(0.95, 0.55 + (0.4 * support) / 100)
}

export function institutionsYear(x: InstitutionsInput): InstitutionsYear {
  const rng = mulberry32(((x.seed ^ 0x27d4eb2d) + x.t * 6151 + (x.block === 'A' ? 0 : 92821)) >>> 0)
  const events: InstitutionalEvent[] = []
  const prev = x.prev
  let legal = prev.legalCertainty
  let aligned = x.alternation ? 0 : prev.alignedSeats // indicados do governo anterior não são "alinhados" ao novo
  let approvalDelta = 0
  const support = congressSupport(x.approval, x.cabinet, x.emendasTotal)
  const name = x.name ?? `Bloco ${x.block}`

  // Vaga no tribunal (aposentadorias aos 75 anos): ~0,45 por ano.
  if (rng() < 0.45) {
    if (rng() < aligned / COURT_SEATS) aligned -= 1
    const approved = rng() < senateApproval(x.court, support)
    if (approved) {
      if (x.court === 'alinhado') {
        aligned = Math.min(COURT_SEATS, aligned + 1)
        legal -= 3
      } else legal += 1
      events.push({
        kind: 'indicacao-aprovada',
        block: x.block,
        year: x.t,
        title: `${name}: Senado aprova indicação ao tribunal`,
        explanation:
          x.court === 'alinhado'
            ? 'O presidente indicou uma pessoa próxima ao governo e o Senado aprovou após a sabatina. A escolha é constitucional; analistas passam a considerar mais provável que decisões mudem conforme a composição, o que reduz a segurança jurídica.'
            : 'O presidente indicou um jurista de carreira, aprovado pelo Senado após sabatina na Comissão de Constituição e Justiça. A previsibilidade das decisões aumenta levemente.',
      })
    } else {
      legal -= 1
      approvalDelta -= 3
      events.push({
        kind: 'indicacao-rejeitada',
        block: x.block,
        year: x.t,
        title: `${name}: Senado rejeita indicação ao tribunal`,
        explanation:
          'O Senado não alcançou a maioria absoluta necessária e o presidente teve de indicar outra pessoa, desta vez um jurista de carreira. No Brasil isso é raro: as últimas rejeições ocorreram em 1894, mas sabatinas já foram adiadas por meses.',
      })
    }
  }

  // Mudança de jurisprudência: mais provável quanto mais a composição recente for alinhada.
  if (rng() < 0.04 + 0.02 * aligned) {
    legal -= 4
    events.push({
      kind: 'mudanca-jurisprudencia',
      block: x.block,
      year: x.t,
      title: `${name}: tribunal muda entendimento sobre tema já decidido`,
      explanation:
        'Com nova composição, o tribunal revê uma decisão de poucos anos antes. No Brasil, a execução da pena após a segunda instância foi permitida em 2016 e revista em 2019. Para uns, é a evolução natural da jurisprudência; para outros, gera insegurança jurídica.',
    })
  }

  // Omissão legislativa: com Congresso sem maioria, o tribunal decide temas não regulados.
  if (rng() < (support < 40 ? 0.25 : 0.08)) {
    legal -= 2
    events.push({
      kind: 'omissao-legislativa',
      block: x.block,
      year: x.t,
      title: `${name}: tribunal decide tema que o Congresso não regulou`,
      explanation:
        'Provocado por uma ação de omissão, o tribunal fixa regras provisórias sobre um tema parado no Congresso. Críticos dizem que o tribunal passa a legislar; defensores afirmam que a Constituição manda proteger direitos quando falta lei. O Congresso pode reagir aprovando lei própria, como ocorreu com o marco temporal em 2023.',
    })
  }

  // Segurança jurídica volta lentamente ao nível neutro.
  legal += (LEGAL_CERTAINTY_NEUTRAL - legal) * 0.1
  legal = Math.min(100, Math.max(0, legal))

  const cab = CABINET_EFFECTS[x.cabinet]
  const legalGrowth = (legal - LEGAL_CERTAINTY_NEUTRAL) * x.coef.legalCertaintyGrowth
  const premium = cab.premium + Math.max(0, LEGAL_CERTAINTY_NEUTRAL - legal) * x.coef.legalCertaintyPremium

  // Bolsa: expectativas de crescimento, segurança jurídica, decisões e ruído.
  const noise = (rng() - 0.5) * 8
  const marketReturn =
    EQUITY_RETURN +
    3 * (x.growth - 2) +
    0.8 * (legal - prev.legalCertainty) +
    x.decisionShock +
    (x.alternation ? -5 : 0) +
    noise
  const market = prev.market * (1 + marketReturn / 100)
  // Retorno da bolsa acima ou abaixo do normal no ano anterior afeta o
  // investimento (custo de capital, confiança).
  const marketGrowth = (prev.marketReturn - EQUITY_RETURN) * x.coef.marketToInvestment

  return {
    state: {
      legalCertainty: legal,
      alignedSeats: aligned,
      congressSupport: support,
      market,
      marketReturn,
    },
    growth: { cabinet: cab.growth, legal: legalGrowth, market: marketGrowth },
    premium,
    approvalDelta,
    events,
  }
}

/** Probabilidade de o Congresso aprovar uma decisão que depende de lei ou ratificação. */
export function congressPassProbability(support: number, leaderVote: 'favor' | 'contra' | null = null): number {
  const base = 0.25 + support / 100
  const lead = leaderVote === 'favor' ? 0.15 : leaderVote === 'contra' ? -0.15 : 0
  return Math.min(0.97, Math.max(0.05, base + lead))
}
