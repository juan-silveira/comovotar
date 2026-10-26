import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ComponentsChart, TimeSeriesChart } from '../components/charts'
import { BillComposer } from '../components/game/BillComposer'
import { votePrice } from '../model/lawmaking'
import { BillView } from '../components/game/BillView'
import { BlockPanel } from '../components/game/BlockPanel'
import { CareerFinal } from '../components/game/CareerFinal'
import { Drawer } from '../components/game/Drawer'
import { EventModal } from '../components/game/EventModal'
import { GameMap } from '../components/game/GameMap'
import { HowToPlay, howToSeen } from '../components/game/HowToPlay'
import { IndicatorList } from '../components/game/IndicatorList'
import { buildIndicators, type Indicator } from '../components/game/indicators'
import { findPromise, type PromiseRecord } from '../model/promises'
import { AchievementsPanel, AchievementToasts } from '../components/game/Achievements'
import { WealthPanel } from '../components/game/WealthPanel'
import { NewsFeed } from '../components/game/NewsFeed'
import { ComponentsTable, WhyPanel } from '../components/panels'
import { Button, Card, Term } from '../components/ui'
import { fmtBRLFull, fmtNum, lowerFirst } from '../lib/format'
import { useThemeColors } from '../lib/theme'
import { billsFor } from '../model/bills'
import { legislativeContext, municipalSeries, separatedAt, type CareerState } from '../model/career'
import type { ProposalContext } from '../lib/proposalAi'
import { findParty, SPECTRUM_LABELS } from '../model/legislature'
import type { SimInput, YearResult } from '../model/simulation'
import { blockLabel } from '../model/partition'
import { electionType, ELECTION_LABELS } from '../model/politics'
import { ROLES } from '../model/roles'
import { HORIZON } from '../model/simulation'
import { useGame } from '../state/game'

type Tab = 'pais' | 'agenda' | 'leis' | 'carreira'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'pais', icon: '🗺', label: 'País' },
  { id: 'agenda', icon: '🗂', label: 'Agenda' },
  { id: 'leis', icon: '📜', label: 'Leis' },
  { id: 'carreira', icon: '🎯', label: 'Você' },
]

export function GameScreen() {
  const navigate = useNavigate()
  const { career, mission, input, results, items, dispatch } = useGame()
  const [composing, setComposing] = useState<string | null>(null)
  const [modal, setModal] = useState(true)
  const [tab, setTab] = useState<Tab>('pais')
  const [howto, setHowto] = useState(() => !howToSeen())
  const [charts, setCharts] = useState(false)
  const t = career?.t ?? 0

  // Reabre as cartas a cada novo ano.
  useEffect(() => setModal(true), [t])

  const nodes = useMemo(() => (career && input ? buildIndicators(career, input, results) : []), [career, input, results])

  if (!career || !mission || !input) {
    return (
      <Card title="Nenhuma partida em andamento">
        <p className="mb-3 text-sm text-ink-2">Escolha um cargo e um território para começar.</p>
        <Button variant="primary" onClick={() => navigate('/jogar')}>
          Nova partida
        </Button>
      </Card>
    )
  }

  const r = results[t]
  const office = career.office
  const role = office ? ROLES[office] : null
  const partition = input.params.partition
  const separated = separatedAt(input, t)
  const nextYear = 2023 + t + 1
  const nextElection = electionType(nextYear)
  const done = t >= HORIZON
  const canPropose =
    !!office && office !== 'ministro-stf' && !career.proposedThisYear && !career.activeBill && !done && !career.needsCareerChoice

  const actions = (n: Indicator) => {
    if (!canPropose || !n.areas || !role) return null
    const bills = billsFor(role.level).filter((b) => n.areas!.includes(b.area))
    if (bills.length === 0) return null
    return (
      <div>
        <strong className="text-ink">O que você pode fazer:</strong>
        <div className="mt-1 flex flex-wrap gap-1">
          {bills.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setComposing(b.id)}
              className="min-h-9 rounded-full border border-line bg-surface px-3 text-[11px] text-ink hover:bg-surface-2"
            >
              Propor: {b.title}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const advance = () => {
    if (items.length > 0) setModal(true)
    else dispatch({ type: 'advance' })
  }

  const map = (height?: string) => (
    <GameMap results={results} t={t} partition={partition} baseline={input.baseline} highlight={career.setup.uf} separated={separated} mapHeight={height} />
  )

  const panel: Record<Tab, ReactNode> = {
    pais: (
      <div className="space-y-3">
        <p className="text-xs text-ink-2">
          Toque num indicador para entender o que é, o que ele afeta e o que você pode fazer.{' '}
          <button type="button" onClick={() => setCharts(true)} className="underline">
            Ver gráficos e regiões
          </button>
        </p>
        <IndicatorList nodes={nodes} actions={actions} />
      </div>
    ),
    agenda: (
      <div className="space-y-4">
      <AgendaSummary
        count={items.length}
        nextYear={nextYear}
        done={done}
        onOpen={() => setModal(true)}
        canPropose={canPropose}
        onPropose={() => setComposing('')}
        isJudge={office === 'ministro-stf'}
      />
        <NewsFeed r={r} log={career.log} />
      </div>
    ),
    leis: (
      <div className="space-y-3">
        <Button variant="primary" disabled={!canPropose} onClick={() => setComposing('')} className="w-full">
          ✍ Propor um projeto de lei
        </Button>
        {!canPropose && office !== 'ministro-stf' && (
          <p className="text-xs text-muted">Você pode propor um projeto por ano, se não houver outro em tramitação.</p>
        )}
        {career.activeBill && (
          <Card>
            <BillView bill={career.activeBill.state} />
          </Card>
        )}
        {career.bills.length === 0 && !career.activeBill ? (
          <p className="text-sm text-ink-2">
            {office === 'ministro-stf' ? 'Ministros do STF não propõem leis: o tribunal só age quando provocado.' : 'Nenhum projeto ainda.'}
          </p>
        ) : (
          [...career.bills].reverse().map((b, i) => (
            <Card key={i}>
              <div className="mb-2 text-xs text-muted">
                {2023 + b.year} · {b.authorIsPlayer ? 'Sua proposta' : 'Proposta de outro autor'}
              </div>
              <BillView bill={b.state} compact={i > 0} />
            </Card>
          ))
        )}
      </div>
    ),
    carreira: (
      <div className="space-y-3">
        <div className="tnum grid grid-cols-2 gap-2">
          <Mini label="Popularidade" value={`${Math.round(career.approval)}%`} term="aprovacao" />
          <Mini label="Capital político" value={String(career.capital)} term="capital-politico" />
          {office && ['vereador', 'deputado-estadual', 'deputado-federal', 'senador'].includes(office) && (
            <Mini label="Relação com o partido" value={`${Math.round(career.partyLoyalty)}/100`} term="fidelidade" />
          )}
          <Mini label="Leis aprovadas" value={String(career.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei').length)} />
        </div>
        <AchievementsPanel ctx={{ career, input, results }} />
        <WealthPanel career={career} mediaInfluence={input.params.mediaInfluence} />
        {career.promises.length > 0 && (
          <div className="rounded-xl border border-line bg-surface p-3">
            <h3 className="text-sm font-semibold text-ink">📣 Suas promessas</h3>
            <ul className="mt-2 space-y-2">
              {[...career.promises].reverse().map((p) => {
                const def = findPromise(p.id)
                const badge = PROMISE_STATUS[p.status]
                return (
                  <li key={`${p.id}-${p.year}`} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-ink">{def?.label ?? p.id}</div>
                      <div className="text-ink-2">
                        {ROLES[p.office].title} · cobrança em {2023 + p.dueYear}
                        {p.status === 'pendente' && def && def.feasibility !== 'impossivel' ? ` · ${def.how}` : ''}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${badge.cls}`}>{badge.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {role && (
          <details className="rounded-xl border border-line bg-surface p-3 text-xs text-ink-2">
            <summary className="cursor-pointer text-sm font-semibold text-ink">O que você pode e não pode fazer</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {role.can.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-bad">
              {role.cannot.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="mt-2">{role.reelection}</p>
          </details>
        )}
        <ol className="space-y-2">
          {[...career.log].reverse().map((l, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="tnum w-12 shrink-0 text-muted">{2023 + l.year}</span>
              <div>
                <div className={`font-semibold ${l.good === false ? 'text-bad' : 'text-ink'}`}>{l.title}</div>
                <div className="text-xs text-ink-2">{l.text}</div>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3 pt-2 text-sm text-ink-2">
          <Link to="/instituicoes" className="underline">
            Como funcionam as instituições
          </Link>
          <Link to="/economia" className="underline">
            Economia na prática
          </Link>
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (confirm('Encerrar esta partida? O progresso será perdido.')) {
                dispatch({ type: 'quit' })
                navigate('/jogar')
              }
            }}
          >
            Encerrar partida
          </button>
        </div>
      </div>
    ),
  }


  return (
    <div className="pb-28 lg:pb-24">
      <AchievementToasts ctx={{ career, input, results }} />
      {/* Barra de status */}
      <div className="mb-3 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-sm sm:px-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold tracking-widest text-muted uppercase">
              {role ? role.title : 'Sem mandato'} · {career.setup.municipio ? `${career.setup.municipio.name}, ` : ''}
              {career.setup.uf}
            </div>
            <div className="tnum flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
              <span className="text-xl font-bold text-ink">{r.year}</span>
              <span className="text-xs text-ink-2">
                <Term id="aprovacao">{office && ROLES[office].power === 'Executivo' ? 'Aprovação' : 'Popularidade'}</Term>{' '}
                <strong className="text-ink">{Math.round(career.approval)}%</strong>
              </span>
              <span className="text-xs text-ink-2">
                <Term id="capital-politico">Capital</Term> <strong className="text-ink">🪙 {career.capital}</strong>
              </span>
              <span className="text-xs text-ink-2">
                Eleição <strong className="text-ink">{career.nextElection !== null ? 2023 + career.nextElection : '—'}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHowto(true)}
            className="min-h-10 shrink-0 rounded-full border border-line px-3 text-xs font-semibold text-ink"
            aria-label="Como jogar"
          >
            ? <span className="hidden sm:inline">Como jogar</span>
          </button>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={HORIZON} aria-valuenow={t} aria-label={`Ano ${t} de ${HORIZON}`}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${(t / HORIZON) * 100}%` }} />
        </div>
        {nextElection && !done && (
          <p className="mt-1.5 text-[11px] text-ink-2">
            🗳 {nextYear}: {ELECTION_LABELS[nextElection]}.
          </p>
        )}
      </div>

      {done && (
        <div className="mb-3">
          <CareerFinal />
        </div>
      )}

      {/* Computador: mapa à esquerda, painel com abas à direita */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card>{map('min(60dvh, 620px)')}</Card>
        <div className="flex min-h-0 flex-col">
          <div className="mb-2 flex gap-1 overflow-x-auto" role="tablist" aria-label="Painéis">
            {TABS.map((x) => (
              <TabButton key={x.id} active={tab === x.id} onClick={() => setTab(x.id)} badge={x.id === 'agenda' ? items.length : 0}>
                {x.icon} {x.label}
              </TabButton>
            ))}
          </div>
          <div className="max-h-[calc(100dvh-260px)] overflow-y-auto pr-1">{panel[tab]}</div>
        </div>
      </div>

      {/* Celular: uma aba por vez */}
      <div className="space-y-3 lg:hidden">
        {tab === 'pais' && <Card>{map()}</Card>}
        {panel[tab]}
      </div>

      {/* Barra inferior */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-page/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={done}
            onClick={advance}
            className="min-h-12 w-full rounded-xl bg-accent px-6 text-base font-bold text-accent-ink shadow-lg transition hover:opacity-90 disabled:opacity-40 lg:ml-auto lg:block lg:w-auto"
          >
            {done ? 'Fim da simulação' : items.length > 0 ? `Decidir agenda (${items.length}) ▶` : `Próximo turno: ${nextYear} ▶`}
          </button>
          <nav className="mt-1.5 grid grid-cols-4 lg:hidden" aria-label="Seções do jogo">
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                aria-current={tab === x.id ? 'page' : undefined}
                className={`relative flex min-h-12 flex-col items-center justify-center rounded-lg text-[10px] ${tab === x.id ? 'font-bold text-ink' : 'text-ink-2'}`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {x.icon}
                </span>
                {x.label}
                {x.id === 'agenda' && items.length > 0 && (
                  <span className="absolute top-0.5 right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">
                    {items.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <EventModal
        open={modal && !composing && !howto && !charts}
        items={items}
        career={career}
        onResolve={(item, optionId) => dispatch({ type: 'resolve', item, optionId })}
        onCareer={(o) => dispatch({ type: 'career', office: o })}
        onClose={() => setModal(false)}
      />

      <HowToPlay open={howto} office={office} onClose={() => setHowto(false)} />

      <Drawer open={charts} title="Gráficos e regiões" onClose={() => setCharts(false)}>
        <ChartsPanel />
      </Drawer>

      <Drawer open={composing !== null} title={`Propor projeto · ${role?.body ?? ''}`} onClose={() => setComposing(null)}>
        {office && composing !== null && (
          <BillComposer
            office={office}
            capital={career.capital}
            price={votePrice(career.approval)}
            proposalCtx={proposalContext(career, input, results)}
            politicalContext={politicalSummary(career, input, results)}
            onCreateCustom={(c) => dispatch({ type: 'add-custom', bill: c })}
            initialTemplateId={composing || undefined}
            onSpend={(n) => dispatch({ type: 'spend', amount: n })}
            onCancel={() => setComposing(null)}
            onPropose={(d) => {
              dispatch({ type: 'propose', draft: d })
              setComposing(null)
              setModal(true)
            }}
          />
        )}
      </Drawer>
    </div>
  )
}

function AgendaSummary({
  count,
  nextYear,
  done,
  onOpen,
  canPropose,
  onPropose,
  isJudge,
}: {
  count: number
  nextYear: number
  done: boolean
  onOpen: () => void
  canPropose: boolean
  onPropose: () => void
  isJudge: boolean
}) {
  return (
    <div className="space-y-3">
      <Card>
        {done ? (
          <p className="text-sm text-ink-2">A simulação terminou. Veja o balanço da sua carreira no topo.</p>
        ) : count > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Você tem <strong>{count}</strong> {count === 1 ? 'decisão' : 'decisões'} antes de {nextYear}.
            </p>
            <Button variant="primary" onClick={onOpen} className="w-full">
              Abrir as cartas
            </Button>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-ink-2">
            <p>Agenda resolvida. Antes de avançar o ano, você pode:</p>
            <ul className="list-disc space-y-1 pl-5">
              {!isJudge && <li>propor um projeto de lei (aba Leis);</li>}
              <li>conferir os indicadores do país (aba País);</li>
              <li>ler as notícias do ano.</li>
            </ul>
            {canPropose && (
              <Button onClick={onPropose} className="w-full">
                ✍ Propor um projeto de lei
              </Button>
            )}
          </div>
        )}
      </Card>
      <Card title="Como funciona um turno">
        <ol className="list-decimal space-y-1 pl-5 text-xs text-ink-2">
          <li>Cartas de decisão chegam no começo do ano: escolha uma opção em cada.</li>
          <li>Se quiser, proponha um projeto de lei (um por ano).</li>
          <li>Toque em “Próximo turno”: o ano é simulado e as notícias mostram o que aconteceu.</li>
        </ol>
      </Card>
    </div>
  )
}

function ChartsPanel() {
  const c = useThemeColors()
  const { career, input, results } = useGame()
  if (!career || !input) return null
  const t = career.t
  const r = results[t]
  const separated = separatedAt(input, t)
  const labelA = separated ? 'Bloco A' : 'Centro-Sul'
  const labelB = separated ? 'Bloco B' : 'Norte e Nordeste'
  const perCapita = results.slice(0, t + 1).map((x) => ({ year: x.year, A: Math.round(x.A.gdpPc), B: Math.round(x.B.gdpPc) }))
  return (
    <div className="space-y-4">
      <Card title="Renda por pessoa (PIB per capita)" subtitle="R$ de 2023">
        <TimeSeriesChart
          data={perCapita}
          series={[
            { key: 'A', label: labelA, color: c['series-a'] },
            { key: 'B', label: labelB, color: c['series-b'] },
          ]}
          format={fmtBRLFull}
          axisFormat={(v) => `${fmtNum(v / 1000, 0)} mil`}
          height={220}
        />
      </Card>
      <Card title={`Por que a economia cresceu assim em ${r.year}`}>
        {t === 0 ? (
          <p className="text-sm text-muted">Avance um turno para ver.</p>
        ) : (
          <>
            <ComponentsChart result={r} />
            <ComponentsTable r={r} />
          </>
        )}
      </Card>
      <WhyPanel r={r} params={input.params} />
      <div className="grid gap-4 md:grid-cols-2">
        <BlockPanel block="A" r={r} label={separated ? blockLabel(input.params.partition, 'A') : labelA} params={input.params} />
        <BlockPanel block="B" r={r} label={separated ? blockLabel(input.params.partition, 'B') : labelB} params={input.params} />
      </div>
    </div>
  )
}

const PROMISE_STATUS: Record<PromiseRecord['status'], { label: string; cls: string }> = {
  campanha: { label: 'Em campanha', cls: 'bg-surface-2 text-ink-2' },
  pendente: { label: 'Pendente', cls: 'bg-surface-2 text-ink' },
  cumprida: { label: '✓ Cumprida', cls: 'bg-good/15 text-good' },
  quebrada: { label: '✗ Descumprida', cls: 'bg-bad/15 text-bad' },
  'sem-mandato': { label: 'Sem mandato', cls: 'bg-surface-2 text-muted' },
}

function TabButton({ children, active, onClick, badge }: { children: ReactNode; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative min-h-10 shrink-0 rounded-lg px-3 text-sm ${active ? 'bg-accent font-semibold text-accent-ink' : 'border border-line text-ink hover:bg-surface-2'}`}
    >
      {children}
      {badge ? (
        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{badge}</span>
      ) : null}
    </button>
  )
}

function Mini({ label, value, term }: { label: string; value: string; term?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-[11px] text-ink-2">{term ? <Term id={term}>{label}</Term> : label}</div>
      <div className="text-lg font-bold text-ink">{value}</div>
    </div>
  )
}

/** Território do jogador para estimar custos de propostas próprias. */
function proposalContext(career: CareerState, input: SimInput, results: YearResult[]): ProposalContext | undefined {
  const office = career.office
  if (!office) return undefined
  const role = ROLES[office]
  const t = career.t
  const r = results[t]
  const party = findParty(career.setup.party)
  const partyText = party ? `${party.name} (${lowerFirst(SPECTRUM_LABELS[party.spectrum])})` : ''
  const uf = career.setup.uf
  if (role.level === 'municipal' && career.setup.municipio) {
    const m = municipalSeries(career, results)[t]
    return {
      office,
      level: 'municipal',
      territoryName: `${career.setup.municipio.name}, ${uf}`,
      territoryPop: m?.pop ?? career.setup.municipio.pop,
      territoryGdp: m?.gdp ?? career.setup.municipio.gdp,
      party: partyText,
    }
  }
  if (role.level === 'estadual') {
    return {
      office,
      level: 'estadual',
      territoryName: `${input.baseline.states[uf].name} (${uf})`,
      territoryPop: r.uf[uf].pop,
      territoryGdp: r.uf[uf].gdp,
      party: partyText,
    }
  }
  const separated = separatedAt(input, t)
  const side = input.params.partition[uf]
  return {
    office,
    level: 'federal',
    territoryName: separated ? `Bloco ${side}` : 'Brasil',
    territoryPop: separated ? r[side].pop : r.A.pop + r.B.pop,
    territoryGdp: separated ? r[side].gdp : r.A.gdp + r.B.gdp,
    party: partyText,
  }
}

/** Resumo da situação política para a IA: composição da casa, governo e popularidade. */
function politicalSummary(career: CareerState, input: SimInput, results: YearResult[]): string {
  const office = career.office
  if (!office) return ''
  const ctx = legislativeContext(career, input, results, ROLES[office].level, career.t + 1, office, career.setup.party)
  const chambers = ctx.chambers
    .map(
      (c) =>
        `${c.name} (${c.total} cadeiras): ${c.parties
          .filter((p) => p.seats > 0)
          .map((p) => `${p.party.id} ${p.seats} (${lowerFirst(SPECTRUM_LABELS[p.party.spectrum])})`)
          .join(', ')}`,
    )
    .join('\n')
  const exec = findParty(ctx.executiveParty)
  return `${chambers}
Chefe do Executivo: ${ctx.executiveTitle}, partido ${exec?.name ?? ctx.executiveParty}.
Popularidade do jogador: ${Math.round(career.approval)}%. Capital político: ${career.capital}. Relação com o partido: ${Math.round(career.partyLoyalty)}/100.
Ano: ${2023 + career.t}. Próxima eleição do jogador: ${career.nextElection !== null ? 2023 + career.nextElection : 'nenhuma'}.`
}
