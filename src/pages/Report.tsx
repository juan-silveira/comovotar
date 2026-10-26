import { BlockTag, Button, Card } from '../components/ui'
import { fmtBRL, fmtBRLFull, fmtNum, fmtPop, fmtSignedPct } from '../lib/format'
import { horizonParagraph } from '../model/explain'
import type { BlockId, YearResult } from '../model/simulation'
import { useScenario } from '../state/scenario'

const HORIZONS = [
  { t: 3, title: 'Curto prazo' },
  { t: 10, title: 'Médio prazo' },
  { t: 30, title: 'Longo prazo' },
]

function avgGrowth(results: YearResult[], t: number, b: BlockId) {
  const s = results.slice(1, t + 1)
  return s.reduce((acc, r) => acc + r[b].growth, 0) / s.length
}

export function Report() {
  const { state, results, dispatch, pending } = useScenario()
  const y = state.currentYear

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Relatório por horizonte</h1>
        <p className="mt-1 text-sm text-ink-2">
          {state.name}. Os dois blocos aparecem lado a lado, com o mesmo destaque. Comparações com a “trajetória sem
          separação” usam a tendência histórica de cada bloco.
        </p>
      </div>

      {HORIZONS.map(({ t, title }) => {
        if (y < t) {
          return (
            <Card key={t} title={`${title} · ano ${t} (${2023 + t})`}>
              <p className="mb-3 text-sm text-ink-2">A simulação ainda está no ano {y}.</p>
              <Button disabled={!!pending} onClick={() => dispatch({ type: 'advance', years: t - y })}>
                Avançar até o ano {t}
              </Button>
              {pending && (
                <p className="mt-2 text-xs text-muted">Há uma carta de decisão pendente na tela de simulação.</p>
              )}
            </Card>
          )
        }
        const r = results[t]
        const rows: { label: string; v: (b: BlockId) => string }[] = [
          { label: 'PIB', v: (b) => fmtBRL(r[b].gdp) },
          { label: 'PIB per capita', v: (b) => fmtBRLFull(r[b].gdpPc) },
          { label: 'Crescimento médio anual', v: (b) => fmtSignedPct(avgGrowth(results, t, b), 2) },
          { label: 'População', v: (b) => fmtPop(r[b].pop) },
          { label: 'Saldo primário', v: (b) => `${fmtNum(r[b].fiscalBalance, 1)}% do PIB` },
          { label: 'Dívida pública', v: (b) => `${fmtNum(r[b].debt, 0)}% do PIB` },
          { label: 'vs. trajetória sem separação', v: (b) => fmtSignedPct(r[b].vsNoSeparation) },
          { label: 'PIB per capita vs. Brasil unido', v: (b) => fmtSignedPct((r[b].gdpPc / r.united.gdpPc - 1) * 100) },
        ]
        return (
          <Card key={t} title={`${title} · ano ${t} (${r.year})`}>
            <div className="overflow-x-auto">
              <table className="tnum w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-ink-2">
                    <th className="py-1.5 text-left font-medium">Indicador</th>
                    <th className="py-1.5 text-right font-medium">
                      <BlockTag block="A" />
                    </th>
                    <th className="py-1.5 text-right font-medium">
                      <BlockTag block="B" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-t border-line">
                      <td className="py-1.5 text-ink-2">{row.label}</td>
                      <td className="py-1.5 text-right text-ink">{row.v('A')}</td>
                      <td className="py-1.5 text-right text-ink">{row.v('B')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{horizonParagraph(results, t)}</p>
            <p className="tnum mt-2 text-xs text-muted">
              Brasil unido no mesmo ano: PIB de {fmtBRL(r.united.gdp)}, PIB per capita de {fmtBRLFull(r.united.gdpPc)}.
            </p>
          </Card>
        )
      })}
    </div>
  )
}
