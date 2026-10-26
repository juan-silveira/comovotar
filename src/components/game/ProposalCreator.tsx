import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aiConfigured, loadAi, PROVIDERS, type ChatMessage } from '../../lib/ai'
import { fmtBRL, fmtNum } from '../../lib/format'
import { analyzeProposal, askAboutProposal, type ProposalContext } from '../../lib/proposalAi'
import { NORM_LABELS } from '../../model/bills'
import { legalRef } from '../../model/constitution'
import { customBillId, manualAnalysis, sanitizeAnalysis, type CustomBill, type ManualProposal } from '../../model/customBill'
import { SPECTRUM_LABELS, type Spectrum } from '../../model/legislature'
import { Button, Slider } from '../ui'

const EXAMPLES: Record<ProposalContext['level'], string> = {
  municipal: 'Instalar wi-fi gratuito em todas as praças e terminais de ônibus da cidade.',
  estadual: 'Comprar uma antena de internet via satélite para cada escola cívico-militar do estado.',
  federal: 'Criar uma bolsa mensal de R$ 300 para estudantes do ensino médio que tiverem frequência acima de 85%.',
}

const STANCE_LABEL = { apoia: 'Tende a apoiar', dividido: 'Dividido', resiste: 'Tende a resistir' } as const

export function ProposalCreator({
  ctx,
  politicalContext,
  onCreate,
}: {
  ctx: ProposalContext
  politicalContext: string
  onCreate: (c: CustomBill) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<CustomBill | null>(null)
  const [manual, setManual] = useState(false)
  const hasAi = aiConfigured()
  const provider = PROVIDERS[loadAi().provider].label

  async function analyze() {
    setBusy(true)
    setError('')
    try {
      setDraft(await analyzeProposal(text.trim(), ctx))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (draft) return <Review draft={draft} setDraft={setDraft} ctx={ctx} politicalContext={politicalContext} onCreate={onCreate} onBack={() => setDraft(null)} />

  return (
    <div className="space-y-3">
      <label className="block text-sm text-ink">
        Escreva a sua ideia, do jeito que falaria com alguém
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={1200}
          placeholder={`Ex.: ${EXAMPLES[ctx.level]}`}
          className="mt-1 block w-full rounded-lg border border-line bg-surface p-3 text-sm"
        />
      </label>
      {hasAi ? (
        <Button variant="primary" disabled={busy || text.trim().length < 10} onClick={analyze} className="w-full">
          {busy ? 'Analisando…' : `Analisar com IA (${provider})`}
        </Button>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
          Para a IA analisar competência, custo, prós e contras e a reação de cada partido, configure um provedor (Gemini,
          OpenAI, Anthropic, DeepSeek…) na página <Link to="/assistente" className="underline">Assistente</Link>. A chave fica só no seu
          navegador. Ou monte a proposta pelo formulário abaixo.
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="button" onClick={() => setManual((m) => !m)} className="text-xs text-ink-2 underline">
        {manual ? 'Fechar formulário' : 'Montar sem IA (formulário)'}
      </button>
      {manual && (
        <ManualForm
          text={text}
          onDone={(m) => {
            setDraft({
              id: customBillId(`${ctx.level}:${m.text || m.title}`),
              text: m.text || m.title,
              analysis: manualAnalysis(m, ctx.level),
              level: ctx.level,
              territoryGdp: ctx.territoryGdp,
              createdBy: 'formulario',
            })
          }}
        />
      )}
    </div>
  )
}

function ManualForm({ text, onDone }: { text: string; onDone: (m: ManualProposal) => void }) {
  const [m, setM] = useState<ManualProposal>({ text, title: '', area: 'Outros', annualCostBRL: 0, econ: 0, popularity: 0.3, pros: '', cons: '' })
  const set = (p: Partial<ManualProposal>) => setM((v) => ({ ...v, ...p }))
  return (
    <div className="space-y-3 rounded-xl border border-line p-3">
      <label className="block text-sm text-ink">
        Título
        <input value={m.title} onChange={(e) => set({ title: e.target.value })} className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2" />
      </label>
      <label className="block text-sm text-ink">
        Área
        <select value={m.area} onChange={(e) => set({ area: e.target.value })} className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2">
          {['Educação', 'Saúde', 'Transporte', 'Segurança pública', 'Meio ambiente', 'Impostos', 'Trabalho', 'Assistência social', 'Infraestrutura', 'Tecnologia', 'Outros'].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-ink">
        Custo anual estimado (R$)
        <input
          type="number"
          value={m.annualCostBRL}
          onChange={(e) => set({ annualCostBRL: Number(e.target.value) || 0 })}
          className="tnum mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
        />
      </label>
      <Slider label="Orientação econômica (mais Estado ↔ mais mercado)" value={m.econ} min={-1} max={1} step={0.1} onChange={(v) => set({ econ: v })} digits={1} />
      <Slider label="Popularidade esperada" value={m.popularity} min={-1} max={1} step={0.1} onChange={(v) => set({ popularity: v })} digits={1} />
      <label className="block text-sm text-ink">
        Argumentos a favor (um por linha)
        <textarea value={m.pros} onChange={(e) => set({ pros: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border border-line bg-surface p-2 text-sm" />
      </label>
      <label className="block text-sm text-ink">
        Argumentos contra (um por linha)
        <textarea value={m.cons} onChange={(e) => set({ cons: e.target.value })} rows={3} className="mt-1 block w-full rounded-md border border-line bg-surface p-2 text-sm" />
      </label>
      <p className="text-xs text-muted">Sem IA, o jogo não verifica competência nem problemas constitucionais: a CCJ e o tribunal só reagem ao que você informar.</p>
      <Button variant="primary" disabled={!m.title.trim()} onClick={() => onDone(m)} className="w-full">
        Revisar proposta
      </Button>
    </div>
  )
}

function Review({
  draft,
  setDraft,
  ctx,
  politicalContext,
  onCreate,
  onBack,
}: {
  draft: CustomBill
  setDraft: (c: CustomBill) => void
  ctx: ProposalContext
  politicalContext: string
  onCreate: (c: CustomBill) => void
  onBack: () => void
}) {
  const a = draft.analysis
  const patch = (p: Partial<typeof a>) => setDraft({ ...draft, analysis: sanitizeAnalysis({ ...a, ...p }) })
  const pct = (a.annualCostBRL / ctx.territoryGdp) * 100
  const competent = a.competentLevel === ctx.level
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs text-ink-2 underline">
        ← Voltar e reescrever
      </button>
      <label className="block text-sm text-ink">
        Título
        <input value={a.title} onChange={(e) => patch({ title: e.target.value })} className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2 font-semibold" />
      </label>
      <p className="text-sm text-ink-2">{a.summary}</p>

      <div className={`rounded-xl p-3 text-sm ${competent && a.constitutionalIssues.length === 0 ? 'bg-surface-2' : 'bg-warn-bg text-warn-ink'}`}>
        <div className="font-semibold">
          {draft.createdBy === 'formulario'
            ? 'Competência não verificada (modo sem IA)'
            : competent ? '✓ Seu cargo pode propor este tema' : `⚠ O tema é de competência ${a.competentLevel === 'federal' ? 'da União' : a.competentLevel === 'estadual' ? 'dos estados' : 'dos municípios'}`}
        </div>
        <p className="mt-1 text-xs">{a.competenceExplanation}</p>
        <p className="mt-1 text-xs">
          Tipo de norma: {NORM_LABELS[a.requiredNorm]}.{' '}
          {a.executiveInitiativeOnly ? `Só o chefe do Executivo pode propor: ${a.initiativeExplanation}` : 'Qualquer parlamentar pode propor.'}
        </p>
        {a.constitutionalIssues.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
            {a.constitutionalIssues.map((i, k) => (
              <li key={k}>
                {i.text} {i.ref && <span className="opacity-80">({legalRef(i.ref)?.ref})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-line p-3 text-sm">
        <label className="block text-ink">
          Custo anual estimado (R$)
          <input
            type="number"
            value={Math.round(a.annualCostBRL)}
            onChange={(e) => patch({ annualCostBRL: Number(e.target.value) || 0 })}
            className="tnum mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
          />
        </label>
        <p className="tnum mt-1 text-xs text-ink-2">
          {fmtBRL(Math.abs(a.annualCostBRL))} por ano {a.annualCostBRL < 0 ? 'de receita' : ''} = {fmtNum(Math.abs(pct), 3)}% do PIB de {ctx.territoryName}.
        </p>
        <p className="mt-1 text-xs text-muted">{a.costExplanation}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-ink">
          <span className="text-[11px] font-bold tracking-widest text-good uppercase">A favor</span>
          <textarea
            value={a.pros.join('\n')}
            onChange={(e) => patch({ pros: e.target.value.split('\n') })}
            rows={5}
            className="mt-1 block w-full rounded-md border border-line bg-surface p-2 text-xs"
          />
        </label>
        <label className="block text-sm text-ink">
          <span className="text-[11px] font-bold tracking-widest text-bad uppercase">Contra</span>
          <textarea
            value={a.cons.join('\n')}
            onChange={(e) => patch({ cons: e.target.value.split('\n') })}
            rows={5}
            className="mt-1 block w-full rounded-md border border-line bg-surface p-2 text-xs"
          />
        </label>
      </div>

      {a.partyReactions.length > 0 && (
        <div>
          <div className="mb-1 text-[11px] font-bold tracking-widest text-muted uppercase">Reação provável dos campos políticos</div>
          <ul className="space-y-1.5 text-xs">
            {a.partyReactions.map((r, k) => (
              <li key={k} className="rounded-lg bg-surface-2 p-2">
                <strong className="text-ink">{SPECTRUM_LABELS[r.spectrum as Spectrum]}</strong>: {STANCE_LABEL[r.stance]}. <span className="text-ink-2">{r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {draft.createdBy === 'ia' && aiConfigured() && <ProposalChat draft={draft} ctx={ctx} politicalContext={politicalContext} />}

      <Button variant="primary" onClick={() => onCreate(draft)} className="w-full">
        Usar esta proposta
      </Button>
      <p className="text-[11px] text-muted">Análise gerada {draft.createdBy === 'ia' ? 'por IA e pode conter erros' : 'a partir do formulário'}. Os números são limitados a faixas plausíveis pelo jogo.</p>
    </div>
  )
}

function ProposalChat({ draft, ctx, politicalContext }: { draft: CustomBill; ctx: ProposalContext; politicalContext: string }) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const suggestions = ['Quem vai resistir e por quê?', 'Como conseguir votos da oposição?', 'O que mudar para evitar problemas no tribunal?']
  async function send(text: string) {
    if (!text.trim()) return
    const next = [...history, { role: 'user' as const, text }]
    setHistory(next)
    setQ('')
    setBusy(true)
    setError('')
    try {
      const answer = await askAboutProposal(next, draft.text, draft.analysis, ctx, politicalContext)
      setHistory([...next, { role: 'model', text: answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Conversar com a IA sobre a proposta</summary>
      <div className="mt-2 flex flex-wrap gap-1">
        {suggestions.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="min-h-9 rounded-full border border-line px-3 text-[11px] text-ink-2">
            {s}
          </button>
        ))}
      </div>
      <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
        {history.map((m, i) => (
          <div key={i} className={`rounded-lg p-2 text-xs leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-surface-2 text-ink' : 'text-ink-2'}`}>
            {m.text}
          </div>
        ))}
        {busy && <p className="text-xs text-muted">Pensando…</p>}
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(q)
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sua pergunta" aria-label="Pergunta sobre a proposta" className="min-h-10 flex-1 rounded-md border border-line bg-surface px-2 text-sm" />
        <Button disabled={busy || !q.trim()}>Enviar</Button>
      </form>
    </details>
  )
}
