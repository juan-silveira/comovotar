// FGTS (Fundo de Garantia do Tempo de Serviço): o que é, prós e contras e uma
// calculadora que compara rendimentos. Valores ilustrativos; regras
// resumidas da Lei 8.036/1990 e da decisão do STF na ADI 5090 (2024).

export interface FgtsInput {
  /** Salário bruto mensal, R$ */
  salary: number
  /** Anos de contribuição */
  years: number
  /** Inflação média anual, % */
  inflation: number
  /** Rendimento real de uma alternativa (ex.: título público atrelado à inflação), % ao ano */
  alternativeReal: number
}

export const DEFAULT_FGTS_INPUT: FgtsInput = {
  salary: 3000,
  years: 10,
  inflation: 4.5,
  alternativeReal: 5,
}

/** Depósito mensal do empregador: 8% do salário (Lei 8.036/1990, art. 15). */
export const FGTS_RATE = 0.08

export interface FgtsYear {
  year: number
  /** Total depositado (sem rendimento), R$ */
  deposited: number
  /** Regra antiga: TR (≈ 0) + 3% ao ano, sem distribuição de lucros */
  oldRule: number
  /** Regra após o STF (2024): rendimento de pelo menos a inflação (IPCA) */
  ipcaFloor: number
  /** Mesmo dinheiro aplicado numa alternativa com ganho real */
  alternative: number
  /** Valor que o dinheiro teria se só acompanhasse a inflação (referência de poder de compra) */
  inflationOnly: number
}

/**
 * Simula mês a mês: o salário é corrigido pela inflação a cada ano, o
 * depósito é 8% do salário, e cada saldo rende conforme a sua regra.
 */
export function simulateFgts(x: FgtsInput): FgtsYear[] {
  const monthly = (annual: number) => Math.pow(1 + annual / 100, 1 / 12) - 1
  const rOld = monthly(3)
  const rIpca = monthly(Math.max(3, x.inflation))
  const rAlt = monthly((1 + x.inflation / 100) * (1 + x.alternativeReal / 100) * 100 - 100)
  const rInf = monthly(x.inflation)
  let salary = x.salary
  let deposited = 0
  let old = 0
  let ipca = 0
  let alt = 0
  let inf = 0
  const out: FgtsYear[] = [{ year: 0, deposited: 0, oldRule: 0, ipcaFloor: 0, alternative: 0, inflationOnly: 0 }]
  for (let y = 1; y <= x.years; y++) {
    for (let m = 0; m < 12; m++) {
      const d = salary * FGTS_RATE
      deposited += d
      old = old * (1 + rOld) + d
      ipca = ipca * (1 + rIpca) + d
      alt = alt * (1 + rAlt) + d
      inf = inf * (1 + rInf) + d
    }
    out.push({ year: y, deposited, oldRule: old, ipcaFloor: ipca, alternative: alt, inflationOnly: inf })
    salary *= 1 + x.inflation / 100
  }
  return out
}

export const FGTS_FACTS = {
  what: 'Todo mês, o empregador deposita 8% do salário do trabalhador com carteira assinada numa conta do FGTS em nome dele, administrada pela Caixa. O dinheiro não sai do salário: é um custo a mais para a empresa.',
  why: 'Criado em 1966 para substituir a antiga estabilidade no emprego: em vez de não poder ser demitido após 10 anos, o trabalhador passou a ter uma reserva que pode sacar se for demitido sem justa causa, acrescida de multa de 40% paga pelo empregador.',
  uses: [
    'Demissão sem justa causa (saque do saldo + multa de 40% sobre ele).',
    'Compra da casa própria e amortização de financiamento habitacional.',
    'Aposentadoria, doenças graves e desastres naturais.',
    'Saque-aniversário (opcional): saca uma parte por ano, mas perde o direito ao saldo se for demitido.',
  ],
  pros: [
    'Garante uma reserva quando o trabalhador perde o emprego, justamente quando mais precisa.',
    'É uma poupança forçada: ajuda quem teria dificuldade de guardar dinheiro por conta própria.',
    'Financia habitação popular, saneamento e infraestrutura com juros mais baixos que os de mercado.',
    'A multa de 40% encarece demissões e desestimula a rotatividade.',
  ],
  cons: [
    'Por muitos anos rendeu menos que a inflação (TR + 3% ao ano): o trabalhador perdeu poder de compra. Desde 2017, parte do lucro do fundo é distribuída às contas, o que reduziu essa perda.',
    'O dinheiro é do trabalhador, mas ele não decide quando usar nem onde aplicar.',
    'Aumenta o custo de contratar formalmente, o que pode estimular a informalidade.',
    'Os juros baixos dos empréstimos com recursos do fundo são, na prática, subsidiados pelo baixo rendimento das contas.',
  ],
  stf: 'Em 2024, o STF (ADI 5090) decidiu que a remuneração das contas do FGTS deve ser de pelo menos a inflação medida pelo IPCA, a partir daquela decisão, sem corrigir as perdas passadas.',
}
