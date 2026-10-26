import { useMemo, useState } from 'react'
import { LegalRefChip } from '../components/game/LegalRef'
import { Card, Segmented } from '../components/ui'
import { CONSTITUTION } from '../model/constitution'
import { GLOSSARY } from '../model/glossary'
import { OFFICE_ORDER, ROLES } from '../model/roles'

interface Power {
  name: string
  theory: string
  practice: { topic: string; text: string; views?: [string, string]; refs: string[] }[]
}

const POWERS: Power[] = [
  {
    name: 'Legislativo',
    theory:
      'Faz as leis, aprova o orçamento e fiscaliza o Executivo. No plano federal é bicameral: a Câmara representa a população e o Senado, os estados. Nos estados (Assembleias) e municípios (Câmaras Municipais) é unicameral.',
    practice: [
      {
        topic: 'Controle da pauta',
        text: 'Os presidentes da Câmara e do Senado decidem o que vai a votação. Na prática, a maior parte dos projetos nunca chega ao plenário, e esse poder de agenda é moeda de negociação com o Executivo.',
        refs: ['art64'],
      },
      {
        topic: 'Emendas parlamentares',
        text: 'Emendas individuais e de bancada passaram a ter execução obrigatória (2015 e 2019) e cresceram como parte do orçamento. As “emendas de relator”, sem identificação clara de autor e destino, foram declaradas inconstitucionais pelo STF em 2022.',
        views: [
          'Defensores: aproximam o orçamento das necessidades locais que o Executivo federal não enxerga.',
          'Críticos: pulverizam recursos, dificultam o planejamento e podem ser usadas para trocar votos por verbas.',
        ],
        refs: ['art165'],
      },
      {
        topic: 'Jabutis',
        text: 'Emendas sem relação com o tema principal, comuns na conversão de medidas provisórias. O STF considerou a prática incompatível com a Constituição na ADI 5127 (2015).',
        refs: ['adi5127', 'art62'],
      },
    ],
  },
  {
    name: 'Executivo',
    theory:
      'Administra o Estado e executa as leis e o orçamento. É chefiado pelo presidente (União), governadores (estados) e prefeitos (municípios), eleitos por voto direto, com uma reeleição consecutiva.',
    practice: [
      {
        topic: 'Presidencialismo de coalizão',
        text: 'Como nenhum partido tem maioria sozinho, presidentes distribuem ministérios e cargos a partidos aliados para aprovar projetos. Ministérios técnicos tendem a ser mais eficientes; ministérios políticos garantem mais votos.',
        views: [
          'Defensores: é a forma de governar num Congresso fragmentado, com partidos representando parte do eleitorado.',
          'Críticos: troca de apoio por cargos e verbas reduz a qualidade da gestão e favorece o fisiologismo.',
        ],
        refs: ['art84'],
      },
      {
        topic: 'Medidas provisórias',
        text: 'Instrumento de urgência que já foi usado como forma habitual de legislar. Desde a EC 32/2001 elas têm prazo e trancam a pauta, o que obriga o Congresso a decidir.',
        refs: ['art62'],
      },
      {
        topic: 'Indicações ao STF',
        text: 'O presidente indica ministros do STF e o Senado aprova. Indicações costumam refletir afinidade com o governo; o Senado raramente rejeita (as últimas vezes foram em 1894), mas já atrasou sabatinas por meses.',
        views: [
          'Defensores: a Constituição dá ao presidente eleito a prerrogativa da escolha, controlada pelo Senado.',
          'Críticos: escolhas por afinidade podem fazer a jurisprudência oscilar conforme a composição do tribunal.',
        ],
        refs: ['art101', 'art52'],
      },
    ],
  },
  {
    name: 'Judiciário',
    theory:
      'Aplica a lei aos casos concretos e, no caso do STF, guarda a Constituição. Só age quando provocado e decide de forma fundamentada. Ministros do STF têm mandato vitalício até os 75 anos.',
    practice: [
      {
        topic: 'Decisões monocráticas',
        text: 'Relatores podem conceder liminares individuais de grande impacto, inclusive suspendendo leis. Desde 2022, o regimento do STF exige que essas decisões sejam levadas logo ao plenário.',
        views: [
          'Defensores: decisões rápidas evitam danos irreversíveis enquanto o plenário não se reúne.',
          'Críticos: um único ministro não deveria suspender decisões tomadas pelos representantes eleitos.',
        ],
        refs: ['art97'],
      },
      {
        topic: 'Omissão legislativa e “ativismo”',
        text: 'Quando o Congresso não regula um direito previsto na Constituição, o STF pode fixar regras provisórias (ação por omissão), como na equiparação da homofobia ao racismo (2019). No marco temporal, o STF decidiu em 2023 e o Congresso reagiu aprovando lei própria.',
        views: [
          'Defensores: a Constituição manda proteger direitos mesmo quando falta lei; o tribunal apenas cumpre esse dever.',
          'Críticos: ao fixar regras, o tribunal invade a função do Legislativo e decide temas que caberiam ao voto.',
        ],
        refs: ['art102'],
      },
      {
        topic: 'Mudanças de entendimento',
        text: 'A execução da pena após a segunda instância foi permitida em 2016 e revista em 2019, com composição e votos diferentes. Revisões são normais no direito, mas, quando frequentes, reduzem a previsibilidade.',
        refs: ['art102'],
      },
    ],
  },
]

const LAW_PATH = [
  { step: 'Iniciativa', text: 'Parlamentar, comissão, presidente, tribunais, procurador-geral ou cidadãos (1% do eleitorado).', ref: 'art61' },
  { step: 'Admissibilidade', text: 'A CCJ verifica constitucionalidade: tipo de norma, iniciativa, competência e cláusulas pétreas.', ref: 'art60p4' },
  { step: 'Comissões', text: 'O relator analisa o mérito e pode apresentar um substitutivo, mudando o texto.', ref: 'art58' },
  { step: 'Pauta e plenário', text: 'O presidente da casa decide quando votar. Quóruns: maioria simples, absoluta (lei complementar) ou 3/5 em dois turnos (PEC).', ref: 'art47' },
  { step: 'Casa revisora', text: 'A outra casa aprova (segue à sanção), emenda (volta à iniciadora) ou rejeita (arquiva).', ref: 'art65' },
  { step: 'Sanção ou veto', text: '15 dias úteis para sancionar ou vetar, total ou parcialmente. PEC não passa por sanção.', ref: 'art66' },
  { step: 'Veto', text: 'O Congresso pode derrubar o veto com a maioria absoluta de deputados e de senadores.', ref: 'art66' },
  { step: 'Controle', text: 'Legitimados podem questionar a lei no STF, que precisa de 6 votos para declará-la inconstitucional.', ref: 'art103' },
]

export function Institutions() {
  const [level, setLevel] = useState<'federal' | 'estadual' | 'municipal'>('federal')
  const [q, setQ] = useState('')
  const glossary = useMemo(() => {
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
    const term = norm(q)
    return Object.values(CONSTITUTION).filter((r) => !term || norm(`${r.ref} ${r.title} ${r.summary}`).includes(term))
  }, [q])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Como funcionam as instituições</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">
          O que cada poder e cada cargo deve fazer pela Constituição, como isso tem funcionado na prática e quais são os
          principais argumentos em debate. Os textos resumem os dispositivos legais; clique nas referências para ler o
          resumo de cada artigo.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {POWERS.map((p) => (
          <Card key={p.name} title={`Poder ${p.name}`}>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Na teoria</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{p.theory}</p>
            <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">Na prática</h3>
            <div className="mt-1 space-y-3">
              {p.practice.map((x) => (
                <div key={x.topic}>
                  <div className="text-sm font-semibold text-ink">{x.topic}</div>
                  <p className="text-sm leading-relaxed text-ink-2">{x.text}</p>
                  {x.views && (
                    <ul className="mt-1 space-y-1 text-xs text-ink-2">
                      {x.views.map((v) => (
                        <li key={v} className="rounded bg-surface-2 px-2 py-1">
                          {v}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {x.refs.map((r) => (
                      <LegalRefChip key={r} id={r} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Forças Armadas: o que podem e o que não podem" subtitle="Instituições de Estado, não de governo">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-good">Podem</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>Defender o país contra ameaças externas e proteger fronteiras, inclusive na Amazônia.</li>
              <li>Atuar na garantia da lei e da ordem (GLO), por ordem do presidente, de forma excepcional, temporária e em área delimitada.</li>
              <li>Apoiar a Defesa Civil em desastres, como enchentes e secas.</li>
              <li>Participar de missões de paz da ONU, com autorização do Congresso.</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-bad">Não podem</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              <li>Agir como “poder moderador” entre os Poderes: o STF decidiu em 2024 que o art. 142 não autoriza intervenção militar.</li>
              <li>Substituir as polícias de forma permanente: segurança pública é responsabilidade dos estados.</li>
              <li>Ter atuação político-partidária: militares da ativa não podem se filiar a partidos.</li>
              <li>Agir sem comando civil: estão sob a autoridade suprema do presidente da República.</li>
            </ul>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <LegalRefChip id="art142" />
          <LegalRefChip id="art49" />
        </div>
      </Card>

      <Card title="O caminho de uma lei federal">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LAW_PATH.map((s, i) => (
            <li key={s.step} className="rounded-lg border border-line p-3">
              <div className="text-xs text-muted">Etapa {i + 1}</div>
              <div className="text-sm font-semibold text-ink">{s.step}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-1">
                <LegalRefChip id={s.ref} />
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">
          Nos estados e municípios o caminho é parecido, sem casa revisora: Assembleia ou Câmara Municipal votam, e o
          governador ou prefeito sanciona ou veta.
        </p>
      </Card>

      <Card
        title="Cargos: o que pode e o que não pode"
        actions={
          <Segmented
            label="Nível"
            value={level}
            onChange={setLevel}
            options={[
              { value: 'federal', label: 'Federal' },
              { value: 'estadual', label: 'Estadual' },
              { value: 'municipal', label: 'Municipal' },
            ]}
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {OFFICE_ORDER.filter((o) => ROLES[o].level === level).map((o) => {
            const r = ROLES[o]
            return (
              <div key={o} className="rounded-lg border border-line p-3">
                <div className="text-sm font-semibold text-ink">{r.title}</div>
                <div className="text-xs text-muted">
                  {r.power} · {r.body} · {r.termYears ? `${r.termYears} anos` : 'vitalício até 75 anos'}
                </div>
                <h4 className="mt-2 text-xs font-semibold text-good">Pode</h4>
                <ul className="list-disc pl-4 text-xs leading-relaxed text-ink-2">
                  {r.can.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <h4 className="mt-2 text-xs font-semibold text-bad">Não pode</h4>
                <ul className="list-disc pl-4 text-xs leading-relaxed text-ink-2">
                  {r.cannot.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <h4 className="mt-2 text-xs font-semibold text-ink">Na prática</h4>
                <ul className="list-disc pl-4 text-xs leading-relaxed text-ink-2">
                  {r.practice.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.refs.map((x) => (
                    <LegalRefChip key={x} id={x} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Glossário de termos" subtitle="Explicações simples para quem está começando">
        <dl className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.values(GLOSSARY).map((g) => (
            <div key={g.id} className="rounded-lg border border-line p-3">
              <dt className="text-sm font-semibold text-ink">{g.term}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink-2">
                {g.short}
                {g.example && <span className="mt-1 block text-muted">Ex.: {g.example}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Glossário constitucional" subtitle="Resumos dos dispositivos usados no jogo">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar (ex.: veto, ICMS, STF, emenda)"
          aria-label="Buscar no glossário"
          className="mb-3 block min-h-10 w-full rounded-md border border-line bg-surface px-3"
        />
        <dl className="grid gap-3 md:grid-cols-2">
          {glossary.map((r) => (
            <div key={r.id} className="rounded-lg border border-line p-3">
              <dt className="text-sm font-semibold text-ink">
                {r.title} <span className="text-xs font-normal text-muted">· {r.ref}</span>
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink-2">{r.summary}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
