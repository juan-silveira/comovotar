// Perguntas "Pode ou não pode?" sobre competências e regras constitucionais.

export interface Quiz {
  id: string
  /** Ano em que a pergunta aparece */
  year: number
  question: string
  options: { id: string; label: string }[]
  correct: string
  explanation: string
  ref: string
}

export const QUIZ_POINTS = 20

export const QUIZZES: Quiz[] = [
  {
    id: 'q-exportacao',
    year: 2,
    question: 'Um prefeito pode criar um imposto sobre os produtos que o município exporta?',
    options: [
      { id: 'sim-camara', label: 'Sim, se a Câmara Municipal aprovar' },
      { id: 'nao-uniao', label: 'Não: imposto sobre exportação é da União' },
      { id: 'sim-decreto', label: 'Sim, por decreto' },
    ],
    correct: 'nao-uniao',
    explanation: 'O imposto de exportação é de competência da União (art. 153, II). Municípios cobram IPTU, ISS e ITBI (art. 156).',
    ref: 'art30',
  },
  {
    id: 'q-mp',
    year: 7,
    question: 'Quem pode editar uma medida provisória, com força de lei imediata?',
    options: [
      { id: 'presidente', label: 'O presidente da República, em caso de relevância e urgência' },
      { id: 'camara', label: 'O presidente da Câmara' },
      { id: 'stf', label: 'Qualquer ministro do STF' },
    ],
    correct: 'presidente',
    explanation: 'A MP é ato do presidente (art. 62), vale por até 120 dias e precisa ser convertida em lei pelo Congresso.',
    ref: 'art62',
  },
  {
    id: 'q-stf-indicacao',
    year: 8,
    question: 'Quem aprova a indicação de um novo ministro do STF?',
    options: [
      { id: 'senado', label: 'O Senado, por maioria absoluta, após sabatina' },
      { id: 'camara', label: 'A Câmara dos Deputados' },
      { id: 'stf', label: 'Os próprios ministros do STF' },
    ],
    correct: 'senado',
    explanation: 'O presidente indica e o Senado aprova por maioria absoluta (art. 101, parágrafo único, e art. 52, III).',
    ref: 'art101',
  },
  {
    id: 'q-seguranca',
    year: 9,
    question: 'A Polícia Militar é responsabilidade principal de quem?',
    options: [
      { id: 'estado', label: 'Do governo estadual' },
      { id: 'municipio', label: 'Da prefeitura' },
      { id: 'uniao', label: 'Do governo federal' },
    ],
    correct: 'estado',
    explanation: 'Polícias Militar e Civil e Corpo de Bombeiros são estaduais e subordinadas ao governador (art. 144, § 6º).',
    ref: 'art23',
  },
  {
    id: 'q-veto',
    year: 12,
    question: 'O Congresso pode derrubar um veto do presidente?',
    options: [
      { id: 'sim', label: 'Sim, pela maioria absoluta de deputados e de senadores' },
      { id: 'nao', label: 'Não, o veto é definitivo' },
      { id: 'stf', label: 'Só o STF pode derrubar vetos' },
    ],
    correct: 'sim',
    explanation: 'O veto é apreciado em sessão conjunta e cai com a maioria absoluta das duas casas (art. 66, § 4º).',
    ref: 'art66',
  },
  {
    id: 'q-adi',
    year: 13,
    question: 'O STF pode anular uma lei por conta própria, sem ninguém pedir?',
    options: [
      { id: 'nao', label: 'Não: precisa ser provocado por quem a Constituição autoriza' },
      { id: 'sim', label: 'Sim, sempre que achar necessário' },
      { id: 'presidente', label: 'Só se o presidente concordar' },
    ],
    correct: 'nao',
    explanation:
      'O Judiciário só age quando provocado. Podem propor ADI o presidente, as Mesas, governadores, o procurador-geral, a OAB, partidos e confederações (art. 103).',
    ref: 'art103',
  },
  {
    id: 'q-vereador-penal',
    year: 17,
    question: 'Vereadores podem aprovar uma lei que cria um novo crime no município?',
    options: [
      { id: 'nao', label: 'Não: direito penal é competência privativa da União' },
      { id: 'sim', label: 'Sim, se o crime for local' },
      { id: 'prefeito', label: 'Sim, se o prefeito sancionar' },
    ],
    correct: 'nao',
    explanation: 'Só a União legisla sobre direito penal (art. 22, I). Municípios podem prever multas administrativas em temas de interesse local.',
    ref: 'art22',
  },
  {
    id: 'q-selic',
    year: 19,
    question: 'Quem define a taxa básica de juros (Selic)?',
    options: [
      { id: 'copom', label: 'O Copom, do Banco Central' },
      { id: 'fazenda', label: 'O ministro da Fazenda' },
      { id: 'congresso', label: 'O Congresso, por lei' },
    ],
    correct: 'copom',
    explanation: 'Com a autonomia do Banco Central (LC 179/2021), a Selic é definida pelo Comitê de Política Monetária.',
    ref: 'lc179',
  },
  {
    id: 'q-pec-quorum',
    year: 21,
    question: 'Quantos votos são necessários para aprovar uma emenda constitucional na Câmara (513 deputados)?',
    options: [
      { id: '257', label: '257, em um turno' },
      { id: '308', label: '308, em dois turnos' },
      { id: '342', label: '342, em um turno' },
    ],
    correct: '308',
    explanation: 'PEC exige 3/5 dos membros em dois turnos em cada casa: 308 deputados e 49 senadores (art. 60, § 2º).',
    ref: 'art60',
  },
  {
    id: 'q-reeleicao',
    year: 23,
    question: 'Um governador pode concorrer a um terceiro mandato consecutivo?',
    options: [
      { id: 'nao', label: 'Não: só uma reeleição consecutiva' },
      { id: 'sim', label: 'Sim, sem limite' },
      { id: 'assembleia', label: 'Sim, se a Assembleia autorizar' },
    ],
    correct: 'nao',
    explanation: 'Presidente, governadores e prefeitos podem ser reeleitos uma única vez para o período seguinte (art. 14, § 5º).',
    ref: 'art14',
  },
  {
    id: 'q-clausula',
    year: 25,
    question: 'Uma PEC pode acabar com o voto secreto nas eleições?',
    options: [
      { id: 'nao', label: 'Não: o voto direto, secreto, universal e periódico é cláusula pétrea' },
      { id: 'sim', label: 'Sim, com 3/5 dos votos' },
      { id: 'plebiscito', label: 'Sim, com plebiscito' },
    ],
    correct: 'nao',
    explanation: 'Propostas tendentes a abolir cláusulas pétreas não podem nem ser deliberadas (art. 60, § 4º).',
    ref: 'art60p4',
  },
  {
    id: 'q-icms',
    year: 27,
    question: 'Um estado pode reduzir o ICMS sozinho para atrair uma fábrica?',
    options: [
      { id: 'confaz', label: 'Não: precisa de convênio com os demais estados (CONFAZ)' },
      { id: 'sim', label: 'Sim, basta uma lei estadual' },
      { id: 'decreto', label: 'Sim, por decreto do governador' },
    ],
    correct: 'confaz',
    explanation: 'Benefícios de ICMS dependem de deliberação conjunta dos estados (art. 155, § 2º, XII, g; LC 24/1975).',
    ref: 'art155',
  },
]
