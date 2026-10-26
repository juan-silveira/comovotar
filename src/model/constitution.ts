// Base de conhecimento sobre a Constituição Federal de 1988 e leis
// relacionadas, em linguagem simples. Os textos são resumos (não citações
// literais) com a referência do dispositivo, para consulta no jogo.
// Fonte primária: planalto.gov.br/ccivil_03/constituicao/constituicao.htm

export interface LegalRef {
  id: string
  ref: string
  title: string
  summary: string
}

export const CONSTITUTION: Record<string, LegalRef> = {
  'art1': {
    id: 'art1',
    ref: 'CF, art. 1º',
    title: 'Federação indissolúvel',
    summary:
      'A República Federativa do Brasil é formada pela união indissolúvel dos estados, municípios e Distrito Federal. A separação simulada neste jogo é, portanto, um exercício hipotético.',
  },
  'art2': {
    id: 'art2',
    ref: 'CF, art. 2º',
    title: 'Separação dos poderes',
    summary: 'Legislativo, Executivo e Judiciário são poderes independentes e harmônicos entre si.',
  },
  'art14': {
    id: 'art14',
    ref: 'CF, art. 14',
    title: 'Eleições e reeleição',
    summary:
      'Voto direto, secreto, universal e periódico. Presidente, governadores e prefeitos podem ser reeleitos uma única vez para o período seguinte (§ 5º): depois de dois mandatos seguidos, só voltam a concorrer ao mesmo cargo após um mandato fora. Para disputar outro cargo, precisam renunciar até 6 meses antes da eleição (§ 6º).',
  },
  'art21': {
    id: 'art21',
    ref: 'CF, art. 21',
    title: 'Competências administrativas da União',
    summary:
      'Cabe à União, entre outros: manter relações com outros países, declarar guerra, emitir moeda, administrar reservas cambiais e planejar a defesa contra calamidades, especialmente secas e inundações.',
  },
  'art22': {
    id: 'art22',
    ref: 'CF, art. 22',
    title: 'Leis que só a União pode fazer',
    summary:
      'Competência privativa da União para legislar sobre direito penal, civil, eleitoral, do trabalho, trânsito, energia, imigração, entre outros. Estados e municípios não podem legislar sobre esses temas.',
  },
  'art23': {
    id: 'art23',
    ref: 'CF, art. 23',
    title: 'Competências comuns',
    summary:
      'União, estados e municípios cuidam juntos de saúde, educação, meio ambiente, combate à pobreza, moradia e saneamento.',
  },
  'art24': {
    id: 'art24',
    ref: 'CF, art. 24',
    title: 'Competência concorrente',
    summary:
      'União e estados legislam juntos sobre direito tributário, financeiro, orçamento, proteção ambiental e educação: a União fixa normas gerais e os estados as complementam.',
  },
  'art27': {
    id: 'art27',
    ref: 'CF, art. 27',
    title: 'Tamanho das Assembleias Legislativas',
    summary:
      'O número de deputados estaduais é o triplo da bancada federal do estado até 36; acima disso, soma-se um para cada deputado federal acima de 12.',
  },
  'art29': {
    id: 'art29',
    ref: 'CF, art. 29, IV',
    title: 'Tamanho das Câmaras Municipais',
    summary:
      'O número máximo de vereadores depende da população do município: 9 até 15 mil habitantes, chegando a 55 acima de 8 milhões (faixas da EC 58/2009).',
  },
  'art30': {
    id: 'art30',
    ref: 'CF, art. 30',
    title: 'Competências dos municípios',
    summary:
      'Os municípios legislam sobre assuntos de interesse local, instituem seus tributos (IPTU, ISS, ITBI), organizam o transporte coletivo e cuidam da educação infantil e fundamental e da atenção básica à saúde, com apoio da União e do estado.',
  },
  'art45': {
    id: 'art45',
    ref: 'CF, art. 45',
    title: 'Câmara dos Deputados',
    summary:
      'Representa o povo, com deputados eleitos pelo sistema proporcional em cada estado. Nenhum estado tem menos de 8 nem mais de 70 deputados; hoje a Câmara tem 513.',
  },
  'art46': {
    id: 'art46',
    ref: 'CF, art. 46',
    title: 'Senado Federal',
    summary:
      'Representa os estados: 3 senadores por estado e pelo Distrito Federal, eleitos pelo voto majoritário para mandatos de 8 anos, com renovação alternada de 1/3 e 2/3 a cada 4 anos.',
  },
  'art47': {
    id: 'art47',
    ref: 'CF, art. 47',
    title: 'Quórum padrão',
    summary:
      'Salvo exceção, as decisões de cada casa são tomadas por maioria dos votos, presente a maioria absoluta dos membros.',
  },
  'art49': {
    id: 'art49',
    ref: 'CF, art. 49',
    title: 'Competências exclusivas do Congresso',
    summary:
      'O Congresso resolve definitivamente sobre tratados internacionais, autoriza o presidente a declarar guerra, julga as contas do presidente e pode sustar atos do Executivo que exorbitem do poder regulamentar.',
  },
  'art52': {
    id: 'art52',
    ref: 'CF, art. 52',
    title: 'Competências privativas do Senado',
    summary:
      'O Senado aprova, após arguição pública (sabatina), ministros do STF e de tribunais superiores, o procurador-geral da República e diretores do Banco Central; julga o presidente nos crimes de responsabilidade; autoriza operações de crédito externo.',
  },
  'art53': {
    id: 'art53',
    ref: 'CF, art. 53',
    title: 'Imunidade parlamentar',
    summary: 'Deputados e senadores não respondem civil ou penalmente por suas opiniões, palavras e votos no exercício do mandato.',
  },
  'art58': {
    id: 'art58',
    ref: 'CF, art. 58, § 3º',
    title: 'Comissões Parlamentares de Inquérito',
    summary:
      'CPIs são criadas com a assinatura de 1/3 dos membros da casa, para apurar fato determinado por prazo certo, com poderes de investigação próprios das autoridades judiciais.',
  },
  'art59': {
    id: 'art59',
    ref: 'CF, art. 59',
    title: 'Espécies normativas',
    summary:
      'O processo legislativo compreende emendas à Constituição, leis complementares, leis ordinárias, leis delegadas, medidas provisórias, decretos legislativos e resoluções.',
  },
  'art60': {
    id: 'art60',
    ref: 'CF, art. 60',
    title: 'Emenda constitucional (PEC)',
    summary:
      'Proposta por 1/3 dos deputados ou senadores, pelo presidente ou por mais da metade das Assembleias. Aprovada por 3/5 dos votos, em dois turnos, em cada casa, e promulgada pelas Mesas, sem sanção presidencial.',
  },
  'art60p4': {
    id: 'art60p4',
    ref: 'CF, art. 60, § 4º',
    title: 'Cláusulas pétreas',
    summary:
      'Não pode ser sequer votada proposta tendente a abolir: a forma federativa de Estado; o voto direto, secreto, universal e periódico; a separação dos poderes; e os direitos e garantias individuais.',
  },
  'art61': {
    id: 'art61',
    ref: 'CF, art. 61',
    title: 'Quem pode propor leis',
    summary:
      'Qualquer deputado, senador ou comissão, o presidente, o STF, os tribunais superiores, o procurador-geral e os cidadãos (iniciativa popular: 1% do eleitorado em ao menos 5 estados).',
  },
  'art61p1': {
    id: 'art61p1',
    ref: 'CF, art. 61, § 1º',
    title: 'Iniciativa privativa do presidente',
    summary:
      'Só o presidente pode propor leis que fixem ou modifiquem os efetivos das Forças Armadas, criem cargos ou aumentem a remuneração na administração federal, ou criem e extingam ministérios e órgãos. Se um parlamentar propõe, há “vício de iniciativa”.',
  },
  'art62': {
    id: 'art62',
    ref: 'CF, art. 62',
    title: 'Medidas provisórias',
    summary:
      'Em caso de relevância e urgência, o presidente edita MP com força de lei imediata. Ela vale por 60 dias, prorrogáveis por mais 60; se o Congresso não a converter em lei, perde a eficácia. Não pode tratar de direito penal, eleitoral ou matéria reservada a lei complementar.',
  },
  'art63': {
    id: 'art63',
    ref: 'CF, art. 63',
    title: 'Limite a emendas parlamentares',
    summary:
      'Não se admite emenda que aumente a despesa em projetos de iniciativa exclusiva do presidente (salvo no orçamento, com regras próprias).',
  },
  'art64': {
    id: 'art64',
    ref: 'CF, art. 64',
    title: 'Casa iniciadora e urgência',
    summary:
      'Projetos do presidente, do STF e dos tribunais superiores começam na Câmara. O presidente pode pedir urgência: cada casa tem 45 dias para votar antes que a pauta seja trancada.',
  },
  'art65': {
    id: 'art65',
    ref: 'CF, art. 65',
    title: 'Casa revisora',
    summary:
      'O projeto aprovado numa casa é revisto pela outra em um só turno. Se aprovado, segue à sanção; se rejeitado, é arquivado; se emendado, volta à casa iniciadora, que decide sobre as emendas e dá a palavra final.',
  },
  'art66': {
    id: 'art66',
    ref: 'CF, art. 66',
    title: 'Sanção e veto',
    summary:
      'O presidente tem 15 dias úteis para sancionar ou vetar, total ou parcialmente, por inconstitucionalidade ou contrariedade ao interesse público; o silêncio vale como sanção. O veto é apreciado em sessão conjunta e só é derrubado pela maioria absoluta de deputados e de senadores.',
  },
  'art69': {
    id: 'art69',
    ref: 'CF, art. 69',
    title: 'Lei complementar',
    summary: 'Leis complementares exigem maioria absoluta (257 deputados e 41 senadores) e tratam de temas que a Constituição reserva a elas.',
  },
  'art84': {
    id: 'art84',
    ref: 'CF, art. 84',
    title: 'Competências do presidente',
    summary:
      'Nomear e exonerar ministros, sancionar e vetar leis, expedir decretos para fiel execução das leis, celebrar tratados (sujeitos ao Congresso), editar medidas provisórias e nomear ministros do STF após aprovação do Senado.',
  },
  'art85': {
    id: 'art85',
    ref: 'CF, arts. 85 e 86',
    title: 'Crime de responsabilidade e impeachment',
    summary:
      'A Câmara autoriza a abertura do processo por 2/3 dos deputados; o Senado julga e a condenação exige 2/3 dos senadores.',
  },
  'art101': {
    id: 'art101',
    ref: 'CF, art. 101',
    title: 'Composição do STF',
    summary:
      '11 ministros, com mais de 35 e menos de 70 anos na nomeação, de notável saber jurídico e reputação ilibada, nomeados pelo presidente após aprovação pela maioria absoluta do Senado. A aposentadoria compulsória é aos 75 anos.',
  },
  'art102': {
    id: 'art102',
    ref: 'CF, art. 102',
    title: 'Competências do STF',
    summary:
      'Guardar a Constituição: julgar ações diretas de inconstitucionalidade (ADI), ações por omissão (ADO), ações declaratórias (ADC) e arguições de descumprimento de preceito fundamental (ADPF), além de recursos extraordinários.',
  },
  'art103': {
    id: 'art103',
    ref: 'CF, art. 103',
    title: 'Quem pode propor ADI',
    summary:
      'Presidente, Mesas do Senado, da Câmara e das Assembleias, governadores, procurador-geral da República, Conselho Federal da OAB, partidos com representação no Congresso e confederações sindicais ou entidades de classe nacionais.',
  },
  'art97': {
    id: 'art97',
    ref: 'CF, art. 97 e Lei 9.868/1999',
    title: 'Plenário e decisões individuais',
    summary:
      'A declaração de inconstitucionalidade exige maioria absoluta do tribunal (6 de 11 no STF). Medidas cautelares em ADI devem ser concedidas pela maioria absoluta, salvo em recesso. Desde 2022, o regimento do STF exige que decisões individuais que suspendam leis sejam levadas ao plenário de imediato.',
  },
  'art150': {
    id: 'art150',
    ref: 'CF, art. 150',
    title: 'Limites ao poder de tributar',
    summary:
      'Nenhum tributo pode ser criado ou aumentado sem lei (legalidade), nem cobrado no mesmo exercício da lei que o instituiu (anterioridade). Benefícios fiscais exigem lei específica.',
  },
  'art155': {
    id: 'art155',
    ref: 'CF, art. 155, § 2º, XII, g',
    title: 'ICMS e guerra fiscal',
    summary:
      'Isenções e benefícios de ICMS dependem de deliberação conjunta dos estados (convênio no CONFAZ, LC 24/1975). Benefícios concedidos sem convênio são inconstitucionais; a LC 160/2017 permitiu convalidar os antigos.',
  },
  'art165': {
    id: 'art165',
    ref: 'CF, arts. 165 e 166',
    title: 'Orçamento',
    summary:
      'O Executivo propõe o plano plurianual, a lei de diretrizes orçamentárias e a lei orçamentária anual; o Congresso vota e pode emendar. Emendas individuais e de bancada têm execução obrigatória (EC 86/2015 e EC 100/2019).',
  },
  'art166': {
    id: 'art166',
    ref: 'CF, art. 166, §§ 9º a 12, e art. 166-A',
    title: 'Emendas individuais impositivas',
    summary:
      'Cada deputado e senador indica emendas individuais que somam 2% da receita corrente líquida do ano anterior (1,55% para a Câmara e 0,45% para o Senado, EC 126/2022). Metade vai obrigatoriamente para a saúde, e o governo é obrigado a pagá-las. Desde a EC 105/2019 existe a “transferência especial” (emenda Pix), que vai direto ao caixa de estados e municípios; o STF passou a exigir rastreabilidade e transparência dessas transferências (ADPF 854).',
  },
  'art198': {
    id: 'art198',
    ref: 'CF, arts. 198 e 212',
    title: 'Mínimos de saúde e educação',
    summary:
      'A Constituição obriga gastos mínimos: na saúde, 15% da receita corrente líquida da União, 12% da receita de impostos dos estados e 15% da dos municípios; na educação, 18% dos impostos da União e 25% dos de estados e municípios. Por isso a maior parte do orçamento já chega “carimbada”.',
  },
  'lrf9': {
    id: 'lrf9',
    ref: 'LC 101/2000 (Lei de Responsabilidade Fiscal), art. 9º',
    title: 'Contingenciamento',
    summary:
      'Se, a cada dois meses, a receita indicar que a meta fiscal não será cumprida, o governo deve bloquear (contingenciar) despesas não obrigatórias. Emendas impositivas também podem ser bloqueadas na mesma proporção.',
  },
  'adct88': {
    id: 'adct88',
    ref: 'ADCT, art. 88 e LC 157/2016',
    title: 'Alíquota mínima do ISS',
    summary: 'O ISS não pode ter alíquota efetiva inferior a 2%. Municípios que concedem benefícios abaixo disso cometem ato de improbidade.',
  },
  'lrf14': {
    id: 'lrf14',
    ref: 'LC 101/2000 (Lei de Responsabilidade Fiscal), art. 14',
    title: 'Renúncia de receita',
    summary:
      'Toda renúncia de receita (isenção, redução de alíquota) precisa de estimativa de impacto e de medidas de compensação, como aumento de outro tributo ou corte de despesa.',
  },
  'adi5127': {
    id: 'adi5127',
    ref: 'STF, ADI 5127 (2015)',
    title: 'Jabutis em medidas provisórias',
    summary:
      'O STF decidiu que emendas sem pertinência temática inseridas na conversão de medidas provisórias (os “jabutis” ou “contrabando legislativo”) são incompatíveis com a Constituição, com efeitos daquele julgamento em diante.',
  },
  're1054110': {
    id: 're1054110',
    ref: 'STF, RE 1.054.110 (Tema 967, 2019)',
    title: 'Proibição de transporte por aplicativo',
    summary:
      'O STF decidiu que municípios não podem proibir o transporte individual por aplicativo, por violar a livre iniciativa e a livre concorrência; podem apenas regulamentá-lo.',
  },
  'lc179': {
    id: 'lc179',
    ref: 'LC 179/2021',
    title: 'Autonomia do Banco Central',
    summary:
      'Fixou mandatos para o presidente e os diretores do Banco Central, não coincidentes com o do presidente da República. A Selic é definida pelo Comitê de Política Monetária (Copom).',
  },
  'lei12608': {
    id: 'lei12608',
    ref: 'Lei 12.608/2012',
    title: 'Política Nacional de Proteção e Defesa Civil',
    summary:
      'Define deveres da União, estados e municípios na prevenção de desastres: mapeamento de áreas de risco, planos de contingência e sistemas de alerta.',
  },
}

export function legalRef(id: string): LegalRef | undefined {
  return CONSTITUTION[id]
}
