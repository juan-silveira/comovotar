// Modo história: decisões reais do Brasil desde a Constituição de 1988. O
// jogador escolhe o que faria e depois vê o que aconteceu, as consequências e
// o debate. Não há resposta certa: o objetivo é entender os dilemas.

export interface HistoryCard {
  year: number
  title: string
  context: string
  question: string
  options: { id: string; label: string }[]
  /** Opção que corresponde ao que de fato aconteceu */
  real: string
  happened: string
  consequences: string[]
  /** Visões em debate, de lados diferentes */
  debate: [string, string]
}

export const HISTORY: HistoryCard[] = [
  {
    year: 1990,
    title: 'Hiperinflação e o Plano Collor',
    context: 'Os preços sobem mais de 80% ao mês. Planos anteriores congelaram preços e fracassaram. O novo presidente assume com apoio popular.',
    question: 'Como conter a inflação?',
    options: [
      { id: 'bloqueio', label: 'Bloquear por 18 meses a maior parte do dinheiro em contas e poupanças' },
      { id: 'gradual', label: 'Cortar gastos e criar uma nova moeda aos poucos' },
      { id: 'congelar', label: 'Congelar preços e salários outra vez' },
    ],
    real: 'bloqueio',
    happened: 'O Plano Collor bloqueou aplicações e poupanças acima de um limite por 18 meses, além de congelar preços.',
    consequences: ['A inflação caiu por alguns meses e voltou a subir.', 'Empresas e famílias perderam acesso ao próprio dinheiro; a economia encolheu.', 'Em 1992, com denúncias de corrupção, a Câmara autorizou o impeachment; Collor renunciou e o Senado o inabilitou por 8 anos.'],
    debate: ['Defensores do plano: era preciso um choque para tirar dinheiro de circulação e quebrar a inércia inflacionária.', 'Críticos: o bloqueio violou a confiança na poupança e a propriedade, e o plano não atacou as causas fiscais.'],
  },
  {
    year: 1994,
    title: 'Plano Real',
    context: 'Depois de vários planos fracassados, a inflação de 1993 passou de 2.000% no ano.',
    question: 'Qual estratégia adotar?',
    options: [
      { id: 'urv', label: 'Criar uma unidade de valor (URV) para alinhar preços e depois trocar a moeda, sem congelamento' },
      { id: 'congelar', label: 'Congelar preços por decreto' },
      { id: 'dolar', label: 'Adotar o dólar como moeda oficial' },
    ],
    real: 'urv',
    happened: 'A URV funcionou como moeda virtual por alguns meses e virou o real em julho de 1994, com ajuste fiscal e câmbio controlado.',
    consequences: ['A inflação caiu para cerca de 22% em 1995 e para um dígito depois.', 'O poder de compra dos mais pobres subiu.', 'O câmbio valorizado e juros altos cobraram preço nas crises de 1997 a 1999.'],
    debate: ['Defensores: acabou com a hiperinflação sem confiscos nem congelamentos.', 'Críticos: juros muito altos e câmbio sobrevalorizado aumentaram a dívida e prejudicaram a indústria.'],
  },
  {
    year: 1997,
    title: 'Emenda da reeleição',
    context: 'A Constituição de 1988 proibia a reeleição de presidente, governadores e prefeitos.',
    question: 'Permitir uma reeleição?',
    options: [
      { id: 'sim', label: 'Sim, uma reeleição consecutiva, valendo para os atuais governantes' },
      { id: 'nao', label: 'Não, manter o mandato único' },
      { id: 'futuro', label: 'Sim, mas só a partir dos próximos eleitos' },
    ],
    real: 'sim',
    happened: 'A Emenda Constitucional 16/1997 permitiu uma reeleição, já valendo para os governantes da época.',
    consequences: ['Presidentes, governadores e prefeitos passaram a poder governar 8 anos seguidos.', 'Houve denúncias de compra de votos de deputados na aprovação, que não resultaram em condenações.'],
    debate: ['A favor: o eleitor pode premiar um bom governo, e projetos longos ganham continuidade.', 'Contra: governantes usam a máquina pública para se reeleger; mudar a regra em benefício próprio foi casuísmo.'],
  },
  {
    year: 2000,
    title: 'Lei de Responsabilidade Fiscal',
    context: 'Estados e municípios gastavam mais do que arrecadavam e a União assumia as dívidas deles.',
    question: 'Como controlar os gastos públicos?',
    options: [
      { id: 'lrf', label: 'Lei com limites para gasto com pessoal e dívida e punições para quem descumprir' },
      { id: 'socorro', label: 'Continuar socorrendo os entes endividados' },
      { id: 'nada', label: 'Deixar cada ente decidir' },
    ],
    real: 'lrf',
    happened: 'A Lei Complementar 101/2000 criou limites de gasto com pessoal, regras para dívida e exigências de transparência.',
    consequences: ['Os gastos com pessoal passaram a ter teto (60% da receita para estados e municípios).', 'Gestores podem responder por crimes e improbidade se descumprirem.', 'Ainda assim, vários estados voltaram a enfrentar crises fiscais nos anos 2010.'],
    debate: ['Defensores: trouxe disciplina e transparência às contas públicas.', 'Críticos: limita investimentos sociais e foi contornada com manobras contábeis.'],
  },
  {
    year: 2003,
    title: 'Bolsa Família',
    context: 'Havia vários programas sociais pequenos e sobrepostos. Cerca de um quarto da população vivia na pobreza.',
    question: 'Como combater a pobreza?',
    options: [
      { id: 'bolsa', label: 'Unificar os programas numa transferência de renda com condições (escola e vacinas)' },
      { id: 'empregos', label: 'Priorizar frentes de trabalho e obras públicas' },
      { id: 'cestas', label: 'Distribuir cestas básicas' },
    ],
    real: 'bolsa',
    happened: 'O Bolsa Família unificou programas e passou a pagar renda mensal a famílias pobres, exigindo frequência escolar e vacinação.',
    consequences: ['A extrema pobreza caiu muito nos anos seguintes.', 'O programa custa cerca de 0,5% a 1,5% do PIB, conforme o ano.', 'Virou referência internacional e foi mantido, com outros nomes, por governos de diferentes partidos.'],
    debate: ['Defensores: é barato para o resultado e chega a quem mais precisa.', 'Críticos: sem porta de saída, pode criar dependência e ser usado eleitoralmente.'],
  },
  {
    year: 2010,
    title: 'Lei da Ficha Limpa',
    context: 'Um projeto de iniciativa popular reuniu mais de 1,6 milhão de assinaturas pedindo que condenados não pudessem se candidatar.',
    question: 'O Congresso deve aprovar?',
    options: [
      { id: 'sim', label: 'Aprovar: condenado por órgão colegiado fica inelegível por 8 anos' },
      { id: 'transito', label: 'Exigir condenação definitiva, sem mais recursos' },
      { id: 'nao', label: 'Rejeitar' },
    ],
    real: 'sim',
    happened: 'A Lei Complementar 135/2010 foi aprovada; o STF a considerou constitucional em 2012.',
    consequences: ['Milhares de candidaturas foram barradas desde então.', 'A lei é usada em casos de corrupção, contas rejeitadas e cassações.'],
    debate: ['Defensores: protege o eleitor de candidatos com histórico de crimes.', 'Críticos: pune antes da condenação definitiva, contrariando a presunção de inocência.'],
  },
  {
    year: 2016,
    title: 'Impeachment da presidente Dilma Rousseff',
    context: 'Recessão profunda, inflação alta, Operação Lava Jato e perda de apoio no Congresso. A acusação: “pedaladas fiscais” e decretos de crédito sem autorização.',
    question: 'Como deputado, como votaria?',
    options: [
      { id: 'sim', label: 'Sim, pelo impeachment' },
      { id: 'nao', label: 'Não, contra o impeachment' },
    ],
    real: 'sim',
    happened: 'A Câmara autorizou o processo (367 votos) e o Senado condenou a presidente (61 votos), sem inabilitação para cargos públicos.',
    consequences: ['O vice Michel Temer assumiu até 2018.', 'O episódio dividiu o país e segue em debate.'],
    debate: ['Para uns: houve crime de responsabilidade, e o processo seguiu a Constituição e o rito do STF.', 'Para outros: as manobras fiscais eram praticadas por governos anteriores e o afastamento foi político.'],
  },
  {
    year: 2016,
    title: 'Teto de gastos',
    context: 'A dívida pública crescia rápido e o país estava em recessão.',
    question: 'Como conter a dívida?',
    options: [
      { id: 'teto', label: 'Congelar o crescimento real do gasto federal por 20 anos (corrigido só pela inflação)' },
      { id: 'impostos', label: 'Aumentar impostos sobre os mais ricos' },
      { id: 'nada', label: 'Esperar a economia voltar a crescer' },
    ],
    real: 'teto',
    happened: 'A Emenda Constitucional 95/2016 criou o teto de gastos.',
    consequences: ['Os juros caíram nos anos seguintes.', 'Gastos obrigatórios cresceram e espremeram investimentos e despesas livres.', 'O teto foi furado várias vezes e substituído pelo arcabouço fiscal em 2023.'],
    debate: ['Defensores: devolveu credibilidade e reduziu juros.', 'Críticos: era rígido demais e reduziu investimentos em saúde e educação por pessoa.'],
  },
  {
    year: 2017,
    title: 'Reforma trabalhista',
    context: 'Desemprego acima de 12% e grande número de ações na Justiça do Trabalho.',
    question: 'Mudar a CLT?',
    options: [
      { id: 'reforma', label: 'Permitir que acordos coletivos prevaleçam sobre a lei em vários pontos e acabar com o imposto sindical obrigatório' },
      { id: 'manter', label: 'Manter as regras' },
    ],
    real: 'reforma',
    happened: 'A Lei 13.467/2017 aprovou a reforma, com trabalho intermitente e fim da contribuição sindical obrigatória.',
    consequences: ['As ações trabalhistas caíram muito.', 'O desemprego demorou a cair, e a informalidade continuou alta.', 'Sindicatos perderam a maior parte da arrecadação.'],
    debate: ['Defensores: modernizou regras e reduziu a insegurança jurídica para contratar.', 'Críticos: precarizou o trabalho e enfraqueceu a negociação dos trabalhadores.'],
  },
  {
    year: 2019,
    title: 'Reforma da Previdência',
    context: 'O déficit da Previdência crescia com o envelhecimento da população; muitos se aposentavam antes dos 60 anos.',
    question: 'Qual reforma fazer?',
    options: [
      { id: 'idade', label: 'Idade mínima de 65 anos para homens e 62 para mulheres, com transição' },
      { id: 'leve', label: 'Só aumentar o tempo de contribuição' },
      { id: 'nada', label: 'Não mexer' },
    ],
    real: 'idade',
    happened: 'A Emenda Constitucional 103/2019 criou idade mínima e mudou o cálculo dos benefícios.',
    consequences: ['A economia estimada foi de cerca de R$ 800 bilhões em 10 anos.', 'O déficit continua, pois os benefícios seguem o salário mínimo e a população envelhece.'],
    debate: ['Defensores: sem ela, a Previdência consumiria cada vez mais o orçamento.', 'Críticos: pesou mais sobre trabalhadores de baixa renda e deixou privilégios de algumas categorias.'],
  },
  {
    year: 2020,
    title: 'Pandemia e auxílio emergencial',
    context: 'A covid-19 fecha comércio e serviços. Milhões de trabalhadores informais ficam sem renda.',
    question: 'Qual o tamanho da ajuda?',
    options: [
      { id: 'grande', label: 'Auxílio de R$ 600 por mês a dezenas de milhões de pessoas' },
      { id: 'pequeno', label: 'Auxílio menor, de R$ 200, para preservar as contas' },
      { id: 'nenhum', label: 'Nenhum auxílio: priorizar a abertura da economia' },
    ],
    real: 'grande',
    happened: 'O Congresso aprovou o auxílio emergencial de R$ 600 (R$ 1.200 para mães chefes de família), pago a cerca de 68 milhões de pessoas.',
    consequences: ['A pobreza caiu temporariamente em 2020, mesmo com o PIB recuando cerca de 3%.', 'A dívida pública subiu fortemente.', 'Com o fim do auxílio, a pobreza voltou a subir em 2021.'],
    debate: ['Defensores: evitou fome e uma recessão ainda maior.', 'Críticos: o custo foi alto e parte foi paga a quem não precisava.'],
  },
  {
    year: 2023,
    title: 'Arcabouço fiscal e reforma tributária',
    context: 'O teto de gastos havia sido furado várias vezes. A tributação sobre consumo era uma das mais complexas do mundo.',
    question: 'Qual a prioridade?',
    options: [
      { id: 'ambos', label: 'Trocar o teto por uma regra de gasto ligada à receita e unificar os impostos sobre consumo' },
      { id: 'teto', label: 'Manter o teto e não mexer nos impostos' },
      { id: 'gastar', label: 'Abandonar as regras fiscais' },
    ],
    real: 'ambos',
    happened: 'A Lei Complementar 200/2023 criou o arcabouço fiscal, e a Emenda Constitucional 132/2023 aprovou a reforma tributária do consumo, com transição até 2033.',
    consequences: ['O gasto pode crescer acima da inflação, limitado a uma fração do crescimento da receita.', 'Cinco tributos sobre consumo serão trocados por um IVA dual (CBS e IBS).'],
    debate: ['Defensores: regras mais flexíveis e realistas, e um sistema tributário mais simples.', 'Críticos: o arcabouço depende de aumentar receitas, e a reforma manteve muitas exceções.'],
  },
  {
    year: 2025,
    title: 'Isenção do Imposto de Renda até R$ 5 mil',
    context: 'A tabela do IR ficou anos sem correção, e trabalhadores de renda média passaram a pagar imposto.',
    question: 'Como compensar a perda de arrecadação?',
    options: [
      { id: 'altas', label: 'Imposto mínimo sobre altas rendas e retenção sobre dividendos' },
      { id: 'cortes', label: 'Cortar gastos' },
      { id: 'nada', label: 'Não compensar' },
    ],
    real: 'altas',
    happened: 'A Lei 15.270/2025 isentou quem ganha até R$ 5 mil a partir de 2026 e criou tributação mínima para altas rendas e retenção de 10% sobre dividendos acima de R$ 50 mil por mês.',
    consequences: ['Milhões de pessoas deixaram de pagar IR em 2026.', 'O efeito nas contas depende de a compensação arrecadar o previsto, o que só se verá em 2027.'],
    debate: ['Defensores: corrige uma injustiça e cobra mais de quem ganha muito.', 'Críticos: pode desestimular investimentos e reduz a base de contribuintes.'],
  },
]
