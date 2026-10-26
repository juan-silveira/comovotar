// Pautas próprias de cada nível: processos do STF, decisões da prefeitura,
// da Câmara Municipal e do governo estadual. Usam o mesmo formato das
// pressões (opções com prós, contras e efeitos). Nos casos do STF, depois de
// votar, o jogador vê o que o tribunal decidiu de verdade.

import type { Office } from './bills'
import type { PressureEvent, PressureOption } from './pressure'

/** Opções padrão de um julgamento no STF. */
function judgeOptions(forLabel: string, againstLabel: string, real: string): PressureOption[] {
  return [
    {
      id: 'plenario-favor',
      label: `Levar ao plenário e votar: ${forLabel}`,
      pros: ['Decisão colegiada tem mais legitimidade (+2).'],
      cons: ['Leva mais tempo; você pode ficar vencido(a).'],
      approval: 2,
      okText: real,
    },
    {
      id: 'plenario-contra',
      label: `Levar ao plenário e votar: ${againstLabel}`,
      pros: ['Decisão colegiada tem mais legitimidade (+2).'],
      cons: ['Leva mais tempo; você pode ficar vencido(a).'],
      approval: 2,
      okText: real,
    },
    {
      id: 'liminar',
      label: 'Decidir sozinho(a), por liminar',
      pros: ['Resposta imediata em caso urgente (+1 de capital: influência).'],
      cons: ['Decisões monocráticas são criticadas como excesso de poder individual (−2).'],
      approval: -2,
      capital: 1,
      growth: -0.01,
      okText: real,
    },
    {
      id: 'vista',
      label: 'Pedir vista (mais tempo para analisar)',
      pros: ['Permite estudar melhor um caso complexo.'],
      cons: ['Pedidos de vista longos são criticados como forma de engavetar (−1).'],
      approval: -1,
      okText: real,
    },
  ]
}

const STF: Office[] = ['ministro-stf']

/** Grandes casos que o STF julgou de verdade (cada um aparece uma vez). */
export const STF_LANDMARKS: PressureEvent[] = [
  {
    id: 'stf-segunda-instancia',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Prisão após condenação em segunda instância',
    text: 'A Constituição diz que ninguém será considerado culpado até o trânsito em julgado (art. 5º, LVII). Pode-se prender depois da condenação em segunda instância, antes dos recursos aos tribunais superiores?',
    options: judgeOptions('permitir a prisão em segunda instância', 'exigir o fim de todos os recursos', 'Na vida real, em 2019 o STF decidiu por 6 a 5 que a pena só começa a ser cumprida após o trânsito em julgado (ADCs 43, 44 e 54).'),
  },
  {
    id: 'stf-maconha',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Porte de maconha para uso pessoal',
    text: 'A Lei de Drogas pune quem porta drogas para consumo, sem prisão, mas não diz a quantidade que separa usuário de traficante. A diferença costuma depender da avaliação do policial.',
    options: judgeOptions('deixar de ser crime e fixar uma quantidade', 'manter como crime', 'Na vida real, em 2024 o STF decidiu que o porte de maconha para uso pessoal deixa de ser crime (vira infração administrativa) e presumiu usuário quem tem até 40 gramas (RE 635.659). Parte do Congresso reagiu com uma proposta de emenda constitucional.'),
  },
  {
    id: 'stf-marco-temporal',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Marco temporal das terras indígenas',
    text: 'Povos indígenas só teriam direito às terras que ocupavam em 5 de outubro de 1988, data da Constituição? Produtores rurais defendem a tese; indígenas dizem que muitos foram expulsos antes.',
    options: judgeOptions('rejeitar o marco temporal', 'adotar o marco temporal', 'Na vida real, em 2023 o STF rejeitou o marco temporal por 9 a 2 (RE 1.017.365). Logo depois, o Congresso aprovou a Lei 14.701/2023 adotando a tese, e o conflito voltou ao tribunal.'),
  },
  {
    id: 'stf-redes',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Responsabilidade das redes sociais',
    text: 'Pelo Marco Civil da Internet (art. 19), plataformas só respondem por conteúdo de usuários se descumprirem ordem judicial. Isso protege a liberdade de expressão ou deixa crimes sem resposta?',
    options: judgeOptions('responsabilizar as plataformas em casos graves', 'manter a exigência de ordem judicial', 'Na vida real, em 2025 o STF considerou o art. 19 parcialmente inconstitucional: em casos graves, como ataques à democracia e crimes contra crianças, as plataformas podem responder mesmo sem ordem judicial.'),
  },
  {
    id: 'stf-homotransfobia',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Criminalização da homotransfobia',
    text: 'Partidos alegam que o Congresso está omisso em punir a discriminação contra pessoas LGBT. O tribunal pode enquadrar a conduta numa lei existente até o Congresso legislar?',
    options: judgeOptions('enquadrar na Lei do Racismo até haver lei própria', 'esperar o Congresso legislar', 'Na vida real, em 2019 o STF enquadrou a homotransfobia na Lei do Racismo até que o Congresso aprove lei específica (ADO 26). Críticos disseram que o tribunal legislou; defensores, que supriu uma omissão inconstitucional.'),
  },
  {
    id: 'stf-financiamento',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Doações de empresas a campanhas',
    text: 'Empresas podiam doar a candidatos e partidos. A OAB alega que isso desequilibra as eleições e favorece a corrupção.',
    options: judgeOptions('proibir doações de empresas', 'manter as doações', 'Na vida real, em 2015 o STF proibiu doações de empresas a campanhas (ADI 4.650). Depois, o Congresso criou o fundo eleitoral, pago com dinheiro público.'),
  },
  {
    id: 'stf-orcamento-secreto',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Emendas de relator (“orçamento secreto”)',
    text: 'Bilhões em emendas eram distribuídos pelo relator do orçamento sem identificar quais parlamentares indicaram nem para onde foi o dinheiro.',
    options: judgeOptions('declarar inconstitucional e exigir transparência', 'manter a prática', 'Na vida real, em 2022 o STF declarou as emendas de relator inconstitucionais por falta de transparência (ADPFs 850, 851 e 854) e, depois, exigiu rastreabilidade também das “emendas Pix”.'),
  },
  {
    id: 'stf-foro',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Alcance do foro privilegiado',
    text: 'Deputados e senadores são julgados pelo STF. Isso vale para qualquer crime, inclusive anterior ao mandato?',
    options: judgeOptions('limitar a crimes cometidos no cargo e por causa dele', 'manter para todos os crimes', 'Na vida real, em 2018 o STF limitou o foro a crimes cometidos no cargo e em razão dele (AP 937). Em 2025, decidiu que o foro continua mesmo depois de o político deixar o cargo, nesses casos.'),
  },
  {
    id: 'stf-uniao-homoafetiva',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'União estável entre pessoas do mesmo sexo',
    text: 'O Código Civil fala em união estável “entre o homem e a mulher”. Casais do mesmo sexo têm os mesmos direitos?',
    options: judgeOptions('reconhecer a união estável', 'manter a leitura literal da lei', 'Na vida real, em 2011 o STF reconheceu por unanimidade a união estável entre pessoas do mesmo sexo (ADI 4.277 e ADPF 132); em 2013, o CNJ obrigou os cartórios a celebrar casamentos.'),
  },
  {
    id: 'stf-piso-enfermagem',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Piso salarial da enfermagem',
    text: 'O Congresso aprovou um piso nacional para enfermeiros, técnicos e auxiliares. Hospitais, estados e municípios dizem que não há dinheiro e que haverá demissões.',
    options: judgeOptions('manter o piso desde já', 'suspender até haver fonte de recursos', 'Na vida real, em 2022 um ministro suspendeu o piso por liminar; em 2023 o plenário liberou o pagamento condicionado a recursos da União para estados, municípios e entidades filantrópicas.'),
  },
]

/** Processos recorrentes do dia a dia do STF. */
export const STF_ROUTINE: PressureEvent[] = [
  {
    id: 'stf-habeas',
    offices: STF,
    icon: '⚖️',
    group: 'Turma do STF',
    title: 'Habeas corpus de ex-governador preso preventivamente',
    text: 'Preso há meses sem condenação numa investigação de corrupção, um ex-governador pede liberdade. A acusação diz que ele pode destruir provas.',
    options: [
      { id: 'conceder', label: 'Conceder: substituir a prisão por medidas cautelares', pros: ['Prisão antes da condenação deve ser exceção.'], cons: ['Parte do público vê como impunidade (−2).'], approval: -2 },
      { id: 'negar', label: 'Negar: manter a prisão', pros: ['Protege a investigação (+1).'], cons: ['Prisões preventivas longas são criticadas por juristas.'], approval: 1 },
      { id: 'liminar', label: 'Decidir sozinho(a), por liminar', pros: ['Resposta rápida.'], cons: ['Decisões monocráticas em casos de políticos geram desconfiança (−2).'], approval: -2, capital: 1 },
    ],
  },
  {
    id: 'stf-adi-estadual',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Lei estadual invade competência da União?',
    text: 'Uma Assembleia aprovou lei sobre um tema que a Constituição reserva à União, como trânsito, telecomunicações ou diretrizes da educação. O procurador-geral pede a anulação.',
    options: [
      { id: 'anular', label: 'Declarar a lei inconstitucional', pros: ['Respeita a divisão de competências (+1).'], cons: ['O estado e os eleitores que apoiaram a lei reagem.'], approval: 1, growth: 0.01 },
      { id: 'manter', label: 'Manter a lei', pros: ['Valoriza a autonomia dos estados.'], cons: ['Cria regras diferentes pelo país e insegurança jurídica.'], growth: -0.01 },
    ],
  },
  {
    id: 'stf-inquerito',
    offices: STF,
    icon: '⚖️',
    group: 'Relatoria no STF',
    title: 'Procuradoria pede inquérito contra deputado federal',
    text: 'Como relator(a), você recebe o pedido de investigação de um parlamentar por suspeita de desvio de emendas.',
    options: [
      { id: 'autorizar', label: 'Autorizar a investigação', pros: ['Ninguém está acima da lei (+1).'], cons: ['Parlamentares reclamam de interferência do Judiciário.'], approval: 1, capital: -1 },
      { id: 'arquivar', label: 'Arquivar por falta de indícios', pros: ['Evita investigações sem base.'], cons: ['Se surgirem provas depois, a decisão será cobrada (−2).'], approval: -2, capital: 1 },
    ],
  },
  {
    id: 'stf-decreto',
    offices: STF,
    icon: '⚖️',
    group: 'Relatoria no STF',
    title: 'Partido pede a suspensão de um decreto do presidente',
    text: 'O decreto muda regras de uma política pública sem passar pelo Congresso. A oposição diz que ele vai além do que a lei permite.',
    options: [
      { id: 'liminar', label: 'Suspender por liminar', pros: ['Evita efeitos imediatos de um ato possivelmente ilegal.'], cons: ['O governo acusa o STF de governar (−1).'], approval: -1, capital: 1, growth: -0.01 },
      { id: 'plenario', label: 'Levar direto ao plenário', pros: ['Decisão colegiada (+2).'], cons: ['O decreto vale enquanto não há julgamento.'], approval: 2 },
      { id: 'negar', label: 'Negar a suspensão', pros: ['Respeita a margem do Executivo.'], cons: ['A oposição critica.'], growth: 0.01 },
    ],
  },
  {
    id: 'stf-pec-monocraticas',
    offices: STF,
    icon: '🏛️',
    group: 'Relação entre Poderes',
    title: 'Congresso discute limitar decisões individuais de ministros',
    text: 'Uma proposta de emenda constitucional proíbe que um ministro sozinho suspenda leis aprovadas pelo Congresso.',
    options: [
      { id: 'autocontencao', label: 'Defender mais decisões em plenário, sem atacar o Congresso', pros: ['Reduz a tensão entre os Poderes (+2).'], cons: ['Colegas que usam liminares discordam.'], approval: 2 },
      { id: 'criticar', label: 'Criticar publicamente a proposta', pros: ['Defende a independência do Judiciário.'], cons: ['Aumenta o conflito com o Legislativo (−1).'], approval: -1 },
    ],
  },
  {
    id: 'stf-icms-energia',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'ICMS sobre energia e telecomunicações acima da alíquota geral',
    text: 'Estados cobram alíquotas de 25% a 30% sobre luz e internet, mais que sobre a maioria dos produtos. Empresas dizem que serviços essenciais não podem ser mais tributados.',
    options: judgeOptions('limitar à alíquota geral', 'manter a cobrança atual', 'Na vida real, em 2021 o STF decidiu que estados não podem cobrar ICMS sobre energia e telecomunicações acima da alíquota geral (Tema 745), com efeitos a partir de 2024.'),
  },
  {
    id: 'stf-precatorios',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Governo adia o pagamento de dívidas judiciais',
    text: 'Uma emenda constitucional limitou o pagamento de precatórios (dívidas do governo reconhecidas pela Justiça) para abrir espaço no orçamento. Credores dizem que é calote.',
    options: judgeOptions('derrubar o limite e exigir o pagamento', 'manter o limite', 'Na vida real, em 2023 o STF derrubou o limite de pagamento de precatórios criado em 2021 e permitiu que a União quitasse o estoque atrasado fora das regras fiscais.'),
  },
  {
    id: 'stf-greve-policia',
    offices: STF,
    icon: '⚖️',
    group: 'Plenário do STF',
    title: 'Policiais podem fazer greve?',
    text: 'A Constituição proíbe greve de militares, mas não fala de policiais civis. Uma paralisação deixou uma cidade sem investigações.',
    options: judgeOptions('proibir a greve de policiais', 'permitir com serviço mínimo', 'Na vida real, em 2017 o STF proibiu a greve de policiais civis e de outras carreiras de segurança pública (ARE 654.432).'),
  },
  {
    id: 'stf-remedio',
    offices: STF,
    icon: '⚖️',
    group: 'Relatoria no STF',
    title: 'Paciente pede remédio de alto custo fora da lista do SUS',
    text: 'Um tratamento custa milhões por ano. Negar pode custar uma vida; conceder a todos que pedirem pode desequilibrar o orçamento da saúde.',
    options: judgeOptions('conceder com critérios rígidos', 'negar e manter a lista do SUS', 'Na vida real, o STF fixou critérios em 2024 (Temas 6 e 1.234): remédios fora da lista só por exceção, com comprovação de eficácia e falta de alternativa, e com divisão de custos entre União, estados e municípios.'),
  },
]

/** Pautas da prefeitura, da Câmara Municipal e do governo estadual. */
export const LOCAL_EVENTS: PressureEvent[] = [
  {
    id: 'tarifa-onibus',
    offices: ['prefeito', 'vereador'],
    icon: '🚌',
    group: 'Transporte',
    title: 'Empresas de ônibus pedem reajuste da tarifa',
    text: 'O diesel subiu e as concessionárias ameaçam reduzir a frota. A tarifa é definida pela prefeitura, e o contrato prevê reequilíbrio.',
    options: [
      { id: 'reajustar', label: 'Reajustar a tarifa', pros: ['Mantém o serviço sem gastar do orçamento.'], cons: ['Passageiros protestam (−3).'], approval: -3 },
      { id: 'subsidiar', label: 'Manter a tarifa e pagar subsídio às empresas', pros: ['Protege o bolso de quem usa ônibus (+2).'], cons: ['Custa dinheiro que sairia de saúde e educação.'], approval: 2, growth: -0.02 },
      { id: 'auditar', label: 'Auditar os custos antes de decidir', pros: ['Verifica se o aumento é justo.'], cons: ['As empresas reduzem a frota enquanto isso (−1).'], approval: -1, capital: -1 },
    ],
  },
  {
    id: 'plano-diretor',
    offices: ['prefeito', 'vereador'],
    icon: '🏙️',
    group: 'Urbanismo',
    title: 'Revisão do plano diretor da cidade',
    text: 'O plano diretor define onde se pode construir prédios altos, comércio e áreas de proteção. Construtoras querem liberar mais andares; moradores temem trânsito e perda de áreas verdes.',
    options: [
      { id: 'adensar', label: 'Permitir mais prédios perto do transporte público', pros: ['Mais moradias, aluguel mais barato no longo prazo.'], cons: ['Vizinhos se opõem (−1).'], growth: 0.04, approval: -1 },
      { id: 'proteger', label: 'Restringir construções e ampliar áreas verdes', pros: ['Preserva bairros e o meio ambiente (+1).'], cons: ['Menos moradias; preços sobem.'], approval: 1, growth: -0.02 },
    ],
  },
  {
    id: 'creches',
    offices: ['prefeito', 'vereador'],
    icon: '🧸',
    group: 'Educação',
    title: 'Fila por vaga em creche',
    text: 'Milhares de crianças esperam vaga. A educação infantil é responsabilidade do município (art. 30 e art. 211 da Constituição).',
    options: [
      { id: 'construir', label: 'Construir novas creches públicas', pros: ['Solução duradoura (+2).'], cons: ['Leva anos e custa caro.'], approval: 2, growth: 0.02 },
      { id: 'conveniar', label: 'Comprar vagas em creches conveniadas', pros: ['Resultado rápido (+1).'], cons: ['Qualidade varia; custo contínuo.'], approval: 1 },
    ],
  },
  {
    id: 'encostas',
    offices: ['prefeito'],
    icon: '⛰️',
    group: 'Defesa Civil',
    title: 'Famílias vivem em área de risco de deslizamento',
    text: 'A Defesa Civil mapeou centenas de casas em encostas. O período de chuvas se aproxima.',
    options: [
      { id: 'remover', label: 'Remover as famílias com aluguel social e moradia definitiva', pros: ['Salva vidas.'], cons: ['Resistência de moradores e custo alto.'], approval: 1, growth: -0.01 },
      { id: 'obras', label: 'Fazer obras de contenção nas encostas', pros: ['As famílias ficam onde vivem.'], cons: ['Não elimina todo o risco.'], approval: 1 },
      { id: 'adiar', label: 'Adiar e só monitorar', pros: ['Sem custo agora.'], cons: ['Se houver tragédia, a responsabilidade será sua (−5).'], success: 0.6, approval: 0, failApproval: -5, okText: 'As chuvas passaram sem deslizamentos graves.', failText: 'Um deslizamento atingiu casas da área mapeada.' },
    ],
  },
  {
    id: 'terceirizacao',
    offices: ['prefeito', 'governador'],
    icon: '🏥',
    group: 'Gestão',
    title: 'Contratar médicos por concurso ou por organização social?',
    text: 'Faltam médicos nas unidades de saúde. Concurso leva tempo e cria despesa permanente; organizações sociais contratam rápido, mas exigem fiscalização.',
    options: [
      { id: 'concurso', label: 'Fazer concurso público', pros: ['Vínculo estável e carreira.'], cons: ['Demora e aumenta a folha.'], approval: 1 },
      { id: 'os', label: 'Contratar organização social', pros: ['Atendimento mais rápido (+1).'], cons: ['Há casos de desvio em contratos com OS.'], approval: 1, growth: 0.01 },
    ],
  },
  {
    id: 'iptu',
    offices: ['prefeito', 'vereador'],
    icon: '🏠',
    group: 'Impostos',
    title: 'Atualizar a planta de valores do IPTU',
    text: 'Os valores dos imóveis usados para calcular o IPTU estão defasados há anos. Bairros que se valorizaram pagam pouco; outros, proporcionalmente mais.',
    options: [
      { id: 'atualizar', label: 'Atualizar, com isenção para imóveis de baixo valor', pros: ['Mais justo e mais receita para a cidade.'], cons: ['Aumento de imposto é impopular (−2).'], approval: -2, growth: 0.02 },
      { id: 'manter', label: 'Manter os valores atuais', pros: ['Ninguém paga mais.'], cons: ['Distorções continuam e falta dinheiro para serviços.'] },
    ],
  },
  {
    id: 'contas-prefeito',
    offices: ['vereador'],
    icon: '📊',
    group: 'Fiscalização',
    title: 'Câmara vota as contas do prefeito',
    text: 'O Tribunal de Contas recomendou rejeitar as contas por gastos acima do limite. A Câmara só derruba o parecer com 2/3 dos vereadores (art. 31). Contas rejeitadas podem tornar o prefeito inelegível.',
    options: [
      { id: 'rejeitar', label: 'Votar pela rejeição, seguindo o parecer', pros: ['Fiscalizar é sua função (+2).'], cons: ['Se você é da base do prefeito, perde espaço no governo (−1 de capital).'], approval: 2, capital: -1 },
      { id: 'aprovar', label: 'Votar pela aprovação', pros: ['Mantém a boa relação com a prefeitura (+1 de capital).'], cons: ['A imprensa local cobra (−2).'], approval: -2, capital: 1 },
    ],
  },
  {
    id: 'subsidio-vereadores',
    offices: ['vereador'],
    icon: '💼',
    group: 'Câmara Municipal',
    title: 'Proposta de aumentar o salário dos próprios vereadores',
    text: 'O reajuste valeria só para a próxima legislatura, como manda a Constituição (art. 29, VI), e respeitaria o teto por tamanho da cidade.',
    options: [
      { id: 'contra', label: 'Votar contra', pros: ['O eleitor aprova (+2).'], cons: ['Colegas ficam contrariados (−1 de capital).'], approval: 2, capital: -1 },
      { id: 'favor', label: 'Votar a favor', pros: ['Colegas agradecem (+1 de capital).'], cons: ['Péssima repercussão (−3).'], approval: -3, capital: 1 },
    ],
  },
  {
    id: 'homenagem',
    offices: ['vereador'],
    icon: '🎖️',
    group: 'Câmara Municipal',
    title: 'Sessão para dar nome de rua e títulos de cidadão',
    text: 'Boa parte das leis municipais trata de homenagens. Um colega pede seu apoio para dar o nome de um aliado a uma praça.',
    options: [
      { id: 'apoiar', label: 'Apoiar em troca de apoio ao seu projeto', pros: ['+1 de capital político.'], cons: ['Gasta tempo da Câmara com pouco efeito prático.'], capital: 1 },
      { id: 'priorizar', label: 'Propor priorizar projetos de impacto', pros: ['Eleitores valorizam (+1).'], cons: ['Colegas se incomodam.'], approval: 1, capital: -1 },
    ],
  },
  {
    id: 'fiscalizar-ubs',
    offices: ['vereador'],
    icon: '🩺',
    group: 'Fiscalização',
    title: 'Denúncia de falta de remédios no posto de saúde',
    text: 'Moradores mandam vídeos de prateleiras vazias. Vereadores podem pedir informações oficiais à prefeitura e visitar as unidades.',
    options: [
      { id: 'requerimento', label: 'Enviar pedido de informações e visitar a unidade', pros: ['Fiscalização oficial com prazo de resposta (+2).'], cons: ['Atrito com a secretaria de saúde.'], approval: 2 },
      { id: 'redes', label: 'Gravar vídeo para as redes sociais', pros: ['Muita visibilidade (+1).'], cons: ['Sem efeito formal; pode ser visto como oportunismo.'], approval: 1 },
      { id: 'ignorar', label: 'Não se envolver', pros: ['Evita conflito com o prefeito aliado.'], cons: ['Moradores cobram (−2).'], approval: -2, capital: 1 },
    ],
  },
  {
    id: 'ambulantes',
    offices: ['prefeito', 'vereador'],
    icon: '🛍️',
    group: 'Ordem urbana',
    title: 'Comércio ambulante ocupa o centro da cidade',
    text: 'Lojistas reclamam de concorrência e calçadas tomadas; ambulantes dizem que é o único trabalho que encontram.',
    options: [
      { id: 'formalizar', label: 'Criar áreas cadastradas e formalizar os ambulantes', pros: ['Ordem com renda preservada (+1).'], cons: ['Exige fiscalização constante.'], approval: 1, growth: 0.01 },
      { id: 'retirar', label: 'Retirar com a fiscalização e a guarda municipal', pros: ['Calçadas livres; lojistas apoiam.'], cons: ['Conflitos e perda de renda de famílias (−1).'], approval: -1 },
    ],
  },
  {
    id: 'presidio',
    offices: ['governador'],
    icon: '🔒',
    group: 'Segurança pública',
    title: 'Presídio superlotado e controlado por facção',
    text: 'Uma rebelião expõe celas com o triplo da capacidade. Facções recrutam presos e comandam crimes de dentro.',
    options: [
      { id: 'vagas', label: 'Construir novas vagas e separar presos por perigo', pros: ['Reduz o domínio das facções (+1).'], cons: ['Caro e demorado.'], approval: 1, growth: -0.01 },
      { id: 'alternativas', label: 'Ampliar penas alternativas para crimes sem violência', pros: ['Desafoga o sistema rapidamente.'], cons: ['Parte do público vê como impunidade (−2).'], approval: -2 },
      { id: 'intervencao', label: 'Intervenção com tropas no presídio', pros: ['Resposta imediata (+2).'], cons: ['Não resolve a superlotação.'], approval: 2 },
    ],
  },
  {
    id: 'pedagio',
    offices: ['governador'],
    icon: '🛣️',
    group: 'Infraestrutura',
    title: 'Conceder rodovias estaduais à iniciativa privada?',
    text: 'As estradas estão esburacadas e o estado não tem dinheiro para reformá-las.',
    options: [
      { id: 'conceder', label: 'Conceder com pedágio e metas de obras', pros: ['Obras sem gastar do orçamento.'], cons: ['Usuários passam a pagar pedágio (−1).'], growth: 0.04, approval: -1 },
      { id: 'publico', label: 'Reformar com dinheiro público', pros: ['Sem pedágio (+1).'], cons: ['Tira recursos de outras áreas.'], approval: 1, growth: 0.01 },
    ],
  },
]

/** Pautas anuais de deputados e senadores. */
export const LEGISLATIVE_EVENTS: PressureEvent[] = [
  {
    id: 'emenda-bancada',
    offices: ['deputado-federal', 'senador'],
    icon: '🤝',
    group: 'Bancada do estado',
    title: 'A bancada do seu estado decide as emendas coletivas',
    text: 'Deputados e senadores do estado dividem as emendas de bancada, que são obrigatórias. Há duas propostas: uma ponte numa região agrícola ou a ampliação do hospital da capital.',
    options: [
      { id: 'ponte', label: 'Apoiar a ponte', pros: ['Escoa a produção e agrada o interior.'], cons: ['Eleitores da capital cobram.'], growth: 0.04 },
      { id: 'hospital', label: 'Apoiar o hospital', pros: ['Atende a maior parte da população (+2).'], cons: ['O interior reclama.'], approval: 2, growth: 0.01 },
      { id: 'dividir', label: 'Dividir o dinheiro entre as duas', pros: ['Agrada todos os colegas (+1 de capital).'], cons: ['As duas obras podem ficar pela metade.'], capital: 1, growth: 0.01 },
    ],
  },
  {
    id: 'sabatina',
    offices: ['senador'],
    icon: '🎙️',
    group: 'Senado',
    title: 'Sabatina de indicado pelo presidente',
    text: 'O Senado precisa aprovar indicados a ministro do STF, diretores do Banco Central e embaixadores (art. 52, III). O indicado é próximo do presidente.',
    options: [
      { id: 'aprovar', label: 'Votar pela aprovação', pros: ['Respeita a escolha do presidente.'], cons: ['Se o indicado decepcionar, você será cobrado(a).'], capital: 1 },
      { id: 'rejeitar', label: 'Votar contra', pros: ['Mostra independência do Senado (+1).'], cons: ['Atrito com o governo (−1 de capital).'], approval: 1, capital: -1 },
      { id: 'perguntas', label: 'Fazer perguntas duras e votar só depois', pros: ['Valoriza o papel de fiscalização (+1).'], cons: ['Nenhum.'], approval: 1 },
    ],
  },
  {
    id: 'frente-parlamentar',
    offices: ['deputado-federal', 'deputado-estadual', 'senador'],
    icon: '📣',
    group: 'Articulação',
    title: 'Convite para presidir uma frente parlamentar',
    text: 'Frentes reúnem parlamentares de vários partidos em torno de um tema, como saúde, empreendedorismo ou segurança, e ajudam a pautar projetos.',
    options: [
      { id: 'aceitar', label: 'Aceitar e organizar a agenda da frente', pros: ['Visibilidade e aliados de outros partidos (+2 de capital).'], cons: ['Exige tempo e negociação.'], capital: 2 },
      { id: 'recusar', label: 'Recusar e focar no seu estado', pros: ['Mais tempo para a base eleitoral (+1).'], cons: ['Menos influência em Brasília.'], approval: 1 },
    ],
  },
  {
    id: 'secretario',
    offices: ['deputado-federal', 'deputado-estadual'],
    icon: '🏛️',
    group: 'Carreira',
    title: 'Governador convida você para ser secretário de Estado',
    text: 'Parlamentares podem se licenciar para assumir secretarias; o suplente assume a vaga enquanto isso (art. 56).',
    options: [
      { id: 'aceitar', label: 'Aceitar o convite (sem perder o mandato)', pros: ['Experiência no Executivo e visibilidade (+1 de capital).'], cons: ['Seu partido perde um voto no plenário enquanto isso.'], capital: 1, approval: 1 },
      { id: 'recusar', label: 'Recusar e seguir no Legislativo', pros: ['Mantém a independência.'], cons: ['O governador pode preferir outros aliados.'] },
    ],
  },
]

export const STF_EVENTS = [...STF_LANDMARKS, ...STF_ROUTINE]

/**
 * Pautas do ano para o cargo: o STF recebe um grande caso (enquanto houver) e
 * três processos de rotina; prefeito, vereador e governador recebem pautas
 * locais que não se repetem em menos de 2 anos.
 */
export function drawLocalEvents(office: Office, rng: () => number, seen: { id: string; year: number }[], t: number): PressureEvent[] {
  const shuffle = <T>(xs: T[]) =>
    xs
      .map((x) => ({ x, k: rng() }))
      .sort((a, b) => a.k - b.k)
      .map((v) => v.x)
  if (office === 'ministro-stf') {
    const landmark = shuffle(STF_LANDMARKS.filter((e) => !seen.some((s) => s.id === e.id)))[0]
    const routine = shuffle(STF_ROUTINE.filter((e) => !seen.some((s) => s.id === e.id && t - s.year < 2))).slice(0, landmark ? 3 : 4)
    return [...(landmark ? [landmark] : []), ...routine]
  }
  const count = office === 'prefeito' ? 3 : office === 'vereador' ? 2 : office === 'governador' ? 1 : 0
  const pool = [...LOCAL_EVENTS, ...LEGISLATIVE_EVENTS].filter((e) => e.offices.includes(office) && !seen.some((s) => s.id === e.id && t - s.year < 2))
  const legislative = office === 'deputado-federal' || office === 'deputado-estadual' || office === 'senador' ? 1 : 0
  return shuffle(pool).slice(0, count + legislative)
}
