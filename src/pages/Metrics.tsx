import { useEffect, useState } from 'react'
import { Card } from '../components/ui'
import { fmtNum } from '../lib/format'
import { recentMetrics, type DailyMetrics, type Metric } from '../lib/telemetry'

/** O que as pessoas escolhem no jogo: contagens anônimas dos últimos 30 dias. */
export function Metrics() {
  const [rows, setRows] = useState<DailyMetrics[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    recentMetrics(30).then(setRows).catch((e: Error) => setError(e.message))
  }, [])
  const sum = (m: Metric) => (rows ?? []).reduce((a, r) => a + (r[m] ?? 0), 0)
  const share = (part: number, total: number) => (total ? `${fmtNum((part / total) * 100, 0)}%` : '—')

  const offers = sum('offer_accept') + sum('offer_refuse') + sum('offer_report')
  const quiz = sum('quiz_ok') + sum('quiz_fail')
  const budgets = sum('budget_social') + sum('budget_invest') + sum('budget_austere') + sum('budget_balanced')
  const promises = sum('promise_impossible') + sum('promise_possible')

  const Stat = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="tnum text-2xl font-bold text-ink">{value}</div>
      <div className="text-[11px] text-muted">{hint}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Como as pessoas jogam</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Contagens anônimas dos últimos 30 dias, sem identificar ninguém. Mostram o que os jogadores escolhem diante dos
          dilemas do jogo. Quem preferir pode desligar o envio nas Configurações.
        </p>
      </div>
      {error && <p className="text-sm text-bad">Não foi possível carregar: {error}</p>}
      {rows === null && !error ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Partidas começadas" value={fmtNum(sum('game_start'), 0)} hint={`${fmtNum(sum('game_end'), 0)} chegaram ao fim dos 30 anos`} />
            <Stat label="Acertos no “pode ou não pode?”" value={share(sum('quiz_ok'), quiz)} hint={`${fmtNum(quiz, 0)} respostas`} />
            <Stat label="Propostas ilícitas recusadas ou denunciadas" value={share(sum('offer_refuse') + sum('offer_report'), offers)} hint={`${share(sum('offer_report'), offers)} denunciaram · ${share(sum('offer_accept'), offers)} aceitaram`} />
            <Stat label="Promessas impossíveis" value={share(sum('promise_impossible'), promises)} hint={`de ${fmtNum(promises, 0)} promessas de campanha`} />
          </div>
          <Card title="Que orçamento os governantes escolhem?">
            {budgets === 0 ? (
              <p className="text-sm text-ink-2">Ainda sem dados.</p>
            ) : (
              <ul className="space-y-2">
                {(
                  [
                    ['budget_invest', 'Investimento'],
                    ['budget_social', 'Social'],
                    ['budget_balanced', 'Equilibrado'],
                    ['budget_austere', 'Austero'],
                  ] as [Metric, string][]
                ).map(([m, label]) => (
                  <li key={m} className="text-sm">
                    <div className="flex justify-between text-ink">
                      <span>{label}</span>
                      <span className="tnum">{share(sum(m), budgets)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(sum(m) / budgets) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">Votos pelo mérito contra o próprio partido: {fmtNum(sum('merit_vote'), 0)} · leis criadas pelos jogadores: {fmtNum(sum('custom_bill'), 0)}.</p>
          </Card>
        </>
      )}
    </div>
  )
}
