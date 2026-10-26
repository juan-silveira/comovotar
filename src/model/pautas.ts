// Pautas em debate: temas que costumam aparecer em campanhas e no Congresso,
// explicados de forma neutra, com argumentos dos dois lados e uma conta
// simples do impacto.

export interface Pauta {
  id: string
  title: string
  /** Situação atual, em linguagem simples */
  today: string
  /** O que a proposta muda */
  proposal: string
  /** Quem decide e como */
  howToChange: string
  /** Argumentos a favor, por grupo */
  pros: { who: string; text: string }[]
  /** Argumentos contra, por grupo */
  cons: { who: string; text: string }[]
  /** Efeitos na economia, com a incerteza explicitada */
  economy: string[]
  /** Experiências de outros países ou do passado */
  experiences: string[]
  /** Referências da base constitucional */
  refs: string[]
  /** Projeto de lei jogável relacionado */
  billId?: string
}

export const PAUTAS: Pauta[] = [
  {
    id: 'escala-6x1',
    title: 'Fim da escala 6x1 e redução da jornada',
    today:
      'A Constituição limita a jornada a 8 horas por dia e 44 por semana (art. 7º, XIII) e garante um descanso semanal remunerado, de preferência aos domingos (art. 7º, XV). A escala 6x1 (seis dias de trabalho para um de folga) é permitida e comum no comércio, em serviços e em atividades que funcionam todos os dias.',
    proposal:
      'Propostas em discussão no Congresso reduzem o limite semanal (por exemplo, para 40 ou 36 horas) e garantem ao menos dois dias de folga por semana, sem redução de salário. Algumas preveem transição gradual.',
    howToChange:
      'Como o limite de 44 horas está na Constituição, reduzi-lo exige uma emenda constitucional (PEC): 3/5 dos votos em dois turnos na Câmara e no Senado, sem sanção presidencial. Detalhes de escalas podem ser regulados pela CLT e por acordos e convenções coletivas.',
    pros: [
      { who: 'Trabalhadores', text: 'Mais tempo de descanso, convívio familiar, estudo e cuidado com a saúde, sem perder salário.' },
      { who: 'Saúde pública', text: 'Jornadas longas estão associadas a estresse, acidentes e afastamentos, que também custam ao sistema de saúde e à previdência.' },
      { who: 'Economia', text: 'Trabalhadores descansados tendem a produzir mais por hora; parte das empresas pode contratar mais gente para cobrir os turnos.' },
      { who: 'Consumo', text: 'Com mais tempo livre, as pessoas consomem mais lazer, turismo e serviços.' },
    ],
    cons: [
      { who: 'Empresários', text: 'Pagar o mesmo salário por menos horas aumenta o custo de cada hora trabalhada: de 44 para 36 horas, cerca de 22% a mais por hora.' },
      { who: 'Pequenos negócios', text: 'Comércio, bares, restaurantes e serviços que abrem todos os dias precisariam contratar mais para manter o horário, com margens apertadas.' },
      { who: 'Empregos', text: 'Se o custo subir mais que a produtividade, empresas podem contratar menos, automatizar ou recorrer à informalidade, que no Brasil já é alta.' },
      { who: 'Consumidores', text: 'Parte do custo extra pode ser repassada aos preços.' },
    ],
    economy: [
      'O efeito líquido depende de quanto a produtividade por hora sobe: se subir na mesma proporção da redução de horas, o custo para as empresas não muda; se subir pouco, o custo aumenta.',
      'Setores com muita mão de obra e funcionamento contínuo (comércio, serviços, saúde, segurança) sentem mais; setores industriais automatizados, menos.',
      'Num país com grande parte dos trabalhadores fora da CLT (informais e por conta própria), a mudança alcança só os empregados formais, e um custo maior pode empurrar parte deles para a informalidade.',
      'Estudos e experiências internacionais chegam a conclusões diferentes; os resultados dependem de transição gradual, negociação coletiva e da situação da economia.',
    ],
    experiences: [
      'França: reduziu a jornada legal para 35 horas a partir de 2000; o debate sobre efeitos no emprego continua até hoje.',
      'Chile: aprovou em 2023 a redução gradual de 45 para 40 horas, até 2028.',
      'Brasil: a Constituição de 1988 reduziu a jornada de 48 para 44 horas semanais.',
    ],
    refs: ['art60'],
    billId: 'jornada-36h',
  },
]

export function findPauta(id: string): Pauta | undefined {
  return PAUTAS.find((p) => p.id === id)
}

export interface WorkweekInput {
  /** Jornada atual, horas por semana */
  current: number
  /** Nova jornada, horas por semana */
  proposed: number
  /** Ganho de produtividade por hora esperado com mais descanso, % */
  productivityGain: number
  /** Peso da mão de obra no custo total da empresa, % */
  laborShare: number
}

export const DEFAULT_WORKWEEK: WorkweekInput = { current: 44, proposed: 36, productivityGain: 5, laborShare: 30 }

export interface WorkweekResult {
  /** Aumento do custo de cada hora trabalhada, % */
  hourlyCost: number
  /** Aumento do custo por unidade produzida, descontado o ganho de produtividade, % */
  unitLaborCost: number
  /** Aumento do custo total da empresa, % */
  totalCost: number
  /** Contratações extras para manter as mesmas horas de funcionamento, % do quadro */
  extraHires: number
}

/** Conta simples: mesmo salário, menos horas. */
export function workweekImpact(x: WorkweekInput): WorkweekResult {
  const hourly = (x.current / x.proposed - 1) * 100
  const output = (x.proposed / x.current) * (1 + x.productivityGain / 100)
  const unit = (1 / output - 1) * 100
  return {
    hourlyCost: hourly,
    unitLaborCost: unit,
    totalCost: (unit * x.laborShare) / 100,
    extraHires: Math.max(0, (x.current / x.proposed - 1) * 100),
  }
}
