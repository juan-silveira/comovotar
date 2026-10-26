// Pressões do dia a dia: grupos de interesse, greves, notícias falsas e
// "pautas-bomba". Cada evento tem opções com prós e contras e efeitos
// simples; magnitudes são hipóteses didáticas.

import type { Office } from './bills'

export interface PressureOption {
  id: string
  label: string
  pros: string[]
  cons: string[]
  approval?: number
  capital?: number
  /** Saldo primário no ano, % do PIB (só no orçamento federal) */
  fiscal?: number
  /** Crescimento no território, p.p. no ano */
  growth?: number
  /** Chance de dar certo (opções arriscadas); efeitos de fracasso abaixo */
  success?: number
  failApproval?: number
  /** Saldo primário se a opção arriscada fracassar */
  failFiscal?: number
  failText?: string
  okText?: string
}

export interface PressureEvent {
  id: string
  offices: Office[]
  icon: string
  group: string
  title: string
  text: string
  ref?: string
  options: PressureOption[]
  /** Só quando o governo tem pouco apoio no Legislativo */
  weakGovernmentOnly?: boolean
}

const EXEC: Office[] = ['presidente', 'governador', 'prefeito']
const ALL: Office[] = ['vereador', 'prefeito', 'deputado-estadual', 'governador', 'deputado-federal', 'senador', 'presidente']

export const PRESSURE_EVENTS: PressureEvent[] = [
  {
    id: 'greve',
    offices: EXEC,
    icon: '✊',
    group: 'Servidores públicos',
    title: 'Professores e servidores da saúde entram em greve por reajuste',
    text: 'A categoria diz que os salários perderam para a inflação. Escolas e postos funcionam parcialmente.',
    options: [
      {
        id: 'reajuste',
        label: 'Conceder o reajuste pedido',
        pros: ['Encerra a greve e valoriza quem presta o serviço.'],
        cons: ['Gasto com pessoal é permanente e encosta no limite da Lei de Responsabilidade Fiscal.'],
        approval: 2,
        fiscal: -0.15,
        growth: -0.02,
      },
      {
        id: 'negociar',
        label: 'Negociar um reajuste menor e escalonado',
        pros: ['Equilibra contas e serviço.'],
        cons: ['A greve demora mais a acabar.'],
        approval: 0,
        fiscal: -0.05,
        capital: -1,
      },
      {
        id: 'cortar-ponto',
        label: 'Cortar o ponto dos grevistas',
        pros: ['Sinaliza firmeza e preserva o orçamento.'],
        cons: ['Conflito com a categoria; a população sente a falta de serviços (−3).'],
        approval: -3,
        capital: 1,
      },
    ],
  },
  {
    id: 'agro',
    offices: ['presidente', 'governador', 'deputado-federal', 'senador', 'deputado-estadual'],
    icon: '🌾',
    group: 'Agronegócio',
    title: 'Produtores rurais pedem renegociação de dívidas e mais crédito',
    text: 'Com a quebra de safra e juros altos, a frente parlamentar do agro pressiona por socorro.',
    options: [
      {
        id: 'atender',
        label: 'Apoiar o pacote de socorro',
        pros: ['Evita falências no campo; a bancada do agro, uma das maiores, vira aliada (+2 de capital).'],
        cons: ['Custo para o Tesouro; críticos veem privilégio a um setor.'],
        capital: 2,
        fiscal: -0.08,
        growth: 0.04,
      },
      {
        id: 'condicionar',
        label: 'Apoiar com contrapartidas ambientais',
        pros: ['Ajuda quem cumpre as regras e protege o mercado externo.'],
        cons: ['Parte do setor resiste às exigências.'],
        approval: 1,
        fiscal: -0.04,
        growth: 0.02,
      },
      {
        id: 'recusar',
        label: 'Recusar o socorro',
        pros: ['Preserva as contas públicas.'],
        cons: ['A bancada do agro passa a dificultar as suas pautas (−2 de capital).'],
        capital: -2,
      },
    ],
  },
  {
    id: 'industria',
    offices: ['presidente', 'deputado-federal', 'senador', 'governador'],
    icon: '🏭',
    group: 'Indústria',
    title: 'Indústria pede proteção contra importados',
    text: 'Federações industriais pedem aumento do imposto de importação de produtos que concorrem com a produção nacional.',
    options: [
      {
        id: 'proteger',
        label: 'Apoiar tarifas maiores',
        pros: ['Protege empregos industriais no curto prazo (+1 de capital com o setor).'],
        cons: ['Consumidores pagam mais caro; menos pressão por produtividade.'],
        capital: 1,
        growth: 0.02,
        approval: -1,
      },
      {
        id: 'competitividade',
        label: 'Propor em troca redução de custos (energia, crédito, burocracia)',
        pros: ['Ataca as causas da baixa competitividade.'],
        cons: ['Resultado lento; custa negociação política.'],
        capital: -1,
        growth: 0.03,
      },
      {
        id: 'recusar',
        label: 'Manter as tarifas atuais',
        pros: ['Preços menores para o consumidor.'],
        cons: ['A indústria reclama e ameaça demitir.'],
        approval: 0,
      },
    ],
  },
  {
    id: 'sindicatos',
    offices: ALL,
    icon: '📢',
    group: 'Centrais sindicais',
    title: 'Centrais sindicais convocam ato por valorização do salário mínimo',
    text: 'Os sindicatos pedem aumento real do mínimo e cobram posição dos políticos.',
    options: [
      {
        id: 'apoiar',
        label: 'Apoiar publicamente a pauta',
        pros: ['Agrada trabalhadores e aposentados que ganham o mínimo (+2).'],
        cons: ['Cada R$ 1 a mais no mínimo custa cerca de R$ 413 milhões por ano à União.'],
        approval: 2,
        capital: -1,
      },
      {
        id: 'responsabilidade',
        label: 'Defender reajuste dentro da regra fiscal',
        pros: ['Mostra responsabilidade com as contas.'],
        cons: ['Sindicatos criticam (−1).'],
        approval: -1,
        capital: 1,
      },
    ],
  },
  {
    id: 'ambientalistas',
    offices: ['presidente', 'governador', 'prefeito', 'deputado-federal', 'senador'],
    icon: '🌳',
    group: 'Movimentos ambientais',
    title: 'Movimentos ambientais pedem moratória do desmatamento',
    text: 'Imagens de satélite mostram alta de queimadas. Ambientalistas e compradores estrangeiros cobram ação.',
    options: [
      {
        id: 'apoiar',
        label: 'Apoiar fiscalização mais dura',
        pros: ['Reduz queimadas e protege exportações sob regras ambientais externas.'],
        cons: ['Parte dos produtores e da bancada ruralista reage (−1 de capital).'],
        approval: 1,
        capital: -1,
      },
      {
        id: 'equilibrar',
        label: 'Propor pagamento por serviços ambientais',
        pros: ['Remunera quem preserva, sem só punir.'],
        cons: ['Custa dinheiro público e demora a funcionar.'],
        fiscal: -0.03,
        approval: 1,
      },
      {
        id: 'ignorar',
        label: 'Priorizar a produção',
        pros: ['Agrada setores produtivos (+1 de capital).'],
        cons: ['Risco de barreiras às exportações e críticas internacionais.'],
        capital: 1,
        approval: -1,
      },
    ],
  },
  {
    id: 'religiosos',
    offices: ['vereador', 'deputado-estadual', 'deputado-federal', 'senador', 'prefeito'],
    icon: '⛪',
    group: 'Lideranças religiosas',
    title: 'Frente religiosa pede ampliar isenções para templos e entidades',
    text: 'Templos já têm imunidade de impostos sobre patrimônio, renda e serviços ligados às suas finalidades (CF, art. 150, VI, b). O pedido é estender benefícios a outras atividades.',
    ref: 'art150',
    options: [
      {
        id: 'apoiar',
        label: 'Apoiar a ampliação',
        pros: ['Ganha o apoio de uma bancada grande e organizada (+2 de capital).'],
        cons: ['Menos arrecadação; críticos apontam privilégio e o Estado laico.'],
        capital: 2,
        approval: -1,
      },
      {
        id: 'manter',
        label: 'Manter as regras atuais',
        pros: ['Preserva a arrecadação e a igualdade tributária.'],
        cons: ['A frente religiosa passa a dificultar as suas pautas (−1).'],
        capital: -1,
      },
    ],
  },
  {
    id: 'bancos',
    offices: ['presidente', 'deputado-federal', 'senador'],
    icon: '🏦',
    group: 'Setor financeiro',
    title: 'Bancos pedem mudança nas regras do crédito consignado',
    text: 'O setor quer juros-teto maiores no consignado de aposentados, alegando inadimplência.',
    options: [
      {
        id: 'atender',
        label: 'Aceitar teto maior',
        pros: ['Mais oferta de crédito.'],
        cons: ['Aposentados pagam juros maiores (−2).'],
        approval: -2,
        capital: 1,
        growth: 0.02,
      },
      {
        id: 'manter',
        label: 'Manter o teto atual',
        pros: ['Protege aposentados de juros abusivos (+1).'],
        cons: ['Bancos podem restringir o crédito.'],
        approval: 1,
        growth: -0.01,
      },
    ],
  },
  {
    id: 'fake-news',
    offices: [...ALL, 'ministro-stf'],
    icon: '📱',
    group: 'Redes sociais',
    title: 'Notícia falsa sobre você viraliza',
    text: 'Um vídeo manipulado atribui a você uma frase que nunca disse. Em 24 horas, milhões de visualizações.',
    options: [
      {
        id: 'desmentir',
        label: 'Desmentir com o vídeo original e checagens',
        pros: ['Recupera parte da imagem com transparência.'],
        cons: ['A mentira costuma circular mais que o desmentido (−1).'],
        approval: -1,
      },
      {
        id: 'justica',
        label: 'Pedir na Justiça a remoção do conteúdo',
        pros: ['Se a Justiça aceitar, o vídeo sai do ar e os autores podem responder.'],
        cons: ['Leva tempo e pode ser visto como censura por parte do público.'],
        success: 0.6,
        approval: 0,
        failApproval: -3,
        okText: 'A Justiça mandou remover o vídeo e identificar os autores.',
        failText: 'A decisão demorou e o vídeo seguiu circulando; parte do público viu o pedido como censura.',
      },
      {
        id: 'ignorar',
        label: 'Ignorar e seguir a agenda',
        pros: ['Não amplia o assunto.'],
        cons: ['Quem viu a mentira pode acreditar nela (−3).'],
        approval: -3,
      },
      {
        id: 'contra-atacar',
        label: 'Responder espalhando boatos sobre os adversários',
        pros: ['Muda o assunto rapidamente.'],
        cons: ['Se descoberto, desgaste grande e risco de processo; piora o debate público.'],
        success: 0.5,
        approval: 1,
        failApproval: -6,
        okText: 'O boato sobre os adversários dominou o noticiário por alguns dias.',
        failText: 'Agências de checagem rastrearam os boatos até a sua equipe. A repercussão foi péssima.',
      },
    ],
  },
  {
    id: 'pauta-bomba',
    offices: ['presidente', 'governador'],
    icon: '💣',
    group: 'Legislativo',
    weakGovernmentOnly: true,
    title: 'Legislativo aprova “pauta-bomba”: aumento de gastos sem fonte de receita',
    text: 'Com o governo fraco, parlamentares aprovam um piso salarial para uma categoria sem indicar de onde virá o dinheiro. O projeto chega para sanção.',
    ref: 'lrf14',
    options: [
      {
        id: 'vetar',
        label: 'Vetar',
        pros: ['Protege as contas públicas.'],
        cons: ['A categoria e os parlamentares reagem (−2 de aprovação, −1 de capital).'],
        approval: -2,
        capital: -1,
      },
      {
        id: 'sancionar',
        label: 'Sancionar',
        pros: ['Agrada a categoria e o Legislativo (+2).'],
        cons: ['Despesa permanente sem fonte: pressiona dívida e outros serviços.'],
        approval: 2,
        fiscal: -0.2,
      },
      {
        id: 'stf',
        label: 'Sancionar e questionar no tribunal a falta de fonte de recursos',
        pros: ['A Constituição exige estimativa de impacto para despesas obrigatórias (ADCT, art. 113).'],
        cons: ['Resultado incerto e desgaste com a categoria.'],
        success: 0.5,
        approval: 0,
        fiscal: 0,
        failApproval: 0,
        failFiscal: -0.2,
        okText: 'O tribunal suspendeu a lei até que se indique a fonte dos recursos.',
        failText: 'O tribunal manteve a lei, e a despesa entrou no orçamento.',
      },
    ],
  },
]

// Política externa (presidente) --------------------------------------------------------------

/** Decisões de política externa: o presidente conduz, o Congresso aprova tratados (CF, arts. 49 e 84). */
export const FOREIGN_EVENTS: PressureEvent[] = [
  {
    id: 'onu-guerra',
    offices: ['presidente'],
    icon: '🇺🇳',
    group: 'Política externa',
    title: 'ONU vota resolução que condena a invasão de um país',
    text: 'Uma grande potência invadiu um vizinho. Aliados ocidentais pedem o voto do Brasil; a potência é parceira comercial importante e membro do BRICS.',
    ref: 'art84',
    options: [
      {
        id: 'condenar',
        label: 'Votar pela condenação',
        pros: ['Defende o princípio da não intervenção e da integridade territorial (CF, art. 4º).', 'Aproxima de EUA e Europa.'],
        cons: ['Atrito com um parceiro comercial e do BRICS.'],
        approval: 1,
        growth: -0.02,
      },
      {
        id: 'abster',
        label: 'Abster-se e defender negociação de paz',
        pros: ['Mantém a tradição de neutralidade e o diálogo com os dois lados.'],
        cons: ['Aliados ocidentais criticam a ambiguidade.'],
        approval: 0,
      },
      {
        id: 'mediar',
        label: 'Abster-se e se oferecer como mediador',
        pros: ['Projeta o Brasil como potência diplomática se der certo.'],
        cons: ['Custa capital e pode fracassar publicamente.'],
        capital: -1,
        success: 0.3,
        approval: 3,
        failApproval: -1,
        okText: 'As partes aceitaram uma rodada de conversas em Brasília.',
        failText: 'A proposta de mediação foi ignorada pelas partes.',
      },
    ],
  },
  {
    id: 'refugiados',
    offices: ['presidente', 'governador'],
    icon: '🧳',
    group: 'Política externa',
    title: 'Crise humanitária no país vizinho: milhares cruzam a fronteira',
    text: 'Fugindo da fome e da violência, famílias chegam pela fronteira norte. Abrigos e hospitais da região estão lotados.',
    options: [
      {
        id: 'acolher',
        label: 'Acolher e levar parte das famílias para outros estados',
        pros: ['Cumpre a Lei de Migração e os tratados de refúgio; alivia a região de fronteira.', 'Migrantes em idade ativa podem reforçar a economia.'],
        cons: ['Custo de abrigos e serviços; resistência em parte da população.'],
        fiscal: -0.02,
        growth: 0.02,
        approval: -1,
      },
      {
        id: 'fechar',
        label: 'Restringir a entrada na fronteira',
        pros: ['Responde a quem teme a pressão sobre os serviços (+1).'],
        cons: ['Fechar a fronteira a quem pede refúgio contraria a lei e tratados; a Justiça pode barrar.'],
        approval: 1,
        success: 0.4,
        failApproval: -2,
        okText: 'A restrição foi mantida, sob críticas de organismos internacionais.',
        failText: 'A Justiça suspendeu a medida por contrariar a Lei de Migração (Lei 13.445/2017).',
      },
      {
        id: 'ajuda',
        label: 'Enviar ajuda humanitária ao país vizinho',
        pros: ['Ataca a causa da crise na origem.'],
        cons: ['Custa recursos e tem efeito incerto.'],
        fiscal: -0.01,
      },
    ],
  },
  {
    id: 'ocde-brics',
    offices: ['presidente'],
    icon: '🌐',
    group: 'Política externa',
    title: 'Convite para acelerar a entrada na OCDE',
    text: 'A OCDE, clube de economias desenvolvidas, oferece acelerar a adesão do Brasil em troca de reformas. Parceiros do BRICS veem com desconfiança.',
    options: [
      {
        id: 'ocde',
        label: 'Priorizar a entrada na OCDE',
        pros: ['Selo de boas práticas pode atrair investimento e reduzir juros.'],
        cons: ['Exige reformas e limita políticas industriais.'],
        capital: -1,
        growth: 0.04,
      },
      {
        id: 'brics',
        label: 'Priorizar o BRICS e o Sul Global',
        pros: ['Amplia comércio e financiamento com grandes emergentes, como o banco do BRICS.'],
        cons: ['Distância de investidores ocidentais.'],
        growth: 0.02,
      },
      {
        id: 'ambos',
        label: 'Manter as duas frentes abertas',
        pros: ['Preserva a autonomia e o diálogo com todos.'],
        cons: ['Avança devagar nas duas.'],
        growth: 0.01,
      },
    ],
  },
  {
    id: 'fundo-amazonia',
    offices: ['presidente'],
    icon: '🌳',
    group: 'Política externa',
    title: 'Países europeus oferecem doações ao Fundo Amazônia',
    text: 'Noruega e Alemanha propõem novas doações bilionárias, condicionadas à queda do desmatamento.',
    options: [
      {
        id: 'aceitar',
        label: 'Aceitar com metas de desmatamento',
        pros: ['Recursos para fiscalização e economia da floresta sem custo ao Tesouro.'],
        cons: ['Setores críticos falam em interferência estrangeira.'],
        fiscal: 0.02,
        approval: 1,
      },
      {
        id: 'recusar',
        label: 'Recusar em nome da soberania',
        pros: ['Agrada quem vê as metas como interferência (+1 de capital com a bancada ruralista).'],
        cons: ['Perde recursos e imagem internacional.'],
        capital: 1,
        approval: -1,
      },
    ],
  },
  {
    id: 'moedas-locais',
    offices: ['presidente'],
    icon: '💱',
    group: 'Política externa',
    title: 'Proposta de comércio em moedas locais com parceiros',
    text: 'Parceiros do Mercosul e do BRICS propõem pagar exportações e importações sem passar pelo dólar.',
    options: [
      {
        id: 'aderir',
        label: 'Aderir aos poucos',
        pros: ['Reduz custos de câmbio e a dependência do dólar.'],
        cons: ['Volume pequeno no início; os EUA podem reagir.'],
        growth: 0.01,
      },
      {
        id: 'recusar',
        label: 'Manter o dólar como referência',
        pros: ['Evita atrito com os EUA e com o mercado financeiro.'],
        cons: ['Mantém a exposição à variação do dólar.'],
      },
    ],
  },
]

export function findPressure(id: string): PressureEvent | undefined {
  return PRESSURE_EVENTS.find((e) => e.id === id) ?? FOREIGN_EVENTS.find((e) => e.id === id)
}

/** Sorteia uma decisão de política externa (25% de chance ao ano). */
export function drawForeign(office: Office, rng: () => number): PressureEvent | null {
  if (rng() > 0.25) return null
  const pool = FOREIGN_EVENTS.filter((e) => e.offices.includes(office))
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null
}

/** Sorteia uma pressão para o cargo no ano (35% de chance). */
export function drawPressure(office: Office, rng: () => number, weakGovernment: boolean, frequency = 1): PressureEvent | null {
  if (rng() > 0.35 * frequency) return null
  const pool = PRESSURE_EVENTS.filter((e) => e.offices.includes(office) && (!e.weakGovernmentOnly || weakGovernment))
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)]
}
