import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TimeSeriesChart, type SeriesDef } from '../components/charts'
import { Button, Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { fmtBRLFull, fmtDate, fmtNum, fmtSignedPct, lowerFirst } from '../lib/format'
import { deleteScenario, listScenarios, updateScenarioNotes, type SavedScenario } from '../lib/storage'
import { useThemeColors } from '../lib/theme'
import { SEPARATION_LABELS } from '../model/params'
import { useScenario } from '../state/scenario'

const MAX = 3

export function Compare() {
  const { uid, ready } = useAuth()
  const { dispatch } = useScenario()
  const navigate = useNavigate()
  const c = useThemeColors()
  const [items, setItems] = useState<SavedScenario[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    try {
      const list = await listScenarios(uid)
      setItems(list)
      setSelected((sel) => sel.filter((id) => list.some((s) => s.id === id)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    load()
  }, [load])

  // Cores de cenário: três slots validados para qualquer par (distintas das cores dos blocos).
  const scenarioColors = [c['c-demography'], c['c-resources'], c['c-transition']]
  const chosen = selected.map((id) => items.find((s) => s.id === id)).filter(Boolean) as SavedScenario[]
  const series: SeriesDef[] = chosen.map((s, i) => ({ key: s.id, label: `${i + 1}. ${s.name}`, shortLabel: String(i + 1), color: scenarioColors[i] }))

  const byYear = (block: 'A' | 'B') =>
    (chosen[0]?.results ?? []).map((_, t) => {
      const row: Record<string, number | null> = { year: 2023 + t }
      for (const s of chosen) row[s.id] = s.results[t] ? Math.round(s.results[t][block].gdpPc) : null
      return row
    })

  function toggle(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : sel.length >= MAX ? sel : [...sel, id]))
  }

  function open(s: SavedScenario) {
    dispatch({
      type: 'load',
      state: {
        savedId: s.id,
        name: s.name,
        notes: s.notes,
        mode: s.mode,
        missionId: s.missionId,
        baseline: s.baseline,
        params: s.params,
        coef: s.coef,
        seed: s.seed,
        decisions: s.decisions,
        currentYear: s.results.length - 1,
        targetYear: s.results.length - 1,
      },
    })
    navigate('/simulacao')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Comparar cenários</h1>
        <p className="mt-1 text-sm text-ink-2">Selecione até {MAX} cenários salvos para sobrepor os resultados.</p>
      </div>

      <Card title="Cenários salvos" actions={<Button variant="ghost" onClick={load}>Atualizar</Button>}>
        {!ready || loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : error ? (
          <p className="text-sm text-bad">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-ink-2">
            Nenhum cenário salvo ainda. Use “Salvar cenário” na tela de simulação.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((s) => {
              const idx = selected.indexOf(s.id)
              return (
                <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                  <label className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={idx >= 0}
                      disabled={idx < 0 && selected.length >= MAX}
                      onChange={() => toggle(s.id)}
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                        {idx >= 0 && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ background: scenarioColors[idx] }}
                            aria-hidden
                          />
                        )}
                        {s.name}
                      </span>
                      <span className="block text-xs text-muted">
                        {fmtDate(s.createdAt)} · {s.mode === 'missao' ? 'Missão' : 'Livre'} · separação{' '}
                        {lowerFirst(SEPARATION_LABELS[s.params.separation])} · ano 30: A{' '}
                        {fmtSignedPct(s.results[30]?.A.vsNoSeparation ?? 0)}, B{' '}
                        {fmtSignedPct(s.results[30]?.B.vsNoSeparation ?? 0)} vs. sem separação
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-1 flex-col gap-1 sm:max-w-xs">
                    <textarea
                      defaultValue={s.notes}
                      rows={2}
                      placeholder="Notas"
                      aria-label={`Notas de ${s.name}`}
                      onBlur={(e) => {
                        if (uid && e.target.value !== s.notes) updateScenarioNotes(uid, s.id, e.target.value)
                      }}
                      className="w-full rounded-md border border-line bg-surface p-2 text-xs"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => open(s)}>
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (uid && confirm(`Excluir o cenário “${s.name}”?`)) {
                          await deleteScenario(uid, s.id)
                          load()
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {chosen.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Bloco A · PIB per capita" subtitle="R$ de 2023 por habitante">
              <TimeSeriesChart
                data={byYear('A')}
                series={series}
                format={fmtBRLFull}
                axisFormat={(v) => `${fmtNum(v / 1000, 0)} mil`}
              />
            </Card>
            <Card title="Bloco B · PIB per capita" subtitle="R$ de 2023 por habitante">
              <TimeSeriesChart
                data={byYear('B')}
                series={series}
                format={fmtBRLFull}
                axisFormat={(v) => `${fmtNum(v / 1000, 0)} mil`}
              />
            </Card>
          </div>
          <Card title="Resumo por horizonte" subtitle="PIB per capita vs. trajetória sem separação">
            <div className="overflow-x-auto">
              <table className="tnum w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-ink-2">
                    <th className="py-1.5 text-left font-medium">Cenário</th>
                    {[3, 10, 30].map((t) => (
                      <th key={t} className="py-1.5 text-right font-medium" colSpan={2}>
                        Ano {t}
                      </th>
                    ))}
                  </tr>
                  <tr className="text-xs text-muted">
                    <th />
                    {[3, 10, 30].flatMap((t) => [
                      <th key={`${t}a`} className="text-right font-normal">
                        A
                      </th>,
                      <th key={`${t}b`} className="text-right font-normal">
                        B
                      </th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {chosen.map((s, i) => (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-1.5 text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: scenarioColors[i] }} />
                          {i + 1}. {s.name}
                        </span>
                      </td>
                      {[3, 10, 30].flatMap((t) => [
                        <td key={`${t}a`} className="py-1.5 text-right text-ink">
                          {s.results[t] ? fmtSignedPct(s.results[t].A.vsNoSeparation) : '—'}
                        </td>,
                        <td key={`${t}b`} className="py-1.5 text-right text-ink">
                          {s.results[t] ? fmtSignedPct(s.results[t].B.vsNoSeparation) : '—'}
                        </td>,
                      ])}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
