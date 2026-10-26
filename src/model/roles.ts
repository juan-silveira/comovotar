// Cargos jogáveis: competências (o que pode e o que não pode fazer),
// mandato, regras de reeleição e território de atuação.

import type { Level, Office } from './bills'

export type Territory = 'municipio' | 'uf' | 'bloco'

export interface RoleInfo {
  office: Office
  title: string
  level: Level
  power: 'Legislativo' | 'Executivo' | 'Judiciário'
  territory: Territory
  /** Casa ou órgão */
  body: string
  termYears: number | null
  reelection: string
  election: 'municipal' | 'geral' | null
  can: string[]
  cannot: string[]
  /** Como o cargo funciona na prática, com visões em debate */
  practice: string[]
  refs: string[]
}

export const ROLES: Record<Office, RoleInfo> = {
  vereador: {
    office: 'vereador',
    title: 'Vereador(a)',
    level: 'municipal',
    power: 'Legislativo',
    territory: 'municipio',
    body: 'Câmara Municipal',
    termYears: 4,
    reelection: 'Sem limite de reeleições.',
    election: 'municipal',
    can: [
      'Propor leis sobre assuntos de interesse local (transporte, uso do solo, serviços municipais).',
      'Votar o orçamento municipal e apresentar emendas a ele.',
      'Fiscalizar o prefeito e julgar suas contas, com parecer do Tribunal de Contas.',
      'Criar comissões de inquérito municipais e derrubar vetos do prefeito.',
    ],
    cannot: [
      'Legislar sobre direito penal, trânsito, trabalho ou energia (competência da União, art. 22).',
      'Criar secretarias, cargos ou aumentar salários do Executivo (iniciativa do prefeito).',
      'Reduzir o ISS abaixo de 2% ou proibir o transporte por aplicativo.',
      'Executar obras ou contratar diretamente: isso é papel do prefeito.',
    ],
    practice: [
      'Grande parte das leis municipais aprovadas são de denominação de ruas e datas comemorativas; a fiscalização do Executivo varia muito entre cidades.',
      'Em muitas Câmaras, a base do prefeito é ampla e a oposição pequena, o que reduz o controle sobre o Executivo.',
    ],
    refs: ['art29', 'art30', 'art61p1', 'adct88', 're1054110'],
  },
  prefeito: {
    office: 'prefeito',
    title: 'Prefeito(a)',
    level: 'municipal',
    power: 'Executivo',
    territory: 'municipio',
    body: 'Prefeitura',
    termYears: 4,
    reelection: 'Uma reeleição consecutiva: depois de 8 anos seguidos, precisa ficar um mandato fora para voltar (art. 14, § 5º). Para disputar outro cargo, renuncia 6 meses antes da eleição (art. 14, § 6º).',
    election: 'municipal',
    can: [
      'Executar o orçamento: obras, saúde básica, educação infantil e fundamental, coleta de lixo, transporte coletivo.',
      'Propor leis, inclusive as de sua iniciativa exclusiva (estrutura da prefeitura, cargos, orçamento).',
      'Sancionar ou vetar leis aprovadas pela Câmara.',
      'Cobrar IPTU, ISS e ITBI e decretar situação de emergência em desastres.',
    ],
    cannot: [
      'Comandar a Polícia Militar ou Civil (são estaduais).',
      'Criar crimes, mudar regras de trânsito nacionais ou cobrar impostos federais e estaduais.',
      'Gastar mais de 54% da receita corrente líquida com pessoal do Executivo (Lei de Responsabilidade Fiscal).',
    ],
    practice: [
      'Municípios dependem muito de transferências do estado e da União; emendas de deputados e senadores são fonte importante de investimento.',
      'Obras tendem a se concentrar perto das eleições, o chamado ciclo político-orçamentário.',
    ],
    refs: ['art30', 'art14', 'lrf14', 'lei12608'],
  },
  'deputado-estadual': {
    office: 'deputado-estadual',
    title: 'Deputado(a) estadual',
    level: 'estadual',
    power: 'Legislativo',
    territory: 'uf',
    body: 'Assembleia Legislativa',
    termYears: 4,
    reelection: 'Sem limite de reeleições.',
    election: 'geral',
    can: [
      'Propor e votar leis estaduais e emendas à Constituição Estadual.',
      'Votar o orçamento do estado e fiscalizar o governador.',
      'Criar CPIs estaduais e derrubar vetos do governador.',
    ],
    cannot: [
      'Legislar sobre temas privativos da União (penal, civil, trabalho, energia).',
      'Propor leis que criem cargos ou aumentem salários do Executivo estadual (iniciativa do governador).',
      'Aprovar benefícios de ICMS sem convênio entre os estados (CONFAZ).',
    ],
    practice: [
      'Assembleias costumam ter base governista ampla; a atuação mais visível são emendas ao orçamento para os municípios da base eleitoral.',
    ],
    refs: ['art27', 'art24', 'art155', 'art61p1'],
  },
  governador: {
    office: 'governador',
    title: 'Governador(a)',
    level: 'estadual',
    power: 'Executivo',
    territory: 'uf',
    body: 'Governo do Estado',
    termYears: 4,
    reelection: 'Uma reeleição consecutiva: depois de 8 anos seguidos, precisa ficar um mandato fora para voltar (art. 14, § 5º). Para disputar outro cargo, renuncia 6 meses antes da eleição (art. 14, § 6º).',
    election: 'geral',
    can: [
      'Comandar a segurança pública: Polícia Militar, Polícia Civil e Corpo de Bombeiros.',
      'Administrar o ensino médio, hospitais estaduais, rodovias estaduais e saneamento (em parceria com municípios).',
      'Cobrar ICMS, IPVA e ITCMD; propor leis e sancionar ou vetar as da Assembleia.',
      'Propor ação de inconstitucionalidade no STF.',
    ],
    cannot: [
      'Emitir moeda, fazer política externa ou comandar as Forças Armadas.',
      'Conceder benefícios de ICMS sem convênio com os demais estados.',
      'Contrair dívida externa sem autorização do Senado.',
    ],
    practice: [
      'A “guerra fiscal” entre estados por fábricas foi marcada por benefícios sem convênio, depois convalidados pela LC 160/2017.',
      'Estados com dívidas altas renegociam com a União em troca de ajustes fiscais.',
    ],
    refs: ['art155', 'art103', 'art52', 'art14'],
  },
  'deputado-federal': {
    office: 'deputado-federal',
    title: 'Deputado(a) federal',
    level: 'federal',
    power: 'Legislativo',
    territory: 'uf',
    body: 'Câmara dos Deputados',
    termYears: 4,
    reelection: 'Sem limite de reeleições.',
    election: 'geral',
    can: [
      'Propor leis ordinárias e complementares; propor PEC com 1/3 da Câmara.',
      'Votar medidas provisórias, vetos e o orçamento, apresentando emendas individuais de execução obrigatória.',
      'Autorizar a abertura de impeachment (2/3) e criar CPIs (1/3 das assinaturas).',
    ],
    cannot: [
      'Executar o orçamento ou nomear ministros.',
      'Propor leis de iniciativa privativa do presidente (cargos, ministérios, efetivos militares).',
      'Votar propostas que abolam cláusulas pétreas.',
    ],
    practice: [
      'O presidente da Câmara controla a pauta: decide o que vai a votação, o que dá grande poder de negociação.',
      'Emendas parlamentares cresceram e passaram a ter execução obrigatória; as “emendas de relator” foram declaradas inconstitucionais pelo STF em 2022 por falta de transparência.',
      'Jabutis (emendas sem relação com o tema) são comuns em medidas provisórias; o STF vetou essa prática em 2015 (ADI 5127).',
    ],
    refs: ['art45', 'art60', 'art61', 'art62', 'art165', 'adi5127', 'art85'],
  },
  senador: {
    office: 'senador',
    title: 'Senador(a)',
    level: 'federal',
    power: 'Legislativo',
    territory: 'uf',
    body: 'Senado Federal',
    termYears: 8,
    reelection: 'Sem limite de reeleições.',
    election: 'geral',
    can: [
      'Propor e revisar leis e PECs aprovadas pela Câmara.',
      'Sabatinar e aprovar ministros do STF, o procurador-geral e diretores do Banco Central.',
      'Julgar o presidente em processo de impeachment e autorizar empréstimos externos.',
    ],
    cannot: [
      'Executar o orçamento ou nomear ministros.',
      'Propor leis de iniciativa privativa do presidente.',
    ],
    practice: [
      'O Senado raramente rejeita indicações ao STF (as últimas rejeições foram em 1894), mas sabatinas já foram adiadas por meses como forma de pressão.',
      'Cada estado tem 3 senadores, independentemente da população: estados pequenos têm peso maior no Senado.',
    ],
    refs: ['art46', 'art52', 'art101', 'art65'],
  },
  presidente: {
    office: 'presidente',
    title: 'Presidente da República',
    level: 'federal',
    power: 'Executivo',
    territory: 'bloco',
    body: 'Presidência da República',
    termYears: 4,
    reelection: 'Uma reeleição consecutiva: depois de 8 anos seguidos, precisa ficar um mandato fora para voltar (art. 14, § 5º). Para disputar outro cargo, renuncia 6 meses antes da eleição (art. 14, § 6º).',
    election: 'geral',
    can: [
      'Nomear e exonerar ministros; montar o ministério.',
      'Sancionar ou vetar leis; editar medidas provisórias em caso de relevância e urgência.',
      'Celebrar tratados (sujeitos ao Congresso) e indicar ministros do STF (aprovados pelo Senado).',
      'Propor o orçamento e as leis de sua iniciativa exclusiva.',
    ],
    cannot: [
      'Legislar sem o Congresso, salvo por MP, que perde validade se não for convertida em lei.',
      'Editar MP sobre direito penal, eleitoral ou temas de lei complementar.',
      'Dissolver o Congresso, demitir ministros do STF ou descumprir decisões judiciais.',
    ],
    practice: [
      'No “presidencialismo de coalizão”, presidentes distribuem ministérios a partidos aliados para formar maioria no Congresso.',
      'Medidas provisórias foram muito usadas para legislar; desde 2001 (EC 32) elas trancam a pauta e não podem ser reeditadas indefinidamente.',
    ],
    refs: ['art84', 'art62', 'art66', 'art101', 'art85'],
  },
  'ministro-stf': {
    office: 'ministro-stf',
    title: 'Ministro(a) do STF',
    level: 'federal',
    power: 'Judiciário',
    territory: 'bloco',
    body: 'Supremo Tribunal Federal',
    termYears: null,
    reelection: 'Vitalício até os 75 anos; não há eleição.',
    election: null,
    can: [
      'Julgar ações de inconstitucionalidade, omissão e descumprimento de preceito fundamental.',
      'Como relator, conceder liminares individuais (que precisam ser referendadas pelo plenário).',
      'Pedir vista para examinar melhor um processo (com prazo de 90 dias pelo regimento).',
    ],
    cannot: [
      'Agir de ofício: o tribunal só julga quando provocado por quem tem legitimidade (art. 103).',
      'Propor leis, ser filiado a partido ou exercer atividade político-partidária (art. 95).',
      'Declarar sozinho a inconstitucionalidade de uma lei em definitivo: são necessários 6 dos 11 votos.',
    ],
    practice: [
      'Decisões individuais (monocráticas) de grande impacto geram debate: para críticos, concentram poder; para defensores, evitam danos urgentes. Desde 2022, liminares que suspendem leis vão logo ao plenário.',
      'Quando o Congresso não regula um tema, o tribunal às vezes fixa regras provisórias (ação por omissão). Críticos falam em “legislar”; defensores, em proteger direitos previstos na Constituição.',
      'Mudanças de composição já levaram a revisões de entendimento, como na prisão após a segunda instância (2016 e 2019).',
    ],
    refs: ['art101', 'art102', 'art103', 'art97'],
  },
}

export const OFFICE_ORDER: Office[] = [
  'vereador',
  'prefeito',
  'deputado-estadual',
  'governador',
  'deputado-federal',
  'senador',
  'presidente',
  'ministro-stf',
]

/** O cargo faz parte do Executivo do seu território? */
export function isExecutive(o: Office) {
  return o === 'prefeito' || o === 'governador' || o === 'presidente'
}

export function isLegislator(o: Office) {
  return ROLES[o].power === 'Legislativo'
}

/** Ícone de cada cargo nos menus do jogo. */
export const OFFICE_ICONS: Record<Office, string> = {
  vereador: '🏘️',
  prefeito: '🏙️',
  'deputado-estadual': '📜',
  governador: '🗺️',
  'deputado-federal': '🗳️',
  senador: '🏛️',
  presidente: '⭐',
  'ministro-stf': '⚖️',
}
