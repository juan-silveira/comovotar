import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

interface Plan {
  title: string
  time: string
  goal: string
  steps: string[]
  questions: string[]
  bncc: string
}

const PLANS: Plan[] = [
  {
    title: '1. Quem pode o quê: os três Poderes na prática',
    time: '2 aulas de 50 minutos',
    goal: 'Diferenciar as funções de vereador, prefeito, deputado, governador, senador, presidente e ministro do STF, e o que cada um não pode fazer.',
    steps: [
      'Divida a turma em grupos; cada grupo escolhe um cargo diferente numa turma criada com cargo livre.',
      'Cada grupo joga 4 anos e anota as decisões que o cargo permitiu e as que ficaram com outros Poderes.',
      'Os grupos apresentam: o que esperavam poder fazer e o que descobriram.',
      'Fechamento com a página “Como funciona o Brasil” (teoria × prática).',
    ],
    questions: [
      'Por que um vereador não pode construir um hospital?',
      'Em que casos o STF pode anular uma lei aprovada pelo Congresso?',
      'O que muda quando o governo tem ou não maioria no Legislativo?',
    ],
    bncc: 'Ensino Médio, Ciências Humanas e Sociais Aplicadas, competência específica 6 (habilidades EM13CHS601 a EM13CHS606).',
  },
  {
    title: '2. Como uma lei nasce (e como morre)',
    time: '1 aula de 50 minutos',
    goal: 'Compreender a tramitação: comissões, relator, plenário, casa revisora, sanção, veto e controle de constitucionalidade.',
    steps: [
      'Em duplas, como deputado federal, cada dupla propõe um projeto do catálogo.',
      'Acompanhem cada etapa no painel do projeto e no plenário em semicírculo.',
      'Registrem onde o projeto mudou (jabutis, emendas) ou parou, e por quê.',
      'Comparem com um projeto real em tramitação no site da Câmara dos Deputados.',
    ],
    questions: [
      'Por que um partido vota contra uma proposta com a qual concorda?',
      'O que é um jabuti e por que o STF o considerou incompatível com a Constituição?',
    ],
    bncc: 'Ensino Médio, Ciências Humanas e Sociais Aplicadas, competência específica 6.',
  },
  {
    title: '3. Promessa possível ou impossível?',
    time: '1 aula de 50 minutos',
    goal: 'Usar porcentagens e ordens de grandeza para avaliar promessas de campanha com o orçamento real.',
    steps: [
      'Na página “Dinheiro público”, aba Promessas, cada grupo testa uma promessa (Bolsa Família de R$ 10.000, salário mínimo de R$ 5.000…).',
      'Calculem o custo em % do orçamento livre e da receita.',
      'Cada grupo reescreve a promessa para torná-la viável e mostra como pagaria.',
    ],
    questions: ['Por que só cerca de 8% do orçamento federal é livre?', 'Quais são as formas de pagar uma promessa cara, e quem paga a conta em cada uma?'],
    bncc: 'Matemática (EM13MAT104: interpretar taxas e índices socioeconômicos) e Ciências Humanas, competência específica 6.',
  },
  {
    title: '4. Ética pública: corrupção, investigação e Ficha Limpa',
    time: '1 aula de 50 minutos',
    goal: 'Discutir dilemas éticos e as consequências institucionais da corrupção.',
    steps: [
      'Joguem até surgir uma proposta ilícita; cada aluno decide sozinho e anota por quê.',
      'Compare na turma quem aceitou, recusou ou denunciou, sem expor nomes.',
      'Leiam juntos o resumo da Lei da Ficha Limpa e da Lei de Improbidade nas referências do jogo.',
    ],
    questions: ['Por que a investigação demora anos?', 'O que a delação premiada troca, e quais são as críticas a ela?'],
    bncc: 'Ensino Médio, Ciências Humanas e Sociais Aplicadas, competências específicas 5 e 6.',
  },
  {
    title: '5. Debate regrado de uma pauta',
    time: '2 aulas de 50 minutos',
    goal: 'Argumentar com base na lei vigente e em dados, respeitando posições diferentes.',
    steps: [
      'Crie uma turma com uma pauta para debate (econômica ou moral).',
      'Metade da turma prepara os argumentos de um lado; a outra, os do outro lado, usando a página “Pautas em debate”.',
      'Debate em rodadas cronometradas; depois, cada aluno vota individualmente no código da turma.',
      'Discuta a diferença entre o lado que defendeu e o voto pessoal.',
    ],
    questions: ['Quais argumentos se apoiam em dados e quais em valores?', 'Quem decide sobre o tema: Congresso, STF ou ambos?'],
    bncc: 'Ensino Médio, Ciências Humanas e Sociais Aplicadas, competência específica 6; Linguagens (argumentação).',
  },
]

export function LessonPlans() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Roteiros de aula</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Sugestões para usar o jogo em sala. Crie uma <Link to="/turmas" className="font-semibold text-ink underline">turma</Link> para
          que todos joguem o mesmo cenário e você acompanhe o placar e a votação do debate. O jogo é neutro: não há
          resposta certa em temas de valores.
        </p>
      </div>
      {PLANS.map((p) => (
        <Card key={p.title} title={p.title} subtitle={p.time}>
          <p className="text-sm text-ink-2">
            <strong className="text-ink">Objetivo: </strong>
            {p.goal}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-2">
            {p.steps.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <div className="mt-2 text-sm font-semibold text-ink">Perguntas para discussão</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {p.questions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">BNCC: {p.bncc}</p>
        </Card>
      ))}
    </div>
  )
}
