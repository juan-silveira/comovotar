import { useEffect, useMemo, useState } from 'react'
import { fmtNum } from '../lib/format'
import { fetchSeries } from '../lib/bcbData'
import { MISSIONS, missionInput } from '../model/game'
import { newCareer } from '../model/career'
import { simulate } from '../model/simulation'
import { socialSeries } from '../model/social'

interface Real {
  gdp: Record<number, number>
  ipca: Record<number, number>
  unemployment: Record<number, number>
}

const YEARS = [2024, 2025]

/** Compara a simulação neutra (sem eventos sorteados) com os dados observados desde 2023. */
export function Validation() {
  const [real, setReal] = useState<Real | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    ;(async () => {
      const days = 365 * 4
      const [gdp, ipca, un] = [await fetchSeries(7326, days), await fetchSeries(13522, days), await fetchSeries(24369, days)]
      const byYear = (pts: { date: string; value: number }[], pick: 'last' | 'mean') => {
        const out: Record<number, number> = {}
        for (const y of YEARS) {
          const ys = pts.filter((p) => p.date.startsWith(`${y}-`))
          if (ys.length === 0) continue
          out[y] = pick === 'last' ? ys[ys.length - 1].value : ys.reduce((a, p) => a + p.value, 0) / ys.length
        }
        return out
      }
      // IPCA: valor de dezembro (acumulado no ano); PIB: anual; desemprego: média do ano.
      const dec = Object.fromEntries(YEARS.map((y) => [y, ipca.find((p) => p.date.startsWith(`${y}-12`))?.value]).filter(([, v]) => v !== undefined))
      if (alive) setReal({ gdp: byYear(gdp, 'last'), ipca: dec as Record<number, number>, unemployment: byYear(un, 'mean') })
    })().catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  const model = useMemo(() => {
    const input = missionInput(MISSIONS[0], 30, [])
    const neutral = { ...input, params: { ...input.params, eventsEnabled: false, climateEnabled: false } }
    const r = simulate(neutral, 5)
    const soc = socialSeries(newCareer({ office: 'vereador', uf: 'SP', municipio: null, party: 'UDC' }), r, 5)
    return Object.fromEntries(
      YEARS.map((y) => {
        const t = y - 2023
        const w = r[t].A.gdp / (r[t].A.gdp + r[t].B.gdp)
        return [y, { gdp: w * r[t].A.growth + (1 - w) * r[t].B.growth, ipca: r[t].macro.inflation, unemployment: soc[t].unemployment, poverty: soc[t].poverty }]
      }),
    ) as Record<number, { gdp: number; ipca: number; unemployment: number; poverty: number }>
  }, [])

  const cell = (v: number | undefined, d = 1) => (v === undefined ? '—' : `${fmtNum(v, d)}%`)
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-bad">Dados do Banco Central indisponíveis agora ({error}).</p>}
      <div className="overflow-x-auto">
        <table className="tnum w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-ink-2">
              <th className="py-1 text-left font-medium">Indicador</th>
              {YEARS.map((y) => (
                <th key={y} className="py-1 text-right font-medium" colSpan={2}>
                  {y}: real × modelo
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Crescimento do PIB', 'gdp'],
              ['Inflação (IPCA)', 'ipca'],
              ['Desemprego (média do ano)', 'unemployment'],
            ].map(([label, key]) => (
              <tr key={key} className="border-t border-line">
                <td className="py-1 text-ink">{label}</td>
                {YEARS.map((y) => [
                  <td key={`${y}r`} className="py-1 text-right font-semibold text-ink">
                    {real ? cell(real[key as keyof Real][y]) : '…'}
                  </td>,
                  <td key={`${y}m`} className="py-1 text-right text-ink-2">
                    {cell(model[y][key as 'gdp'])}
                  </td>,
                ])}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td className="py-1 text-ink">Pobreza</td>
              <td className="py-1 text-right font-semibold text-ink">23,1%</td>
              <td className="py-1 text-right text-ink-2">{cell(model[2024].poverty)}</td>
              <td className="py-1 text-right text-muted" colSpan={2}>
                ainda sem dado oficial
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-ink-2">
        O modelo roda sem eventos sorteados e sem decisões do jogador, a partir de 2023. As diferenças são esperadas e
        ensinam algo: em 2024 a economia cresceu acima da tendência histórica, e a pobreza caiu mais rápido com a
        ampliação do Bolsa Família, que o cenário neutro não inclui. O objetivo do modelo é mostrar mecanismos, não
        prever números.
      </p>
      <p className="text-[11px] text-muted">Fontes: Banco Central (SGS: séries 7326, 13522 e 24369) e IBGE (Síntese de Indicadores Sociais 2025).</p>
    </div>
  )
}
