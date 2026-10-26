import { useMemo, useState, type ReactNode } from 'react'
import { fmtBRL, fmtBRLFull, fmtNum } from '../../lib/format'
import { useThemeColors } from '../../lib/theme'
import {
  DEFAULT_DEBT,
  DEFAULT_PENSION,
  FINANCE,
  fundingOptions,
  MINISTRIES_2026,
  monthlyTotal,
  OFFICE_COSTS,
  PIB_2026,
  PROMISES,
  simulateDebt,
  simulatePension,
  stabilizingPrimary,
  verdict,
  VERDICT_TEXT,
  type DebtInput,
  type PensionInput,
  type Sourced,
} from '../../model/finance'
import { TimeSeriesChart } from '../charts'
import { Card, Slider, Term } from '../ui'

export type FinanceTabId = 'orcamento' | 'promessas' | 'custo' | 'previdencia' | 'divida'

export const FINANCE_TABS: { value: FinanceTabId; label: string }[] = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'promessas', label: 'Promessas' },
  { value: 'custo', label: 'Custo da política' },
  { value: 'previdencia', label: 'Previdência' },
  { value: 'divida', label: 'Dívida e juros' },
]

export function FinanceTab({ tab }: { tab: FinanceTabId }) {
  switch (tab) {
    case 'orcamento':
      return <Budget />
    case 'promessas':
      return <Promises />
    case 'custo':
      return <PoliticsCost />
    case 'previdencia':
      return <Pension />
    case 'divida':
      return <Debt />
  }
}

// Peças comuns ----------------------------------------------------------------------------

function Src({ d }: { d: Sourced }) {
  return (
    <a href={d.url} target="_blank" rel="noreferrer" className="text-[11px] text-muted underline decoration-dotted">
      {d.source}, {d.ref}
    </a>
  )
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card title={title}>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </Card>
  )
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-[11px] text-ink-2">{label}</div>
      <div className="tnum text-xl font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  )
}

/** Barras horizontais com rótulos diretos (valor e % do total). */
function Bars({ items, total, color }: { items: { label: string; value: number; note?: string }[]; total: number; color: string }) {
  const max = Math.max(...items.map((i) => i.value))
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-ink">{i.label}</span>
            <span className="tnum shrink-0 text-ink-2">
              {fmtBRL(i.value)} · {fmtNum((i.value / total) * 100, 1)}%
            </span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color }} />
          </div>
          {i.note && <div className="mt-0.5 text-[11px] text-muted">{i.note}</div>}
        </li>
      ))}
    </ul>
  )
}

// Orçamento ---------------------------------------------------------------------------------

function Budget() {
  const c = useThemeColors()
  const F = FINANCE
  const known = F.rgpsBeneficios.value + F.pessoal.value + F.bpc.value + F.bolsaFamilia.value + F.abonoSeguro.value + F.discricionarias.value
  const other = F.despesaPrimaria.value - known
  const items = [
    { label: 'Aposentadorias e pensões do INSS (RGPS)', value: F.rgpsBeneficios.value },
    { label: 'Salários e aposentadorias de servidores federais', value: F.pessoal.value },
    { label: 'Outras despesas obrigatórias', value: other, note: 'Custeio de saúde e educação, complementações a estados e municípios, subsídios, sentenças judiciais etc.' },
    { label: 'Orçamento livre do Executivo (discricionárias)', value: F.discricionarias.value, note: 'Investimentos, bolsas de estudo, custeio de ministérios. É o que o governo de fato escolhe.' },
    { label: 'Bolsa Família', value: F.bolsaFamilia.value },
    { label: 'BPC (idosos e pessoas com deficiência de baixa renda)', value: F.bpc.value },
    { label: 'Abono salarial e seguro-desemprego', value: F.abonoSeguro.value },
  ].sort((a, b) => b.value - a.value)
  return (
    <div className="space-y-4">
      <Box title="Para onde vai o dinheiro do governo federal (2026)">
        <p>
          O governo federal arrecada, já descontados os repasses a estados e municípios, cerca de{' '}
          <strong className="text-ink">{fmtBRL(F.receitaLiquida.value)}</strong> por ano e gasta cerca de{' '}
          <strong className="text-ink">{fmtBRL(F.despesaPrimaria.value)}</strong> sem contar os juros. A maior parte desse
          gasto é <strong className="text-ink">obrigatória</strong> por lei ou pela Constituição: só cerca de{' '}
          {100 - F.obrigatoriasShare.value}% é de fato escolhida por quem governa.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BigStat label="Receita líquida" value={fmtBRL(F.receitaLiquida.value)} sub={<Src d={F.receitaLiquida} />} />
          <BigStat label="Despesa sem juros" value={fmtBRL(F.despesaPrimaria.value)} sub={<Src d={F.despesaPrimaria} />} />
          <BigStat label="Obrigatórias" value={`${F.obrigatoriasShare.value}%`} sub={<Src d={F.obrigatoriasShare} />} />
          <BigStat label="Juros da dívida (12 meses)" value={fmtBRL(F.juros12m.value)} sub={<Src d={F.juros12m} />} />
        </div>
        <Bars items={items} total={F.despesaPrimaria.value} color={c['series-a']} />
        <p className="text-xs text-muted">Despesas primárias no relatório bimestral de setembro de 2026 (MPO). Categorias aproximadas.</p>
      </Box>
      <Box title="Saúde e educação: pisos constitucionais (não são cláusulas pétreas)">
        <p>
          A Constituição obriga a União a gastar um mínimo em saúde (15% da receita corrente líquida, art. 198) e em
          educação (18% da receita de impostos, art. 212). São <strong className="text-ink">vinculações</strong>: o
          governo não pode gastar menos, mas elas podem ser alteradas por emenda constitucional, e já foram (EC 95/2016,
          LC 200/2023). <Term id="clausula-petrea">Cláusulas pétreas</Term> são outra coisa: só a federação, o voto, a
          separação dos poderes e os direitos individuais.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <BigStat label="Piso federal da saúde" value={fmtBRL(F.pisoSaude.value)} sub={<Src d={F.pisoSaude} />} />
          <BigStat label="Piso federal da educação" value={fmtBRL(F.pisoEducacao.value)} sub={<Src d={F.pisoEducacao} />} />
        </div>
      </Box>
      <Box title={`Os maiores ministérios (de ${F.ministerios.value})`}>
        <Bars items={MINISTRIES_2026.map((m) => ({ label: m.name, value: m.value }))} total={MINISTRIES_2026.reduce((a, m) => a + m.value, 0)} color={c['series-b']} />
        <p className="text-xs text-muted">LOA 2026 por órgão (MPO, Orçamento Cidadão). Previdência inclui benefícios do INSS.</p>
      </Box>
      <Box title="Como o orçamento é aprovado">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Plano plurianual (PPA) e Lei de Diretrizes Orçamentárias (LDO): metas e regras para o ano seguinte.</li>
          <li>Até 31 de agosto, o Executivo envia o projeto da Lei Orçamentária Anual (PLOA).</li>
          <li>O Congresso analisa na Comissão Mista de Orçamento, inclui emendas parlamentares (parte de execução obrigatória) e vota até dezembro.</li>
          <li>O presidente sanciona (pode vetar partes). Durante o ano, se a arrecadação cair, o governo bloqueia gastos (contingenciamento).</li>
          <li>A Lei de Responsabilidade Fiscal e o arcabouço fiscal limitam quanto o gasto pode crescer.</li>
        </ol>
        <p>
          Emendas parlamentares somam cerca de <strong className="text-ink">{fmtBRL(F.emendas.value)}</strong> em 2026 (<Src d={F.emendas} />): perto
          de um quarto de todo o orçamento livre do Executivo.
        </p>
      </Box>
    </div>
  )
}

// Promessas ---------------------------------------------------------------------------------

const VERDICT_STYLE = {
  economia: 'bg-surface-2 text-ink',
  cabe: 'bg-good text-white',
  dificil: 'bg-warn-bg text-warn-ink',
  'muito-dificil': 'bg-warn-bg text-warn-ink',
  impossivel: 'bg-bad text-white',
} as const

function Promises() {
  const [id, setId] = useState(PROMISES[0].id)
  const p = PROMISES.find((x) => x.id === id)!
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(PROMISES.map((x) => [x.id, x.param.default])))
  const x = values[id]
  const cost = p.cost(x)
  const v = verdict(cost)
  const f = fundingOptions(Math.abs(cost))
  return (
    <div className="space-y-4">
      <Box title="Promessa de campanha: possível ou impossível?">
        <p>
          Escolha uma promessa, ajuste o valor e veja quanto custa por ano e como teria de ser paga. O orçamento livre do
          governo federal em 2026 é de <strong className="text-ink">{fmtBRL(FINANCE.discricionarias.value)}</strong>; o PIB, cerca
          de {fmtBRL(PIB_2026)}.
        </p>
        <div className="flex flex-wrap gap-2">
          {PROMISES.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setId(q.id)}
              aria-pressed={q.id === id}
              className={`min-h-10 rounded-full border px-3 text-xs ${q.id === id ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink'}`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <Slider
          label={p.param.label}
          value={x}
          min={p.param.min}
          max={p.param.max}
          step={p.param.step}
          unit={p.param.unit}
          onChange={(n) => setValues((o) => ({ ...o, [id]: n }))}
        />
        <div className={`rounded-xl p-4 ${VERDICT_STYLE[v]}`}>
          <div className="text-xs font-bold tracking-widest uppercase">Veredito</div>
          <div className="mt-1 text-base font-semibold">{VERDICT_TEXT[v]}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BigStat label={cost < 0 ? 'Economia por ano' : 'Custo por ano'} value={fmtBRL(Math.abs(cost))} />
          <BigStat label="% do orçamento livre" value={`${fmtNum(f.discretionaryShare, 0)}%`} />
          <BigStat label="% da receita federal" value={`${fmtNum(f.revenueShare, 1)}%`} />
          <BigStat label="% do PIB" value={`${fmtNum(f.gdpShare, 2)}%`} />
        </div>
        <p className="text-xs text-muted">{p.explain(x)}</p>
      </Box>
      {cost > 0 && (
        <Box title="Como pagar?">
          <ul className="space-y-2">
            <li>
              <strong className="text-ink">Cortar outros gastos:</strong> equivale a {fmtNum(f.discretionaryShare, 0)}% de todo o orçamento livre
              do governo (investimentos, bolsas, custeio de ministérios).
              {f.discretionaryShare > 100 && ' Nem cortando tudo daria.'}
            </li>
            <li>
              <strong className="text-ink">Aumentar impostos:</strong> a carga tributária teria de subir cerca de {fmtNum(f.taxPoints, 1)} ponto(s)
              do PIB, o que exige aprovação no Congresso e pesa sobre empresas e consumidores.
            </li>
            <li>
              <strong className="text-ink">Pegar emprestado (dívida):</strong> em 10 anos, a dívida extra custaria cerca de{' '}
              {fmtBRL(f.debtInterest10y)} por ano só de juros, com juros reais de ~8%.
            </li>
            <li>
              <strong className="text-ink">Imprimir dinheiro:</strong> gera <Term id="inflacao">inflação</Term>, que corrói justamente a renda de quem a
              promessa queria ajudar. Veja a aba Inflação.
            </li>
          </ul>
        </Box>
      )}
    </div>
  )
}

// Custo da política -------------------------------------------------------------------------

function PoliticsCost() {
  const c = useThemeColors()
  const F = FINANCE
  const deputies = monthlyTotal(OFFICE_COSTS[0]) * 513 * 12
  const senators = monthlyTotal(OFFICE_COSTS[1]) * 81 * 12
  const compare = [
    { label: 'Subsídios e verbas dos 594 parlamentares federais', value: deputies + senators },
    { label: 'Orçamento total da Câmara dos Deputados', value: F.orcamentoCamara.value },
    { label: 'Orçamento total do Senado', value: F.orcamentoSenado.value },
    { label: 'Emendas parlamentares', value: F.emendas.value },
    { label: 'Bolsa Família', value: F.bolsaFamilia.value },
    { label: 'Aposentadorias do INSS', value: F.rgpsBeneficios.value },
    { label: 'Juros da dívida (12 meses)', value: F.juros12m.value },
  ]
  return (
    <div className="space-y-4">
      <Box title="Quanto custa cada cargo (por mês)">
        <p>
          O subsídio (salário) de deputados federais, senadores, presidente, vice, ministros de Estado e ministros do STF
          é o mesmo: <strong className="text-ink">{fmtBRLFull(F.subsidioFederal.value)}</strong> (<Src d={F.subsidioFederal} />), que é também o teto do
          serviço público. Além disso, parlamentares têm verbas para gabinete, assessores e despesas do mandato.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {OFFICE_COSTS.map((o) => (
            <div key={o.office} className="rounded-xl border border-line p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold text-ink">{o.office}</div>
                {o.seats && <div className="text-xs text-muted">{o.seats} {o.seats === 1 ? 'cargo' : 'cadeiras'}</div>}
              </div>
              <dl className="tnum mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt>Subsídio{o.office.includes('estadual') || o.office.includes('Vereador') ? ' (teto)' : ''}</dt>
                  <dd className="text-ink">{fmtBRLFull(o.salary)}</dd>
                </div>
                {o.allowances.map((a) => (
                  <div key={a.label} className="flex justify-between gap-2">
                    <dt>{a.label}</dt>
                    <dd className="shrink-0 text-ink">{fmtBRLFull(a.value)}</dd>
                  </div>
                ))}
                {o.allowances.length > 0 && (
                  <div className="flex justify-between gap-2 border-t border-line pt-1 font-semibold">
                    <dt className="text-ink">Total por mês</dt>
                    <dd className="text-ink">{fmtBRLFull(monthlyTotal(o))}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-2 text-xs">{o.staff}</p>
              <p className="mt-1 text-[11px] text-muted">{o.notes}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Fontes: <Src d={F.deputadoVerbaGabinete} />; <Src d={F.deputadoCotaMax} />; <Src d={F.senadorComissionadosMax} />; <Src d={F.senadorCotaFixa} />.
        </p>
      </Box>
      <Box title="Ordem de grandeza: o que pesa de verdade no orçamento">
        <p>
          O custo dos políticos é relevante e merece fiscalização, mas é pequeno perto dos grandes gastos. Cortar todos
          os salários do Congresso não pagaria um mês de juros da dívida.
        </p>
        <Bars items={compare} total={F.despesaPrimaria.value} color={c['series-b']} />
        <p className="text-xs text-muted">Percentuais sobre a despesa primária federal de 2026.</p>
      </Box>
    </div>
  )
}

// Previdência --------------------------------------------------------------------------------

function Pension() {
  const c = useThemeColors()
  const F = FINANCE
  const [x, setX] = useState<PensionInput>(DEFAULT_PENSION)
  const r = useMemo(() => simulatePension(x), [x])
  const unlinked = useMemo(() => simulatePension({ ...x, linkedToMinWage: false }), [x])
  const set = (patch: Partial<PensionInput>) => setX((v) => ({ ...v, ...patch }))
  const last = r[r.length - 1]
  return (
    <div className="space-y-4">
      <Box title="Por que a previdência preocupa">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BigStat label="Gasto com benefícios do INSS" value={fmtBRL(F.rgpsBeneficios.value)} sub={<Src d={F.rgpsBeneficios} />} />
          <BigStat label="Arrecadação do INSS" value={fmtBRL(F.rgpsArrecadacao.value)} sub={<Src d={F.rgpsArrecadacao} />} />
          <BigStat label="Déficit" value={fmtBRL(F.rgpsBeneficios.value - F.rgpsArrecadacao.value)} />
          <BigStat label="Benefícios de 1 salário mínimo" value={`${fmtNum((F.beneficiosPiso.value / F.beneficiosInss.value) * 100, 0)}%`} sub={<Src d={F.beneficiosPiso} />} />
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Envelhecimento:</strong> pessoas com 60 anos ou mais eram {fmtNum(F.idosos2023.value, 1)}% da população em 2023 e
            serão {fmtNum(F.idosos2070.value, 1)}% em 2070 (IBGE). Mais aposentados para cada pessoa trabalhando.
          </li>
          <li>
            <strong className="text-ink">Atrelamento ao salário mínimo:</strong> a Constituição garante que nenhum benefício seja menor que o mínimo
            (art. 201, § 2º). Quando o mínimo tem aumento real, {fmtNum((F.beneficiosPiso.value / 1e6), 1)} milhões de benefícios sobem junto: cada R$ 1 custa
            cerca de {fmtBRL(F.custoPorRealMinimo.value)} por ano (<Src d={F.custoPorRealMinimo} />).
          </li>
          <li>
            <strong className="text-ink">Reformas:</strong> a de 2019 (idade mínima e novas regras de cálculo) deve economizar cerca de{' '}
            {fmtBRL(F.reforma2019.value)} em 10 anos, mas não resolve o efeito do envelhecimento.
          </li>
        </ul>
        <p>
          <strong className="text-ink">O outro lado:</strong> o piso de um mínimo é uma das principais razões de a pobreza entre idosos ser baixa no Brasil e
          sustenta a economia de muitos municípios pequenos. Desvincular reduz o gasto, mas faz o valor dos benefícios
          perder para o crescimento da renda do resto da população. É uma escolha entre proteção e sustentabilidade.
        </p>
      </Box>
      <Card title="Projeção didática: gasto do INSS em % do PIB">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Slider label="Ganho real anual do salário mínimo" value={x.minWageReal} min={0} max={4} step={0.25} unit="%" onChange={(v) => set({ minWageReal: v })} />
            <Slider label="Crescimento do PIB" value={x.growth} min={0} max={4} step={0.25} unit="% a.a." onChange={(v) => set({ growth: v })} />
            <Slider label="Peso dos benefícios de 1 mínimo no gasto" value={x.minWageSpendingShare} min={20} max={70} step={5} unit="%" onChange={(v) => set({ minWageSpendingShare: v })} tooltip="Hipótese a calibrar: 69% dos benefícios valem 1 mínimo, mas pesam menos no valor total." />
          </div>
          <div>
            <div className="tnum mb-3 grid grid-cols-3 gap-2">
              <BigStat label={`Gasto em ${last.year}`} value={`${fmtNum(last.spending, 1)}% PIB`} />
              <BigStat label="Arrecadação" value={`${fmtNum(last.revenue, 1)}% PIB`} />
              <BigStat label="Sem atrelar ao mínimo" value={`${fmtNum(unlinked[unlinked.length - 1].spending, 1)}% PIB`} />
            </div>
            <TimeSeriesChart
              data={r.map((y, i) => ({ year: y.year, gasto: Number(y.spending.toFixed(2)), desv: Number(unlinked[i].spending.toFixed(2)), rec: Number(y.revenue.toFixed(2)) }))}
              series={[
                { key: 'gasto', label: 'Gasto (regra atual)', color: c['series-b'] },
                { key: 'desv', label: 'Gasto sem ganho real', color: c['series-a'] },
                { key: 'rec', label: 'Arrecadação', color: c['series-united'], dashed: true },
              ]}
              format={(v) => `${fmtNum(v, 1)}%`}
              xKey="year"
              height={220}
              fromZero
            />
            <p className="mt-2 text-xs text-muted">
              Modelo simplificado: número de benefícios cresce com a proporção de idosos (IBGE), benefícios de 1 mínimo
              seguem o ganho real do mínimo e a arrecadação acompanha o PIB. Não inclui reformas futuras nem mudanças no
              mercado de trabalho.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Dívida -----------------------------------------------------------------------------------

function Debt() {
  const c = useThemeColors()
  const F = FINANCE
  const [x, setX] = useState<DebtInput>(DEFAULT_DEBT)
  const r = useMemo(() => simulateDebt(x), [x])
  const set = (patch: Partial<DebtInput>) => setX((v) => ({ ...v, ...patch }))
  const stab = stabilizingPrimary(x)
  return (
    <div className="space-y-4">
      <Box title="Quanto o governo deve, e para quem">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BigStat label="Dívida bruta" value={`${fmtNum(F.dividaBrutaPib.value, 1)}% do PIB`} sub={<Src d={F.dividaBrutaPib} />} />
          <BigStat label="Dívida federal interna" value={fmtBRL(F.dpfInterna.value)} sub={<Src d={F.dpfInterna} />} />
          <BigStat label="Dívida federal externa" value={fmtBRL(F.dpfExterna.value)} sub={<Src d={F.dpfExterna} />} />
          <BigStat label="Selic" value={`${fmtNum(F.selic.value, 2)}%`} sub={<Src d={F.selic} />} />
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-ink">Dívida interna</strong> ({fmtNum((F.dpfInterna.value / F.dpf.value) * 100, 0)}% da dívida federal): títulos em reais
            comprados por bancos, fundos de investimento, fundos de pensão, seguradoras e pessoas (Tesouro Direto).
          </li>
          <li>
            <strong className="text-ink">Dívida externa</strong> ({fmtNum((F.dpfExterna.value / F.dpf.value) * 100, 0)}%): em dólares, sujeita ao câmbio: se o real
            se desvaloriza, ela fica mais cara.
          </li>
          <li>
            <strong className="text-ink">Juros:</strong> o setor público pagou {fmtBRL(F.juros12m.value)} em 12 meses ({fmtNum(F.jurosPib.value, 2)}% do PIB),
            mais do que todos os benefícios do INSS. Os juros são altos porque a Selic combate a inflação e porque
            investidores cobram mais de um país com dívida alta e histórico de inflação.
          </li>
        </ul>
      </Box>
      <Card title="Simulador: a dívida vai subir ou cair?">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Slider label="Juro real médio" value={x.realRate} min={0} max={12} step={0.5} unit="%" onChange={(v) => set({ realRate: v })} />
            <Slider label="Crescimento do PIB" value={x.growth} min={-2} max={6} step={0.25} unit="%" onChange={(v) => set({ growth: v })} />
            <Slider label="Saldo primário" value={x.primary} min={-4} max={5} step={0.25} unit="% do PIB" onChange={(v) => set({ primary: v })} tooltip="Receitas menos despesas, sem os juros. Positivo = superávit." />
          </div>
          <div>
            <div className="tnum mb-3 grid grid-cols-2 gap-2">
              <BigStat label={`Dívida em ${x.years} anos`} value={`${fmtNum(r[r.length - 1].debt, 0)}% do PIB`} />
              <BigStat label="Superávit que estabiliza a dívida" value={`${fmtNum(stab, 1)}% do PIB`} />
            </div>
            <TimeSeriesChart
              data={r.map((y) => ({ year: 2026 + y.year, d: Number(y.debt.toFixed(1)) }))}
              series={[{ key: 'd', label: 'Dívida bruta (% do PIB)', color: c['series-b'] }]}
              format={(v) => `${fmtNum(v, 0)}%`}
              xKey="year"
              height={220}
              fromZero
            />
            <p className="mt-2 text-xs text-muted">
              Regra: dívida do ano seguinte = dívida × (1 + juro real) ÷ (1 + crescimento) − saldo primário. Quando o juro
              real é maior que o crescimento, é preciso superávit só para a dívida não crescer.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
