// Glossário em linguagem simples, para quem não conhece os termos.

export interface GlossaryTerm {
  id: string
  term: string
  /** Explicação curta, em uma ou duas frases */
  short: string
  /** Exemplo do dia a dia, opcional */
  example?: string
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  pib: {
    id: 'pib',
    term: 'PIB',
    short: 'Produto Interno Bruto: o valor de tudo o que é produzido no país (ou na região) em um ano, de pães a carros e serviços.',
    example: 'Se o PIB cresce, em geral há mais empregos e mais renda circulando.',
  },
  'pib-per-capita': {
    id: 'pib-per-capita',
    term: 'PIB per capita',
    short: 'O PIB dividido pelo número de habitantes: uma medida da renda média por pessoa.',
    example: 'Um estado com PIB per capita alto tem, em média, mais renda por morador.',
  },
  crescimento: {
    id: 'crescimento',
    term: 'Crescimento econômico',
    short: 'Quanto o PIB aumentou em relação ao ano anterior, descontada a inflação.',
    example: 'Crescer 2% ao ano significa produzir 2% a mais do que no ano passado.',
  },
  tendencia: {
    id: 'tendencia',
    term: 'Tendência histórica',
    short: 'O ritmo em que a economia da região cresceu entre 2002 e 2023. O jogo compara os resultados com esse ritmo para mostrar o efeito das suas decisões.',
  },
  divida: {
    id: 'divida',
    term: 'Dívida pública',
    short: 'Quanto o governo deve, medido como porcentagem do PIB. Cresce quando o governo gasta mais do que arrecada e quando os juros são altos.',
    example: 'Dívida de 80% do PIB: o governo deve o equivalente a 80% de tudo o que o país produz em um ano.',
  },
  'saldo-primario': {
    id: 'saldo-primario',
    term: 'Saldo primário',
    short: 'Receitas do governo menos as despesas, sem contar os juros da dívida. Positivo (superávit) ajuda a reduzir a dívida; negativo (déficit) a aumenta.',
  },
  juros: {
    id: 'juros',
    term: 'Juro real',
    short: 'Os juros descontada a inflação. Quanto maior, mais caro fica para o governo e para as empresas pegarem dinheiro emprestado.',
  },
  'premio-risco': {
    id: 'premio-risco',
    term: 'Prêmio de risco',
    short: 'Juros extras que investidores cobram quando acham que o país ou o governo é mais arriscado.',
  },
  bolsa: {
    id: 'bolsa',
    term: 'Bolsa de valores',
    short: 'Mercado onde se compram partes (ações) de empresas. Sobe quando investidores esperam lucros e regras estáveis; cai com incerteza.',
    example: 'Bolsa em alta facilita que empresas captem dinheiro para investir e contratar.',
  },
  impostos: {
    id: 'impostos',
    term: 'Carga tributária',
    short: 'Quanto da renda do país vai para impostos. No Brasil, cerca de um terço do PIB.',
  },
  'transferencias': {
    id: 'transferencias',
    term: 'Transferências federais',
    short: 'Dinheiro arrecadado pela União em uma região e gasto em outra, por meio de fundos, programas sociais e serviços.',
  },
  inflacao: {
    id: 'inflacao',
    term: 'Inflação',
    short: 'Aumento geral dos preços. Os valores do jogo estão em reais de 2023, ou seja, sem inflação.',
  },
  emendas: {
    id: 'emendas',
    term: 'Emendas parlamentares',
    short: 'Parte do orçamento que deputados e senadores indicam para obras e serviços, geralmente nas suas bases eleitorais. Também são usadas como moeda para formar maioria.',
  },
  'fundo-eleitoral': {
    id: 'fundo-eleitoral',
    term: 'Fundo eleitoral',
    short: 'Dinheiro público distribuído aos partidos para financiar campanhas em ano de eleição.',
  },
  'capital-politico': {
    id: 'capital-politico',
    term: 'Capital político',
    short: 'No jogo, sua moeda de negociação: apoio, favores e prestígio que você gasta para pedir urgência, negociar votos ou mudar textos.',
  },
  aprovacao: {
    id: 'aprovacao',
    term: 'Aprovação',
    short: 'Quanto a população aprova o governo (ou você). Decide eleições e influencia o apoio no Congresso.',
  },
  'base-governo': {
    id: 'base-governo',
    term: 'Base do governo',
    short: 'Partidos que apoiam o governo no Congresso, em geral em troca de ministérios, cargos e emendas. Os demais formam a oposição.',
  },
  oposicao: {
    id: 'oposicao',
    term: 'Oposição',
    short: 'Partidos que não fazem parte do governo e fiscalizam e criticam suas ações. Às vezes votam contra boas propostas para não dar vitórias ao governo.',
  },
  'orientacao': {
    id: 'orientacao',
    term: 'Orientação de bancada',
    short: 'A recomendação do líder do partido sobre como votar. Quem vota contra pode sofrer punições internas.',
  },
  'fidelidade': {
    id: 'fidelidade',
    term: 'Fidelidade partidária',
    short: 'Para deputados e vereadores, o mandato pertence ao partido: quem sai sem justa causa pode perdê-lo (entendimento do TSE e do STF desde 2007). Votar contra o partido também pode custar legenda e recursos na próxima eleição.',
  },
  'voto-estrategico': {
    id: 'voto-estrategico',
    term: 'Voto estratégico',
    short: 'Votar contra (ou a favor) por cálculo político, e não pelo conteúdo: por exemplo, rejeitar uma boa ideia do adversário para não dar a ele uma vitória antes da eleição.',
  },
  quorum: {
    id: 'quorum',
    term: 'Quórum',
    short: 'Número mínimo de votos (ou de presentes) exigido para aprovar algo. Leis comuns precisam da maioria dos presentes; emendas à Constituição, de 3/5 de todos os membros.',
  },
  pec: {
    id: 'pec',
    term: 'PEC',
    short: 'Proposta de Emenda à Constituição: muda o texto da Constituição. Exige 3/5 dos votos, em dois turnos, na Câmara e no Senado.',
  },
  'lei-complementar': {
    id: 'lei-complementar',
    term: 'Lei complementar',
    short: 'Lei sobre temas que a Constituição exige que sejam tratados com mais apoio: precisa da maioria absoluta (metade mais um de todos os membros).',
  },
  'lei-ordinaria': {
    id: 'lei-ordinaria',
    term: 'Lei ordinária',
    short: 'A lei comum: aprovada pela maioria dos presentes, desde que pelo menos metade dos membros esteja na sessão.',
  },
  mp: {
    id: 'mp',
    term: 'Medida provisória',
    short: 'Ato do presidente com força de lei imediata, para casos urgentes. Perde a validade se o Congresso não a aprovar em até 120 dias.',
  },
  ccj: {
    id: 'ccj',
    term: 'CCJ',
    short: 'Comissão de Constituição e Justiça: verifica se o projeto respeita a Constituição antes de seguir.',
  },
  relator: {
    id: 'relator',
    term: 'Relator',
    short: 'Parlamentar que analisa o projeto e propõe ao colegiado aprovar, rejeitar ou mudar o texto (substitutivo).',
  },
  jabuti: {
    id: 'jabuti',
    term: 'Jabuti',
    short: 'Trecho sem relação com o tema principal, inserido num projeto para aprovar algo de carona. Diz o ditado: jabuti não sobe em árvore; se está lá, alguém colocou.',
  },
  veto: {
    id: 'veto',
    term: 'Veto',
    short: 'Recusa do chefe do Executivo (presidente, governador ou prefeito) a uma lei aprovada. Pode ser total ou parcial e pode ser derrubado pelo Legislativo.',
  },
  sancao: {
    id: 'sancao',
    term: 'Sanção',
    short: 'Concordância do chefe do Executivo com uma lei aprovada, que então é publicada e passa a valer.',
  },
  adi: {
    id: 'adi',
    term: 'ADI',
    short: 'Ação Direta de Inconstitucionalidade: pedido ao STF para anular uma lei que contraria a Constituição.',
  },
  liminar: {
    id: 'liminar',
    term: 'Liminar monocrática',
    short: 'Decisão provisória e urgente tomada por um único ministro, que depois precisa ser confirmada pelo plenário.',
  },
  'seguranca-juridica': {
    id: 'seguranca-juridica',
    term: 'Segurança jurídica',
    short: 'Previsibilidade das regras: saber que leis e decisões não vão mudar de repente. Atrai investimento e reduz juros.',
  },
  'clausula-petrea': {
    id: 'clausula-petrea',
    term: 'Cláusula pétrea',
    short: 'Parte da Constituição que não pode ser abolida nem por emenda: federação, voto direto e secreto, separação dos poderes e direitos individuais.',
  },
  centrao: {
    id: 'centrao',
    term: 'Centrão',
    short: 'Apelido para partidos de centro muito pragmáticos, que costumam apoiar governos de diferentes linhas em troca de cargos e emendas.',
  },
  migracao: {
    id: 'migracao',
    term: 'Migração',
    short: 'Pessoas que mudam de região, em geral em busca de trabalho e renda melhores.',
  },
}

export function glossary(id: string): GlossaryTerm | undefined {
  return GLOSSARY[id]
}
