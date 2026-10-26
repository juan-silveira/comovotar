import { Validation } from '../components/Validation'
import { useState } from 'react'
import { BlockTag, Button, Card } from '../components/ui'
import { loadBaseline, CACHE_DAYS } from '../lib/ibgeData'
import { fmtBRLFull, fmtDate, fmtNum } from '../lib/format'
import { aggregateBlock, DEFAULT_BASELINE, REGION_REFERENCE, regionUfs, type StateData } from '../model/baseline'
import { COEF_META } from '../model/params'
import { apportionFederalSeats, FEDERAL_SEATS } from '../model/legislature'
import { ufsOf } from '../model/partition'
import { ALL_UFS, REGION_ORDER, type UF } from '../model/states'
import { useScenario } from '../state/scenario'

const EDITABLE: { key: keyof StateData; label: string }[] = [
  { key: 'gdpGrowth', label: 'Cresc. PIB (% a.a.)' },
  { key: 'popGrowth', label: 'Cresc. pop. (% a.a.)' },
  { key: 'elderlyShare', label: 'Idosos 65+ (%)' },
]

function NumInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="number"
      step="0.01"
      value={Number(value.toFixed(2))}
      aria-label={label}
      onChange={(e) => {
        const v = Number(e.target.value.replace(',', '.'))
        if (Number.isFinite(v)) onChange(v)
      }}
      className="tnum min-h-8 w-20 rounded-md border border-line bg-surface px-1.5 text-right text-sm"
    />
  )
}

const ORIGIN_LABEL = {
  embutido: 'snapshot embutido no app',
  firebase: 'cache compartilhado (Firebase)',
  ibge: 'API do IBGE (consulta agora)',
} as const

export function Data() {
  const { state, dispatch } = useScenario()
  const b = state.baseline
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const partition = state.params.partition
  const A = aggregateBlock(b, ufsOf(partition, 'A'))
  const B = aggregateBlock(b, ufsOf(partition, 'B'))
  const pop = Object.fromEntries(ALL_UFS.map((u) => [u, b.states[u].pop])) as Record<UF, number>
  const recalculated = apportionFederalSeats(pop)
  const sorted = [...ALL_UFS].sort((x, y) => REGION_ORDER.indexOf(b.states[x].region) - REGION_ORDER.indexOf(b.states[y].region) || b.states[x].name.localeCompare(b.states[y].name, 'pt-BR'))

  const setState = (uf: UF, key: keyof StateData, v: number) =>
    dispatch({ type: 'baseline', baseline: { ...b, states: { ...b.states, [uf]: { ...b.states[uf], [key]: v } } } })

  async function refresh(force: boolean) {
    setLoading(true)
    setMsg('')
    const res = await loadBaseline(force)
    setLoading(false)
    dispatch({ type: 'baseline', baseline: res.baseline })
    setMsg(
      res.error
        ? `Não foi possível consultar o IBGE (${res.error}); usando o snapshot embutido.`
        : `Dados carregados de: ${{ navegador: 'cache do navegador', firebase: 'cache do Firebase', ibge: 'API do IBGE', embutido: 'snapshot embutido' }[res.origin]}.`,
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-ink">Dados de base e metodologia</h1>

      <Card title="Validação: o modelo comparado com o que aconteceu" subtitle="Simulação neutra desde 2023 × dados oficiais de 2024 e 2025">
        <Validation />
      </Card>

      <Card
        title="Dados por UF (ano base 2023)"
        subtitle={`Origem: ${ORIGIN_LABEL[b.source.origin]}, consulta de ${fmtDate(new Date(b.source.fetchedAt))}. PIB das UFs ${b.source.gdpYears}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" disabled={loading} onClick={() => refresh(false)}>
              Usar cache
            </Button>
            <Button disabled={loading} onClick={() => refresh(true)}>
              {loading ? 'Consultando…' : 'Atualizar pelo IBGE'}
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'baseline', baseline: DEFAULT_BASELINE })}>
              Restaurar
            </Button>
          </div>
        }
      >
        {msg && <p className="mb-3 text-sm text-ink-2">{msg}</p>}
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Os dados vêm da API de agregados do IBGE: população do Censo 2022 (tabela 4709), PIB das UFs nas Contas
          Regionais (tabela 5938) e idosos 65+ do Censo 2022 (tabela 9514). Para evitar consultas repetidas, ficam em
          cache no navegador e no Firebase por {CACHE_DAYS} dias. Edições valem só para o laboratório; o modo jogo usa
          sempre os dados padrão para manter o ranking justo.
        </p>
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-ink-2">
                <th className="py-1.5 text-left font-medium">UF</th>
                <th className="py-1.5 text-left font-medium">Bloco</th>
                <th className="py-1.5 text-right font-medium">População</th>
                <th className="py-1.5 text-right font-medium">% PIB</th>
                <th className="py-1.5 text-right font-medium">PIB per capita</th>
                {EDITABLE.map((f) => (
                  <th key={f.key} className="py-1.5 text-right font-medium">
                    {f.label}
                  </th>
                ))}
                <th className="py-1.5 pl-3 text-left font-medium">Energia</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const s = b.states[u]
                return (
                  <tr key={u} className="border-t border-line">
                    <td className="py-1 text-ink">
                      {s.name} <span className="text-xs text-muted">({u})</span>
                    </td>
                    <td className="py-1 text-ink-2">{partition[u]}</td>
                    <td className="py-1 text-right text-ink">{fmtNum(s.pop / 1e6, 2)} mi</td>
                    <td className="py-1 text-right text-ink">{fmtNum(s.gdpShare, 2)}</td>
                    <td className="py-1 text-right text-ink">{fmtBRLFull((b.gdpBrazil * s.gdpShare) / 100 / s.pop)}</td>
                    {EDITABLE.map((f) => (
                      <td key={f.key} className="py-1 text-right">
                        <NumInput label={`${s.name}: ${f.label}`} value={s[f.key] as number} onChange={(v) => setState(u, f.key, v)} />
                      </td>
                    ))}
                    <td className="py-1 pl-3 text-xs text-ink-2">{s.energy}</td>
                  </tr>
                )
              })}
              {[
                { label: <BlockTag block="A">Bloco A</BlockTag>, agg: A },
                { label: <BlockTag block="B">Bloco B</BlockTag>, agg: B },
              ].map((row, i) => (
                <tr key={i} className="border-t border-line bg-surface-2 font-semibold">
                  <td className="py-1.5 pl-1 text-ink">{row.label}</td>
                  <td />
                  <td className="py-1.5 text-right">{fmtNum(row.agg.pop / 1e6, 1)} mi</td>
                  <td className="py-1.5 text-right">{fmtNum(row.agg.gdpShare, 1)}</td>
                  <td className="py-1.5 text-right">{fmtBRLFull(row.agg.gdp / row.agg.pop)}</td>
                  <td className="py-1.5 pr-1.5 text-right">{fmtNum(row.agg.gdpGrowth, 2)}</td>
                  <td className="py-1.5 pr-1.5 text-right">{fmtNum(row.agg.popGrowth, 2)}</td>
                  <td className="py-1.5 pr-1.5 text-right">{fmtNum(row.agg.elderlyShare, 1)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Crescimento real por UF: a API fornece o PIB a preços correntes; o crescimento real de cada UF é a taxa da
          sua região (IBGE/FGV, 2002–2023) somada à diferença entre o crescimento nominal da UF e o da região. Perfil de
          energia e intensidade de recursos são estimativas a calibrar (ONS/EPE). Agregação por bloco: crescimento
          ponderado pelo PIB; demografia pela população.
        </p>
      </Card>

      <Card title="Referências regionais do enunciado" subtitle="Comparadas com a agregação das UFs">
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-ink-2">
                <th className="py-1.5 text-left font-medium">Região</th>
                <th className="py-1.5 text-right font-medium">% PIB (ref. · UFs)</th>
                <th className="py-1.5 text-right font-medium">% pop. (ref. · UFs)</th>
                <th className="py-1.5 text-right font-medium">Cresc. PIB (ref. · UFs)</th>
                <th className="py-1.5 text-right font-medium">Cresc. pop. (ref. · UFs)</th>
              </tr>
            </thead>
            <tbody>
              {REGION_ORDER.map((r) => {
                const ref = REGION_REFERENCE[r]
                const agg = aggregateBlock(b, regionUfs(r))
                return (
                  <tr key={r} className="border-t border-line">
                    <td className="py-1 text-ink">{ref.name}</td>
                    <td className="py-1 text-right text-ink">
                      {fmtNum(ref.gdpShare, 1)} · {fmtNum(agg.gdpShare, 1)}
                    </td>
                    <td className="py-1 text-right text-ink">
                      {fmtNum(ref.popShare, 1)} · {fmtNum(agg.popShare, 1)}
                    </td>
                    <td className="py-1 text-right text-ink">
                      {fmtNum(ref.gdpGrowth, 1)} · {fmtNum(agg.gdpGrowth, 2)}
                    </td>
                    <td className="py-1 text-right text-ink">
                      {fmtNum(ref.popGrowth, 2)} · {fmtNum(agg.popGrowth, 2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Representação na Câmara dos Deputados"
        subtitle="Bancadas em vigor (distribuição de 1993) e recalculadas pela população do Censo 2022, com mínimo de 8 e máximo de 70 (art. 45)"
      >
        <div className="overflow-x-auto">
          <table className="tnum w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-ink-2">
                <th className="py-1.5 text-left font-medium">UF</th>
                <th className="py-1.5 text-right font-medium">Deputados hoje</th>
                <th className="py-1.5 text-right font-medium">Pelo Censo 2022</th>
                <th className="py-1.5 text-right font-medium">Habitantes por deputado</th>
                <th className="py-1.5 text-right font-medium">Habitantes por senador</th>
              </tr>
            </thead>
            <tbody>
              {[...ALL_UFS]
                .sort((x, y) => b.states[y].pop - b.states[x].pop)
                .map((u) => {
                  const diff = recalculated[u] - FEDERAL_SEATS[u]
                  return (
                    <tr key={u} className="border-t border-line">
                      <td className="py-1 text-ink">{b.states[u].name}</td>
                      <td className="py-1 text-right text-ink">{FEDERAL_SEATS[u]}</td>
                      <td className="py-1 text-right text-ink">
                        {recalculated[u]}
                        {diff !== 0 && <span className="ml-1 text-xs text-muted">({diff > 0 ? '+' : '−'}{Math.abs(diff)})</span>}
                      </td>
                      <td className="py-1 text-right text-ink-2">{fmtNum(b.states[u].pop / FEDERAL_SEATS[u] / 1000, 0)} mil</td>
                      <td className="py-1 text-right text-ink-2">{fmtNum(b.states[u].pop / 3 / 1000, 0)} mil</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          O piso de 8 e o teto de 70 deputados fazem com que um voto em estados pouco populosos pese mais que em São
          Paulo; no Senado, todos os estados têm 3 cadeiras por desenho federativo. A distribuição atual data de 1993, e
          o STF determinou em 2023 (ADO 38) que o Congresso a atualizasse com base no Censo 2022.
        </p>
      </Card>

      <Card title="Modelo">
        <div className="space-y-4 text-sm leading-relaxed text-ink-2">
          <p>Passo anual, de t = 1 a t = 30. Para cada bloco X:</p>
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs text-ink">
            {`PIB_X(t) = PIB_X(t−1) × (1 + g_X(t))
g_X(t)   = g_base_X + fiscal e governança − perda de comércio
           − choque de transição + demografia e migração
           + empresas e recursos + eventos e clima`}
          </pre>
          <dl className="space-y-3">
            <Item title="Fiscal">
              Em A: (transferência poupada − arrecadação migrada − fundo de transição − custo de energia) × parcela
              reinvestida × 0,1. Em B: −(perda líquida de transferências no PIB de B) × 0,15, caindo linearmente em 5
              anos até 20% persistente.
            </Item>
            <Item title="Governança">
              Ciclo eleitoral (gasto extra em anos de eleição), emendas (eficiência conforme a transparência), impostos,
              choque de alternância de governo, perfil do ministério e segurança jurídica.
            </Item>
            <Item title="Comércio">
              A: exposição × perda × 0,3; B: o mesmo comércio medido no PIB de B × 0,1. Diminui linearmente em 10 anos.
              Restrições a empresas do outro bloco aumentam a perda.
            </Item>
            <Item title="Transição">Choque inicial × 0,5^((t − 1) ÷ meia-vida), igual para os dois blocos.</Item>
            <Item title="Demografia e migração">
              −0,05 p.p. por ponto de idosos acima de 10,9%. A migração vai do bloco de menor para o de maior renda
              (0,15% da população por ano com a diferença de 2023, escalada pelo log da razão de renda), modulada pelas
              políticas de entrada e retenção. Migrantes produzem 60% da média do destino e diluem a proporção de idosos.
            </Item>
            <Item title="Empresas e recursos">
              Bônus de recursos de B; realocação de empresas pela diferença entre políticas (atrair = +1, neutra = 0,
              repelir = −1) × 0,15% do PIB de origem; incentivos custam 0,5% do PIB; retorno da bolsa no ano anterior ×
              0,02.
            </Item>
            <Item title="Eventos e clima">
              Eventos econômicos (commodities, crise cambial, acordos, fuga de capitais) e eventos climáticos por UF
              (secas, enchentes, queimadas, falta de energia e de água), com probabilidade crescente no tempo, dano
              reduzido pelo preparo e pela qualidade da resposta, e 40% de reconstrução no ano seguinte.
            </Item>
            <Item title="Instituições">
              Apoio no Congresso = 10 + 0,6 × aprovação + bônus do ministério + efeito das emendas. Cartas que dependem
              de lei passam com probabilidade 0,25 + apoio. Vagas no tribunal surgem ~0,45 por ano; indicações por
              afinidade reduzem a segurança jurídica e podem ser rejeitadas pelo Senado.
            </Item>
            <Item title="Processo legislativo">
              Etapas reais (protocolo, CCJ, relator, pauta, plenário, casa revisora, sanção, veto, promulgação e controle
              de constitucionalidade), quóruns constitucionais e votação partido a partido com partidos fictícios
              descritos por posições e comportamento.
            </Item>
          </dl>
        </div>
      </Card>

      <Card title="Coeficientes">
        <ul className="space-y-1.5 text-sm text-ink-2">
          {COEF_META.map((m) => (
            <li key={m.key}>
              <strong className="text-ink">{m.label}</strong> (atual: {fmtNum(state.coef[m.key], 3)}): {m.doc}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Fontes">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>IBGE, API de agregados (servicodados.ibge.gov.br): Censo 2022 e Contas Regionais.</li>
          <li>IBGE, API de malhas territoriais: contornos das UFs para o mapa.</li>
          <li>PIB do Brasil 2023 (R$ 10,9 trilhões): IBGE, Contas Nacionais.</li>
          <li>Crescimento médio regional 2002–2023: IBGE e FGV.</li>
          <li>Dívida bruta (~74,4% do PIB em 2023): Banco Central do Brasil.</li>
          <li>Fundo eleitoral e partidário: TSE; emendas: Lei Orçamentária de 2024; carga tributária: Tesouro Nacional.</li>
          <li>Constituição Federal de 1988 e legislação citada: planalto.gov.br.</li>
        </ul>
      </Card>

      <Card title="Limitações">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-2">
          <li>Modelo de forma reduzida: cada efeito é um termo aditivo no crescimento, sem preços relativos, câmbio ou política monetária endógenos.</li>
          <li>Transferências entre regiões, energia, recursos e todos os coeficientes são hipóteses ilustrativas a calibrar.</li>
          <li>Partidos, votações e comportamento de atores são simulados por regras simples; não representam pessoas ou partidos reais.</li>
          <li>Eventos e eleições são sorteados com semente: ajudam a entender mecanismos, não a prever resultados.</li>
          <li>Valores em reais de 2023, sem inflação. Proporção de idosos muda apenas com a migração.</li>
          <li>O exercício é hipotético e educacional. A Constituição (art. 1º) define a federação como união indissolúvel.</li>
        </ul>
      </Card>
    </div>
  )
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-ink">{title}</dt>
      <dd>{children}</dd>
    </div>
  )
}

