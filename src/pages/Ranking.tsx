import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { firebaseEnabled } from '../lib/firebase'
import { fmtDate, fmtNum } from '../lib/format'
import { topScores, type LeaderboardEntry } from '../lib/storage'
import type { Office } from '../model/bills'
import { allMissions } from '../model/game'
import { OFFICE_ORDER, ROLES } from '../model/roles'

export function Ranking() {
  const missions = allMissions()
  const [params, setParams] = useSearchParams()
  const missionId = params.get('missao') ?? missions[0].id
  const office = (params.get('cargo') as Office | null) ?? 'deputado-federal'
  const mission = missions.find((m) => m.id === missionId)
  const { uid, ready } = useAuth()
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    let alive = true
    setRows(null)
    setError('')
    topScores(missionId, office, uid)
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [missionId, office, uid, ready])

  const set = (patch: Record<string, string>) => setParams({ missao: missionId, cargo: office, ...patch })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Ranking</h1>
        <p className="mt-1 text-sm text-ink-2">
          {firebaseEnabled
            ? 'Ranking online por cenário e cargo. Só as iniciais são exibidas.'
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

      <Card title={`${mission?.title ?? missionId} · ${ROLES[office].title}`} subtitle="Melhor pontuação de cada jogador">
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
                  <th className="py-1.5 text-right font-medium">Pontos</th>
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
                      {r.mine && <span className="ml-2 text-xs font-normal tracking-normal text-muted">(você)</span>}
                    </td>
                    <td className="py-1.5 text-ink-2">{r.uf}</td>
                    <td className="py-1.5 text-right font-semibold text-ink">{fmtNum(r.score, 0)}</td>
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
