import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { firebaseEnabled } from '../lib/firebase'
import { fmtDate, fmtNum } from '../lib/format'
import { currentSeason, topScores, type LeaderboardEntry, type RankingSort } from '../lib/storage'
import type { Office } from '../model/bills'
import { allMissions } from '../model/game'
import { OFFICE_ORDER, ROLES } from '../model/roles'

export function Ranking() {
  const missions = allMissions()
  const [params, setParams] = useSearchParams()
  const missionId = params.get('missao') ?? missions[0].id
  const office = (params.get('cargo') as Office | null) ?? 'deputado-federal'
  const sort = (params.get('ordem') as RankingSort | null) ?? 'score'
  const season = params.get('temporada') === '1' ? currentSeason() : null
  const mission = missions.find((m) => m.id === missionId)
  const { uid, ready } = useAuth()
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    let alive = true
    setRows(null)
    setError('')
    topScores(missionId, office, uid, sort, season)
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [missionId, office, uid, ready, sort, season])

  const set = (patch: Record<string, string>) =>
    setParams({ missao: missionId, cargo: office, ordem: sort, ...(season ? { temporada: '1' } : {}), ...patch })
  const SORTS: { id: RankingSort; label: string; hint: string }[] = [
    { id: 'score', label: '🏆 Pontuação', hint: 'Pontuação total da carreira.' },
    { id: 'territory', label: '💰 Mais rico', hint: 'Desempenho econômico do seu território.' },
    { id: 'justice', label: '🤲 Mais justo', hint: 'Quanto a pobreza no Brasil caiu durante a sua partida.' },
    { id: 'green', label: '🌳 Mais sustentável', hint: 'Quanto o desmatamento na Amazônia caiu durante a sua partida.' },
  ]
  const metric = (r: LeaderboardEntry) =>
    sort === 'territory' ? fmtNum(r.territory, 0) : sort === 'justice' ? `−${fmtNum((r.justice ?? 0) / 10, 1)} p.p.` : sort === 'green' ? `−${fmtNum(r.green ?? 0, 0)}%` : fmtNum(r.score, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Ranking</h1>
        <p className="mt-1 text-sm text-ink-2">
          {firebaseEnabled
            ? 'Ranking online por cenário e cargo. Só as iniciais são exibidas. ✓ indica pontuação confirmada: um verificador repete a partida a partir das jogadas e remove resultados que não batem.'
            : 'Modo local: o ranking mostra apenas as partidas deste navegador.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cenário">
        {missions.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === missionId}
            onClick={() => set({ missao: m.id })}
            className={`min-h-9 rounded-md px-3 text-sm ${
              m.id === missionId ? 'bg-accent text-accent-ink' : 'border border-line text-ink-2 hover:bg-surface-2'
            }`}
          >
            {m.title}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Cargo">
        {OFFICE_ORDER.map((o) => (
          <button
            key={o}
            role="tab"
            aria-selected={o === office}
            onClick={() => set({ cargo: o })}
            className={`min-h-8 rounded-md px-2.5 text-xs ${
              o === office ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2'
            }`}
          >
            {ROLES[o].title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Tipo de ranking">
        {SORTS.map((x) => (
          <button
            key={x.id}
            role="tab"
            title={x.hint}
            aria-selected={x.id === sort && !season}
            disabled={!!season && x.id !== 'score'}
            onClick={() => set({ ordem: x.id })}
            className={`min-h-9 rounded-full border px-3 text-sm disabled:opacity-40 ${
              x.id === sort ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink-2 hover:bg-surface-2'
            }`}
          >
            {x.label}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={!!season}
            onChange={(e) => setParams({ missao: missionId, cargo: office, ordem: 'score', ...(e.target.checked ? { temporada: '1' } : {}) })}
          />
          Só a temporada atual ({currentSeason().replace('-T', ', ')}º trimestre)
        </label>
      </div>

      <Card
        title={`${mission?.title ?? missionId} · ${ROLES[office].title}`}
        subtitle={SORTS.find((x) => x.id === sort)?.hint ?? 'Melhor pontuação de cada jogador'}
      >
        {error ? (
          <p className="text-sm text-bad">Não foi possível carregar o ranking: {error}</p>
        ) : rows === null ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-2">Ninguém pontuou aqui ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tnum w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-ink-2">
                  <th className="py-1.5 text-left font-medium">#</th>
                  <th className="py-1.5 text-left font-medium">Jogador</th>
                  <th className="py-1.5 text-left font-medium">UF</th>
                  <th className="py-1.5 text-right font-medium">{sort === 'score' || season ? 'Pontos' : SORTS.find((x) => x.id === sort)?.label.slice(3)}</th>
                  <th className="hidden py-1.5 text-right font-medium sm:table-cell">Território</th>
                  <th className="hidden py-1.5 text-right font-medium sm:table-cell">Leis</th>
                  <th className="hidden py-1.5 text-right font-medium sm:table-cell">Objetivos</th>
                  <th className="py-1.5 text-right font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.initials}-${i}`} className={`border-t border-line ${r.mine ? 'bg-surface-2' : ''}`}>
                    <td className="py-1.5 text-ink-2">{i + 1}</td>
                    <td className="py-1.5 font-bold tracking-widest text-ink">
                      {r.initials}
                      {r.verified && (
                        <span className="ml-1 text-xs text-good" title="Partida repetida e pontuação confirmada pelo verificador">
                          ✓
                        </span>
                      )}
                      {r.mine && <span className="ml-2 text-xs font-normal tracking-normal text-muted">(você)</span>}
                    </td>
                    <td className="py-1.5 text-ink-2">{r.uf}</td>
                    <td className="py-1.5 text-right font-semibold text-ink">{season ? fmtNum(r.score, 0) : metric(r)}</td>
                    <td className="hidden py-1.5 text-right text-ink-2 sm:table-cell">{fmtNum(r.territory, 0)}</td>
                    <td className="hidden py-1.5 text-right text-ink-2 sm:table-cell">{fmtNum(r.laws / 40, 0)}</td>
                    <td className="hidden py-1.5 text-right text-ink-2 sm:table-cell">{r.objectivesMet}/3</td>
                    <td className="py-1.5 text-right text-xs text-muted">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
