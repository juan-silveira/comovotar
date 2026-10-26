import { Link } from 'react-router-dom'
import { ComponentsChart, TimeSeriesChart } from '../components/charts'
import {
  BlockKpis,
  ComponentsTable,
  DecisionDialog,
  EventCard,
  SaveScenario,
  WhyPanel,
} from '../components/panels'
import { Button, Card } from '../components/ui'
import { fmtBRLFull, fmtNum, fmtSignedPct, lowerFirst } from '../lib/format'
import { useThemeColors } from '../lib/theme'
import { DECISION_CARDS, findOption } from '../model/decisions'
import { SEPARATION_LABELS } from '../model/params'
import { HORIZON } from '../model/simulation'
import { useScenario } from '../state/scenario'

const HORIZONS = [
  { label: 'Curto prazo (3 anos)', year: 3 },
  { label: 'Médio prazo (10 anos)', year: 10 },
  { label: 'Longo prazo (30 anos)', year: 30 },
]

export function Simulation() {
  const { state, dispatch, visible, current, pending, input } = useScenario()
  const c = useThemeColors()
  const y = state.currentYear
  const done = y >= HORIZON

  const perCapita = visible.map((r) => ({
    year: r.year,
    A: Math.round(r.A.gdpPc),
    B: Math.round(r.B.gdpPc),
    U: Math.round(r.united.gdpPc),
  }))
  const growth = visible.slice(1).map((r) => ({ year: r.year, A: r.A.growth, B: r.B.growth }))
  const allEvents = visible.flatMap((r) => r.newEvents)
  const decisionsShown = DECISION_CARDS.filter((card) => state.decisions.some((d) => d.cardId === card.id))

  return (
    <div className="space-y-5">
      {pending && (
        <DecisionDialog
          card={pending}
          onChoose={(optionId) => dispatch({ type: 'choose', choice: { cardId: pending.id, optionId } })}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Laboratório · Separação {lowerFirst(SEPARATION_LABELS[input.params.separation])} ·
            semente {input.seed}
          </p>
          <h1 className="text-2xl font-bold text-ink">{state.name}</h1>
        </div>
        <Link to="/configuracao" className="text-sm text-ink-2 underline">
          Ajustar parâmetros
        </Link>
      </div>

      {/* Controle do tempo */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="tnum text-3xl font-bold text-ink">
              Ano {y} <span className="text-lg font-medium text-ink-2">· {current.year}</span>
            </div>
            <div
              className="mt-2 h-2 w-56 max-w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={HORIZON}
              aria-valuenow={y}
              aria-label="Progresso da simulação"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${(y / HORIZON) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={done} onClick={() => dispatch({ type: 'advance', years: 1 })}>
              Avançar 1 ano
            </Button>
            {HORIZONS.map((h) => (
              <Button
                key={h.year}
                disabled={y >= h.year}
                onClick={() => dispatch({ type: 'advance', years: h.year - y })}
              >
                {h.label}
              </Button>
            ))}
            <Button variant="ghost" disabled={y === 0} onClick={() => dispatch({ type: 'reset' })}>
              Reiniciar
            </Button>
          </div>
        </div>
      </Card>


      {current.newEvents.length > 0 && (
        <section aria-label="Eventos do ano" className="grid gap-3 md:grid-cols-2">
          {current.newEvents.map((e) => (
            <EventCard key={`${e.id}-${e.year}`} e={e} />
          ))}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <BlockKpis block="A" r={current} />
        <BlockKpis block="B" r={current} />
      </div>
      <p className="tnum -mt-2 text-xs text-muted">
        Brasil unido (contrafactual, {fmtNum(input.coef.unitedGrowth, 1)}% ao ano): PIB per capita de{' '}
        {fmtBRLFull(current.united.gdpPc)}.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="PIB per capita" subtitle="R$ de 2023 por habitante">
          <TimeSeriesChart
            data={perCapita}
            series={[
              { key: 'A', label: 'Bloco A', color: c['series-a'] },
              { key: 'B', label: 'Bloco B', color: c['series-b'] },
              { key: 'U', label: 'Brasil unido', color: c['series-united'], dashed: true, noLabel: true },
            ]}
            format={(v) => fmtBRLFull(v)}
            axisFormat={(v) => `${fmtNum(v / 1000, 0)} mil`}
          />
        </Card>
        <Card title="Crescimento anual do PIB" subtitle="% ao ano">
          {growth.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Avance o tempo para ver o crescimento.</p>
          ) : (
            <TimeSeriesChart
              data={growth}
              series={[
                { key: 'A', label: 'Bloco A', color: c['series-a'] },
                { key: 'B', label: 'Bloco B', color: c['series-b'] },
              ]}
              format={(v) => fmtSignedPct(v, 2)}
              axisFormat={(v) => `${fmtNum(v, 0)}%`}
              zeroLine
            />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Decomposição do crescimento · ano ${y}`} subtitle="Contribuição de cada componente, em pontos percentuais">
          {y === 0 ? (
            <p className="py-16 text-center text-sm text-muted">Avance o tempo para ver a decomposição.</p>
          ) : (
            <>
              <ComponentsChart result={current} />
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-ink-2">Ver tabela</summary>
                <ComponentsTable r={current} />
              </details>
            </>
          )}
        </Card>
        <WhyPanel r={current} params={input.params} />
      </div>

      {(decisionsShown.length > 0 || allEvents.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Decisões tomadas">
            {decisionsShown.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma decisão ainda.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {decisionsShown.map((card) => {
                  const ch = state.decisions.find((d) => d.cardId === card.id)!
                  return (
                    <li key={card.id} className="flex justify-between gap-3">
                      <span className="text-ink-2">
                        Ano {card.year} · {card.title}
                      </span>
                      <span className="text-right font-medium text-ink">
                        {findOption(card.id, ch.optionId)?.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card title="Histórico de eventos">
            {allEvents.length === 0 ? (
              <p className="text-sm text-muted">Nenhum evento até agora.</p>
            ) : (
              <div className="space-y-2">
                {[...allEvents].reverse().map((e) => (
                  <EventCard key={`${e.id}-${e.year}`} e={e} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SaveScenario />
        <Card title="Próximos passos">
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="text-ink underline" to="/relatorio">
                Relatório por horizonte
              </Link>{' '}
              <span className="text-ink-2">– curto, médio e longo prazo com tabela e explicação.</span>
            </li>
            <li>
              <Link className="text-ink underline" to="/comparar">
                Comparar cenários
              </Link>{' '}
              <span className="text-ink-2">– até três cenários salvos sobrepostos.</span>
            </li>
            <li>
              <Link className="text-ink underline" to="/dados">
                Dados e metodologia
              </Link>{' '}
              <span className="text-ink-2">– fontes, fórmulas e limitações.</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
