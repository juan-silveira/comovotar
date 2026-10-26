import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { fmtBRL, fmtBRLFull, fmtNum, fmtPop, fmtPp, fmtSignedPct } from '../lib/format'
import { compactResults, saveScenario } from '../lib/storage'
import type { DecisionCard } from '../model/decisions'
import type { EventOccurrence } from '../model/events'
import { DRIVER_LABELS, topDrivers, yearHeadline } from '../model/explain'
import type { Params } from '../model/params'
import { COMPONENT_LABELS, HORIZON, type BlockId, type YearResult } from '../model/simulation'
import { useScenario } from '../state/scenario'
import { BlockTag, Button, Card, InfoTip } from './ui'

function Delta({ v, suffix = '%', digits = 1 }: { v: number; suffix?: string; digits?: number }) {
  const s = `${v < 0 ? '−' : v > 0 ? '+' : ''}${fmtNum(Math.abs(v), digits)}${suffix}`
  return <span className={v < -0.005 ? 'text-bad' : v > 0.005 ? 'text-good' : 'text-ink-2'}>{s}</span>
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line py-1.5 last:border-0">
      <dt className="flex items-center gap-1 text-xs text-ink-2">
        {label}
        {hint && <InfoTip text={hint} label={`Sobre: ${label}`} />}
      </dt>
      <dd className="tnum text-right text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

/** Indicadores de um bloco. Os dois blocos usam o mesmo componente e o mesmo destaque. */
export function BlockKpis({ block, r }: { block: BlockId; r: YearResult }) {
  const b = r[block]
  return (
    <Card title={<BlockTag block={block}>{block === 'A' ? 'Bloco A · S, SE, CO' : 'Bloco B · N, NE'}</BlockTag>}>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-ink-2">PIB per capita</div>
          <div className="tnum text-2xl font-bold text-ink">{fmtBRLFull(b.gdpPc)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-2">Crescimento do ano</div>
          <div className="tnum text-2xl font-bold text-ink">{r.t === 0 ? '—' : fmtSignedPct(b.growth, 2)}</div>
        </div>
      </div>
      <dl>
        <Row label="PIB" value={fmtBRL(b.gdp)} />
        <Row label="População" value={fmtPop(b.pop)} />
        <Row
          label="Saldo primário estimado"
          value={<Delta v={b.fiscalBalance} suffix="% do PIB" />}
          hint="Saldo primário de base mais os efeitos da separação: em A, a parte não reinvestida da economia com transferências; em B, o buraco das transferências, fechado gradualmente durante o ajuste."
        />
        <Row label="Dívida pública" value={`${fmtNum(b.debt, 0)}% do PIB`} />
        <Row
          label="vs. trajetória sem separação"
          value={<Delta v={b.vsNoSeparation} />}
          hint="Diferença do PIB per capita frente ao que o mesmo bloco teria crescendo pela sua tendência histórica, sem separação."
        />
        <Row
          label="vs. Brasil unido (PIB per capita)"
          value={<Delta v={(b.gdpPc / r.united.gdpPc - 1) * 100} />}
          hint="Razão entre o PIB per capita do bloco e o do Brasil unido crescendo 2,2% ao ano. Reflete também a diferença de renda que já existia em 2023."
        />
      </dl>
    </Card>
  )
}

export function EventCard({ e }: { e: EventOccurrence }) {
  return (
    <article className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">
          <span aria-hidden>⚡ </span>
          {e.title}
        </h3>
        <span className="text-xs text-muted">
          {e.duration > 1 ? `anos ${e.year}–${e.year + e.duration - 1}` : `ano ${e.year}`}
        </span>
      </div>
      <div className="tnum mt-1 flex gap-4 text-xs">
        <BlockTag block="A">A: {fmtPp(e.effectA, 1)}</BlockTag>
        <BlockTag block="B">B: {fmtPp(e.effectB, 1)}</BlockTag>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{e.explanation}</p>
    </article>
  )
}

export function WhyPanel({ r, params }: { r: YearResult; params: Params }) {
  const drivers = topDrivers(r, params)
  return (
    <Card title="Por que isso aconteceu?" subtitle={yearHeadline(r)}>
      {r.t === 0 ? (
        <p className="text-sm text-ink-2">Avance um ano para ver os fatores que explicam o crescimento de cada bloco.</p>
      ) : (
        <ol className="space-y-3">
          {drivers.map((d) => (
            <li key={`${d.block}-${d.key}`} className="flex gap-3">
              <span className="tnum mt-0.5 w-20 shrink-0 text-xs font-semibold text-ink">
                <BlockTag block={d.block}>{d.block}</BlockTag>
                <span className="block pl-4 text-ink-2">{fmtPp(d.value)}</span>
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">{DRIVER_LABELS[d.key]}</div>
                <p className="text-sm leading-relaxed text-ink-2">{d.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

/** Tabela com os componentes do ano (vista acessível do gráfico de barras). */
export function ComponentsTable({ r }: { r: YearResult }) {
  const keys = Object.keys(COMPONENT_LABELS) as (keyof typeof COMPONENT_LABELS)[]
  return (
    <table className="tnum mt-3 w-full text-xs">
      <caption className="sr-only">Componentes do crescimento no ano {r.t}</caption>
      <thead>
        <tr className="text-ink-2">
          <th className="py-1 text-left font-medium">Componente</th>
          <th className="py-1 text-right font-medium">Bloco A</th>
          <th className="py-1 text-right font-medium">Bloco B</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k} className="border-t border-line">
            <td className="py-1 text-ink-2">{COMPONENT_LABELS[k]}</td>
            <td className="py-1 text-right text-ink">{fmtPp(r.A.components[k])}</td>
            <td className="py-1 text-right text-ink">{fmtPp(r.B.components[k])}</td>
          </tr>
        ))}
        <tr className="border-t border-line font-semibold">
          <td className="py-1 text-ink">Crescimento total</td>
          <td className="py-1 text-right text-ink">{fmtSignedPct(r.A.growth, 2)}</td>
          <td className="py-1 text-right text-ink">{fmtSignedPct(r.B.growth, 2)}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function DecisionDialog({ card, onChoose }: { card: DecisionCard; onChoose: (optionId: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [card.id])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => e.preventDefault()}
      aria-labelledby="decision-title"
      className="m-auto w-[min(640px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="p-5">
        <div className="text-xs font-semibold tracking-wide text-muted uppercase">Carta de decisão · ano {card.year}</div>
        <h2 id="decision-title" className="mt-1 text-lg font-bold">
          {card.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{card.context}</p>
        <div className="mt-4 space-y-2">
          {card.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChoose(o.id)}
              className="block w-full rounded-lg border border-line p-3 text-left transition hover:border-accent hover:bg-surface-2"
            >
              <div className="text-sm font-semibold">{o.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-ink-2">{o.description}</div>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}

export function SaveScenario() {
  const { uid } = useAuth()
  const { state, dispatch, results } = useScenario()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(asNew: boolean) {
    if (!uid) return
    setBusy(true)
    setMsg('')
    try {
      const id = await saveScenario(uid, {
        id: asNew ? undefined : (state.savedId ?? undefined),
        name: state.name || 'Cenário sem nome',
        mode: state.mode,
        missionId: state.missionId,
        params: state.params,
        coef: state.coef,
        baseline: state.baseline,
        seed: state.seed,
        decisions: state.decisions,
        results: compactResults(results.slice(0, HORIZON + 1)),
        notes: state.notes,
      })
      dispatch({ type: 'meta', patch: { savedId: id } })
      setMsg('Cenário salvo.')
    } catch (e) {
      setMsg(`Erro ao salvar: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Salvar cenário" subtitle="Os resultados dos 30 anos são salvos para comparação">
      <div className="space-y-3">
        <label className="block text-sm text-ink">
          Nome
          <input
            value={state.name}
            onChange={(e) => dispatch({ type: 'meta', patch: { name: e.target.value } })}
            maxLength={80}
            className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
          />
        </label>
        <label className="block text-sm text-ink">
          Notas
          <textarea
            value={state.notes}
            onChange={(e) => dispatch({ type: 'meta', patch: { notes: e.target.value } })}
            rows={3}
            maxLength={2000}
            className="mt-1 block w-full rounded-md border border-line bg-surface p-2"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!uid || busy} onClick={() => save(false)}>
            {state.savedId ? 'Atualizar' : 'Salvar'}
          </Button>
          {state.savedId && (
            <Button disabled={!uid || busy} onClick={() => save(true)}>
              Salvar como novo
            </Button>
          )}
        </div>
        {msg && <p className="text-sm text-ink-2">{msg}</p>}
        {!uid && <p className="text-xs text-muted">Conectando…</p>}
      </div>
    </Card>
  )
}

