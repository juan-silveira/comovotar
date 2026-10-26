import { useMemo, useState, type ReactNode } from 'react'
import { LiveMacro } from '../components/finance/LiveMacro'
import { useSearchParams } from 'react-router-dom'
import { TimeSeriesChart } from '../components/charts'
import { Card, Segmented, Slider, Term } from '../components/ui'
import { fmtBRLFull, fmtNum, fmtSignedPct } from '../lib/format'
import { useThemeColors } from '../lib/theme'
import { DEFAULT_FGTS_INPUT, FGTS_FACTS, simulateFgts, type FgtsInput } from '../model/fgts'
import { DEFAULT_INFLATION_INPUT, INFLATION_HISTORY, simulateInflation, type InflationInput } from '../model/inflation'
import { DEFAULT_WORKWEEK, PAUTAS, workweekImpact, type WorkweekInput } from '../model/pautas'
import { FINANCE_TABS, FinanceTab, type FinanceTabId } from '../components/finance/FinanceTabs'

type Tab = 'inflacao' | 'fgts' | 'pautas' | FinanceTabId

const TABS: { value: Tab; label: string }[] = [
  ...FINANCE_TABS,
  { value: 'inflacao', label: 'Inflação' },
  { value: 'fgts', label: 'FGTS' },
  { value: 'pautas', label: 'Pautas em debate' },
]

export function Economy() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('aba') as Tab | null) ?? TABS[0].value
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Economia na prática</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">
          Como o dinheiro público funciona de verdade: quanto custa a política, para onde vai o orçamento, por que
          algumas promessas são impossíveis, o que é inflação e como pautas do debate afetam a economia. As contas são
          simplificadas, para mostrar ordens de grandeza.
        </p>
      </div>
      <LiveMacro />
      <div className="overflow-x-auto">
        <Segmented label="Tema" value={tab} onChange={(v) => setParams({ aba: v })} options={TABS} />
      </div>
      {tab === 'inflacao' && <InflationTab />}
      {tab === 'fgts' && <FgtsTab />}
      {tab === 'pautas' && <PautasTab />}
      {FINANCE_TABS.some((t) => t.value === tab) && <FinanceTab tab={tab as FinanceTabId} />}
    </div>
  )
}

export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </Card>
  )
}

// Inflação ---------------------------------------------------------------------------

function InflationTab() {
  const c = useThemeColors()
  const [x, setX] = useState<InflationInput>(DEFAULT_INFLATION_INPUT)
  const r = useMemo(() => simulateInflation(x), [x])
  const last = r[r.length - 1]
  const set = (patch: Partial<InflationInput>) => setX((v) => ({ ...v, ...patch }))
  return (
    <div className="space-y-4">
      <Section title="O que é inflação?">
        <p>
          <Term id="inflacao">Inflação</Term> é o aumento geral dos preços. Com inflação de 10% ao ano, o que custava
          R$ 100 passa a custar R$ 110: o mesmo dinheiro compra menos. Ela acontece quando há mais dinheiro e mais
          demanda do que produtos e serviços disponíveis, quando custos sobem (energia, combustível, câmbio) ou quando
          todos esperam que os preços subam e reajustam antes (inércia).
        </p>
        <p>
          Quem mais perde é quem tem renda fixa e não consegue se proteger: o salário só é reajustado uma vez por ano,
          enquanto os preços sobem todo mês. Por isso a inflação é chamada de “imposto sobre os pobres”.
        </p>
        <p>
          No Brasil, o <strong className="text-ink">Banco Central</strong> persegue uma meta de inflação (3% ao ano,
          com tolerância de 1,5 ponto) subindo os <Term id="juros">juros</Term> quando os preços aceleram: crédito mais
          caro reduz a demanda. Isso freia a inflação, mas também a economia e encarece a dívida pública.
        </p>
      </Section>
      <Card title="Simulador: e se o governo pagasse as contas imprimindo dinheiro?">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <Slider label="Gasto pago com emissão de moeda" value={x.moneyFinancing} min={0} max={10} step={0.5} unit="% do PIB" onChange={(v) => set({ moneyFinancing: v })} tooltip="Dinheiro criado para pagar despesas, sem aumento de produção correspondente." />
            <Slider label="Déficit financiado com dívida" value={x.debtDeficit} min={0} max={8} step={0.5} unit="% do PIB" onChange={(v) => set({ debtDeficit: v })} tooltip="Gasto acima da arrecadação, pago com empréstimos: aumenta a demanda." />
            <Slider label="Juro real do Banco Central" value={x.realRate} min={0} max={12} step={0.5} unit="%" onChange={(v) => set({ realRate: v })} />
            <Slider label="Credibilidade do Banco Central" value={x.credibility * 100} min={0} max={100} step={5} unit="%" onChange={(v) => set({ credibility: v / 100 })} tooltip="Se as pessoas acreditam que a inflação voltará à meta, reajustam menos os preços." />
            <Slider label="Indexação (reajustes automáticos)" value={x.indexation * 100} min={0} max={100} step={5} unit="%" onChange={(v) => set({ indexation: v / 100 })} tooltip="Contratos, salários e aluguéis corrigidos automaticamente pela inflação passada fazem a inflação se repetir." />
            <Slider label="Reajuste anual do salário" value={x.wageIndexation} min={0} max={20} step={0.5} unit="%" onChange={(v) => set({ wageIndexation: v })} />
          </div>
          <div>
            <div className="tnum mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Inflação no ano 10" value={`${fmtNum(last.inflation, 1)}%`} />
              <Stat label="Preços em 10 anos" value={`×${fmtNum(last.priceIndex / 100, 2)}`} />
              <Stat label="R$ 100 guardados valem" value={fmtBRLFull(last.purchasingPower)} />
              <Stat label="Salário real" value={fmtSignedPct(last.realWage - 100)} />
            </div>
            <TimeSeriesChart
              data={r.map((y) => ({ year: y.year, inf: Number(y.inflation.toFixed(2)), meta: x.target }))}
              series={[
                { key: 'inf', label: 'Inflação', color: c['series-b'] },
                { key: 'meta', label: 'Meta', color: c['series-united'], dashed: true, noLabel: true },
              ]}
              format={(v) => `${fmtNum(v, 1)}%`}
              xKey="year"
              height={220}
              fromZero
            />
            <p className="mt-2 text-xs text-muted">
              Modelo didático, não uma previsão. Experimente: aumente a emissão de moeda e reduza a credibilidade; depois
              suba os juros.
            </p>
          </div>
        </div>
      </Card>
      <Section title="A lição brasileira">
        <ul className="space-y-1">
          {INFLATION_HISTORY.map((h) => (
            <li key={h.year} className="tnum">
              <strong className="text-ink">{h.year}:</strong> IPCA de {fmtNum(h.ipca, 2)}%. {h.note}
            </li>
          ))}
        </ul>
        <p>
          Antes do Plano Real, o país teve décadas de inflação alta, alimentada por déficits financiados com emissão de
          moeda e por indexação generalizada. O real combinou uma transição (URV), corte de gastos e, depois, metas de
          inflação, câmbio flutuante e metas fiscais.
        </p>
      </Section>
    </div>
  )
}

// FGTS ---------------------------------------------------------------------------------

function FgtsTab() {
  const c = useThemeColors()
  const [x, setX] = useState<FgtsInput>(DEFAULT_FGTS_INPUT)
  const r = useMemo(() => simulateFgts(x), [x])
  const last = r[r.length - 1]
  const set = (patch: Partial<FgtsInput>) => setX((v) => ({ ...v, ...patch }))
  return (
    <div className="space-y-4">
      <Section title="O que é o FGTS e por que ele existe">
        <p>{FGTS_FACTS.what}</p>
        <p>{FGTS_FACTS.why}</p>
        <ul className="list-disc space-y-0.5 pl-5">
          {FGTS_FACTS.uses.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
        <p>{FGTS_FACTS.stf}</p>
      </Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Por que pode ser bom">
          <ul className="list-disc space-y-1 pl-5">
            {FGTS_FACTS.pros.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Section>
        <Section title="Por que pode ser ruim">
          <ul className="list-disc space-y-1 pl-5">
            {FGTS_FACTS.cons.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </Section>
      </div>
      <Card title="Calculadora: quanto o seu FGTS rende?">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <Slider label="Salário bruto" value={x.salary} min={1500} max={20000} step={100} unit="R$" onChange={(v) => set({ salary: v })} />
            <Slider label="Anos de carteira assinada" value={x.years} min={1} max={35} step={1} onChange={(v) => set({ years: v })} />
            <Slider label="Inflação média" value={x.inflation} min={2} max={12} step={0.5} unit="% a.a." onChange={(v) => set({ inflation: v })} />
            <Slider label="Ganho real da alternativa" value={x.alternativeReal} min={0} max={8} step={0.5} unit="% a.a." onChange={(v) => set({ alternativeReal: v })} tooltip="Ex.: títulos públicos atrelados à inflação; rendimentos passados não garantem futuros." />
          </div>
          <div>
            <div className="tnum mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Depositado" value={fmtBRLFull(last.deposited)} />
              <Stat label="Regra antiga (TR + 3%)" value={fmtBRLFull(last.oldRule)} />
              <Stat label="Mínimo IPCA (STF)" value={fmtBRLFull(last.ipcaFloor)} />
              <Stat label="Alternativa" value={fmtBRLFull(last.alternative)} />
            </div>
            <TimeSeriesChart
              data={r.map((y) => ({ year: y.year, old: Math.round(y.oldRule), ipca: Math.round(y.ipcaFloor), alt: Math.round(y.alternative) }))}
              series={[
                { key: 'old', label: 'Regra antiga', color: c['series-b'] },
                { key: 'ipca', label: 'Mínimo IPCA', color: c['series-a'] },
                { key: 'alt', label: 'Alternativa', color: c['series-united'], dashed: true },
              ]}
              format={fmtBRLFull}
              axisFormat={(v) => `${fmtNum(v / 1000, 0)} mil`}
              xKey="year"
              height={220}
              fromZero
            />
            <p className="mt-2 text-xs text-muted">
              A diferença entre as linhas mostra o custo de um rendimento baixo, e por que o STF exigiu ao menos a
              inflação. A “alternativa” tem risco e depende de o trabalhador poupar por conta própria.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Pautas ---------------------------------------------------------------------------------

function PautasTab() {
  const [w, setW] = useState<WorkweekInput>(DEFAULT_WORKWEEK)
  const impact = workweekImpact(w)
  const set = (patch: Partial<WorkweekInput>) => setW((v) => ({ ...v, ...patch }))
  const [pautaId, setPautaId] = useState(PAUTAS[0].id)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pauta">
        {PAUTAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pautaId === p.id}
            onClick={() => setPautaId(p.id)}
            className={`min-h-9 rounded-full border px-3 text-sm ${pautaId === p.id ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink hover:bg-surface-2'}`}
          >
            {p.title}
          </button>
        ))}
      </div>
      {PAUTAS.filter((p) => p.id === pautaId).map((p) => (
        <div key={p.id} className="space-y-4">
          {p.moral && (
            <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-ink">
              Tema moral e controverso. O jogo apresenta o que diz a lei e os argumentos dos dois lados, sem indicar uma resposta
              certa e sem pontuar a sua opinião.
            </p>
          )}
          <Section title={p.title}>
            <p>
              <strong className="text-ink">Hoje: </strong>
              {p.today}
            </p>
            <p>
              <strong className="text-ink">A proposta: </strong>
              {p.proposal}
            </p>
            <p>
              <strong className="text-ink">Como mudar: </strong>
              {p.howToChange}
            </p>
          </Section>
          <div className="grid gap-4 md:grid-cols-2">
            <Section title={p.moral ? 'Argumentos de um lado' : 'Por que é defendida'}>
              <ul className="space-y-1.5">
                {p.pros.map((x) => (
                  <li key={x.text}>
                    <strong className="text-ink">{x.who}:</strong> {x.text}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={p.moral ? 'Argumentos do outro lado' : 'Por que é criticada'}>
              <ul className="space-y-1.5">
                {p.cons.map((x) => (
                  <li key={x.text}>
                    <strong className="text-ink">{x.who}:</strong> {x.text}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
          {p.id === 'escala-6x1' && (
            <Card title="Calculadora: quanto muda o custo para quem emprega?">
              <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                <div className="space-y-4">
                  <Slider label="Jornada atual" value={w.current} min={36} max={48} step={1} unit="h/semana" onChange={(v) => set({ current: v })} />
                  <Slider label="Nova jornada" value={w.proposed} min={30} max={44} step={1} unit="h/semana" onChange={(v) => set({ proposed: v })} />
                  <Slider label="Ganho de produtividade por hora" value={w.productivityGain} min={0} max={25} step={1} unit="%" onChange={(v) => set({ productivityGain: v })} tooltip="Quanto cada hora rende a mais com trabalhadores mais descansados. Incerto: estudos variam." />
                  <Slider label="Peso dos salários no custo da empresa" value={w.laborShare} min={10} max={70} step={5} unit="%" onChange={(v) => set({ laborShare: v })} tooltip="Alto em serviços e comércio; baixo em indústrias automatizadas." />
                </div>
                <div className="tnum grid grid-cols-2 content-start gap-3">
                  <Stat label="Custo de cada hora" value={fmtSignedPct(impact.hourlyCost)} />
                  <Stat label="Custo por unidade produzida" value={fmtSignedPct(impact.unitLaborCost)} />
                  <Stat label="Custo total da empresa" value={fmtSignedPct(impact.totalCost)} />
                  <Stat label="Contratações para manter o horário" value={`+${fmtNum(impact.extraHires, 0)}% do quadro`} />
                  <p className="col-span-2 text-xs leading-relaxed text-muted">
                    Se a produtividade subir tanto quanto a jornada cai, o custo por unidade não muda. Abaixo disso, a
                    empresa absorve o custo, repassa aos preços, contrata menos ou automatiza. Os números reais dependem
                    do setor e da transição.
                  </p>
                </div>
              </div>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Section title={p.effectsTitle ?? 'Impacto na economia'}>
              <ul className="list-disc space-y-1 pl-5">
                {p.economy.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </Section>
            <Section title="Experiências">
              <ul className="list-disc space-y-1 pl-5">
                {p.experiences.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              {p.billId && <p className="text-xs text-muted">No jogo, esta proposta pode ser apresentada e votada no Legislativo.</p>}
            </Section>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-[11px] text-ink-2">{label}</div>
      <div className="text-lg font-bold text-ink">{value}</div>
    </div>
  )
}
