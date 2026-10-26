import { lowerFirst } from '../../lib/format'
import { NORM_LABELS } from '../../model/bills'
import { getTemplate, STAGE_LABELS, type BillState, type LogEntry } from '../../model/lawmaking'
import { SPECTRUM_LABELS, VOTE_REASON_LABELS, type VoteResult } from '../../model/legislature'
import { Hemicycle } from './Hemicycle'
import { LegalRefChip } from './LegalRef'

const OUTCOME_STYLE: Record<LogEntry['outcome'], string> = {
  ok: 'bg-good text-white',
  fail: 'bg-bad text-white',
  warn: 'bg-warn-bg text-warn-ink',
  info: 'bg-surface-2 text-ink-2',
}
const OUTCOME_ICON: Record<LogEntry['outcome'], string> = { ok: '✓', fail: '✕', warn: '!', info: 'i' }

export function VoteTable({ vote }: { vote: VoteResult }) {
  const max = Math.max(...vote.parties.map((p) => p.seats))
  return (
    <>
    <div className="mt-2 overflow-x-auto">
      <table className="tnum w-full min-w-[420px] text-xs">
        <caption className="sr-only">Votação por partido na {vote.chamber}</caption>
        <thead>
          <tr className="text-ink-2">
            <th className="py-1 text-left font-medium">Partido</th>
            <th className="py-1 text-left font-medium">Orientação</th>
            <th className="py-1 text-right font-medium">Sim</th>
            <th className="py-1 text-right font-medium">Não</th>
            <th className="py-1 text-right font-medium">Ausentes</th>
            <th className="py-1 pl-3 text-left font-medium" title="Por que o partido orientou assim">Motivo</th>
            <th className="py-1 pl-3 text-left font-medium">Bancada</th>
          </tr>
        </thead>
        <tbody>
          {vote.parties.map((p) => (
            <tr key={p.party.id} className="border-t border-line">
              <td className="py-1 font-semibold text-ink" title={`${p.party.name}: ${lowerFirst(SPECTRUM_LABELS[p.party.spectrum])}`}>
                {p.party.id}
                <span className="ml-1 font-normal text-muted">{SPECTRUM_LABELS[p.party.spectrum]}</span>
              </td>
              <td className="py-1 text-ink-2">{p.orientation === 'sim' ? 'Sim' : p.orientation === 'nao' ? 'Não' : 'Liberada'}</td>
              <td className="py-1 text-right text-ink">{p.yes}</td>
              <td className="py-1 text-right text-ink">{p.no}</td>
              <td className="py-1 text-right text-muted">{p.absent}</td>
              <td className={`py-1 pl-3 ${p.reason === 'estrategia' ? 'font-semibold text-warn-ink' : 'text-ink-2'}`}>
                {VOTE_REASON_LABELS[p.reason]}
                <span className="ml-1 text-muted">({Math.round(p.merit * 100)}% no mérito)</span>
              </td>
              <td className="py-1 pl-3">
                <span className="flex h-2 w-28 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
                  <span className="h-full bg-good" style={{ width: `${(p.yes / max) * 100}%` }} />
                  <span className="h-full bg-bad" style={{ width: `${(p.no / max) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
          <tr className="border-t border-line font-semibold">
            <td className="py-1 text-ink">Total</td>
            <td className="py-1 text-ink-2">mínimo {vote.required}</td>
            <td className="py-1 text-right text-ink">{vote.yes}</td>
            <td className="py-1 text-right text-ink">{vote.no}</td>
            <td className="py-1 text-right text-muted">{vote.absent}</td>
            <td className="py-1 pl-3 text-ink-2">~{vote.meritYes} pelo mérito</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
    </>
  )
}

export function BillView({ bill, compact = false }: { bill: BillState; compact?: boolean }) {
  const t = getTemplate(bill)
  const statusLabel = {
    tramitando: 'Em tramitação',
    arquivado: 'Arquivado',
    lei: 'Virou lei',
    inconstitucional: 'Declarado inconstitucional',
  }[bill.status]
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs text-muted">{NORM_LABELS[bill.draft.norm]}</div>
          <h3 className="text-base font-semibold text-ink">{t.title}</h3>
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink">{statusLabel}</span>
      </div>
      {!compact && (
        <div className="mt-2 text-xs text-ink-2">
          Texto atual: {bill.provisions.join('; ')}
          {bill.removed.length > 0 && <span className="text-bad"> · Retirado: {bill.removed.join('; ')}</span>}
          {bill.jabuti && <span className="text-warn-ink"> · Jabuti: {bill.jabuti.text}</span>}
        </div>
      )}
      <ol className="mt-3 space-y-3 border-l border-line pl-4">
        {bill.log.map((l, i) => (
          <li key={i} className="relative">
            <span
              className={`absolute top-0.5 -left-[25px] inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${OUTCOME_STYLE[l.outcome]}`}
              aria-hidden
            >
              {OUTCOME_ICON[l.outcome]}
            </span>
            <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{STAGE_LABELS[l.stage]}</div>
            <div className="text-sm font-semibold text-ink">
              {l.title}
              {(l.stage === 'sancao' || l.stage === 'veto' || l.stage === 'promulgacao') && l.outcome !== 'info' && (
                <span
                  className={`stamp ml-2 rounded border-2 px-1.5 py-0.5 align-middle text-[10px] font-black tracking-widest uppercase ${
                    l.outcome === 'ok' ? 'border-good text-good' : l.outcome === 'fail' ? 'border-bad text-bad' : 'border-warn-ink text-warn-ink'
                  }`}
                  aria-hidden
                >
                  {l.outcome === 'ok' ? (l.stage === 'promulgacao' ? 'Promulgada' : 'Sancionada') : l.outcome === 'fail' ? 'Vetada' : 'Veto parcial'}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-ink-2">{l.text}</p>
            {l.refs && l.refs.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {l.refs.map((r) => (
                  <LegalRefChip key={r} id={r} />
                ))}
              </div>
            )}
            {!compact && l.vote && <Hemicycle vote={l.vote} />}
            {!compact && l.vote && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-ink-2">Ver votação por partido</summary>
                <VoteTable vote={l.vote} />
              </details>
            )}
            {l.court && (
              <div className="tnum mt-1 flex gap-1" aria-label={`${l.court.yes} votos ${l.court.label}, ${l.court.no} contra`}>
                {Array.from({ length: 11 }, (_, k) => (
                  <span
                    key={k}
                    className={`inline-block h-3 w-3 rounded-full ${k < l.court!.yes ? 'bg-bad' : 'bg-good'}`}
                    title={k < l.court!.yes ? 'Inconstitucional' : 'Constitucional'}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
