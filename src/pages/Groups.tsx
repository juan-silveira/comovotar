import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { fmtNum } from '../lib/format'
import {
  CODE_RE,
  createGroup,
  getGroup,
  groupMissionId,
  groupResults,
  myGroups,
  vote,
  votes,
  type Group,
  type GroupResult,
} from '../lib/groups'
import type { Office } from '../model/bills'
import { registerMission, type MissionSpec, type ObjectiveSpec } from '../model/game'
import { SEPARATION_LABELS, type SeparationType } from '../model/params'
import { findPauta, PAUTAS } from '../model/pautas'
import { OFFICE_ICONS, OFFICE_ORDER, ROLES } from '../model/roles'

const field = 'mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2 text-sm text-ink'

export function Groups() {
  const [params, setParams] = useSearchParams()
  const code = (params.get('codigo') ?? '').toUpperCase()
  const { uid } = useAuth()
  const [input, setInput] = useState(code)
  const [mine, setMine] = useState<Group[]>([])
  useEffect(() => {
    if (uid) myGroups(uid).then(setMine).catch(() => setMine([]))
  }, [uid, code])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Turmas e grupos</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Crie um cenário com metas próprias e compartilhe o código com a turma ou com amigos. Todos jogam com o mesmo
          sorteio de crises e eventos, comparam resultados num placar próprio e votam numa pauta em debate.
        </p>
      </div>

      <Card title="Entrar com um código">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setParams({ codigo: input.toUpperCase() })
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC234"
            aria-label="Código da turma ou grupo"
            className="tnum min-h-11 w-40 rounded-md border border-line bg-surface px-3 text-center text-lg font-bold tracking-[0.3em] text-ink uppercase"
          />
          <Button variant="primary" disabled={!CODE_RE.test(input)}>
            Abrir
          </Button>
        </form>
      </Card>

      {CODE_RE.test(code) && <GroupView code={code} />}

      <GroupEditor onCreated={(g) => setParams({ codigo: g.code })} />

      {mine.length > 0 && (
        <Card title="Suas turmas e grupos">
          <ul className="divide-y divide-line">
            {mine.map((g) => (
              <li key={g.code} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <strong className="text-ink">{g.name}</strong> <span className="text-ink-2">· {g.spec.title}</span>
                </span>
                <button type="button" className="tnum font-bold tracking-widest text-ink underline" onClick={() => setParams({ codigo: g.code })}>
                  {g.code}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-sm text-ink-2">
        Professor ou professora? Veja os <Link to="/roteiros" className="font-semibold text-ink underline">roteiros de aula</Link>.
      </p>
    </div>
  )
}

function GroupView({ code }: { code: string }) {
  const navigate = useNavigate()
  const { uid } = useAuth()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [results, setResults] = useState<GroupResult[]>([])
  const [poll, setPoll] = useState<{ a: number; b: number; mine: 'a' | 'b' | null }>({ a: 0, b: 0, mine: null })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    setGroup(undefined)
    getGroup(code)
      .then((g) => alive && setGroup(g))
      .catch(() => alive && setGroup(null))
    groupResults(code)
      .then((r) => alive && setResults(r))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [code])
  useEffect(() => {
    if (group?.debate) votes(code, uid).then(setPoll).catch(() => {})
  }, [group, code, uid])

  if (group === undefined) return <p className="text-sm text-muted">Carregando…</p>
  if (group === null) return <p className="text-sm text-bad">Nenhuma turma ou grupo com o código {code}.</p>

  const pauta = group.debate ? findPauta(group.debate) : undefined
  const link = `${window.location.origin}/turmas?codigo=${code}`
  const play = () => {
    const id = groupMissionId(code)
    registerMission(id, group.spec)
    navigate(`/jogar?missao=${id}${group.office ? `&cargo=${group.office}&travar=1` : ''}`)
  }
  const total = poll.a + poll.b

  return (
    <Card title={`${group.kind === 'turma' ? '🏫' : '👥'} ${group.name}`} subtitle={`Código ${code}`}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <div className="font-semibold text-ink">{group.spec.title}</div>
          <p className="mt-1 text-ink-2">{group.spec.summary}</p>
          <p className="mt-1 text-xs text-muted">
            {group.spec.separationYear === null ? 'Brasil unido' : `Separação ${SEPARATION_LABELS[group.spec.separation].toLowerCase()}`} ·
            crises {group.spec.eventProbability >= 28 ? 'frequentes' : group.spec.eventProbability >= 18 ? 'moderadas' : 'raras'} ·{' '}
            {group.office ? `cargo: ${ROLES[group.office].title}` : 'cargo livre'} · {group.spec.objectives.length} metas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={play}>
            ▶ Jogar este cenário
          </Button>
          <Button
            onClick={async () => {
              try {
                if (navigator.share) await navigator.share({ title: group.name, text: `Entre no meu cenário do “Como votar?” (código ${code})`, url: link })
                else {
                  await navigator.clipboard.writeText(link)
                  setCopied(true)
                }
              } catch {
                // cancelado
              }
            }}
          >
            {copied ? '✓ Link copiado' : '↗ Convidar'}
          </Button>
        </div>

        {pauta && (
          <div className="rounded-lg border border-line p-3">
            <div className="text-xs font-bold tracking-widest text-muted uppercase">Debate da turma</div>
            <div className="mt-1 font-semibold text-ink">{pauta.title}</div>
            <p className="mt-1 text-xs text-ink-2">
              Leia os argumentos em <Link to="/economia?aba=pautas" className="underline">Pautas em debate</Link> e vote no lado que
              você acha mais convincente. {pauta.moral ? 'É um tema moral: não há resposta certa.' : ''}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['a', 'b'] as const).map((side) => {
                const n = side === 'a' ? poll.a : poll.b
                const pct = total ? Math.round((n / total) * 100) : 0
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={!uid}
                    onClick={async () => {
                      if (!uid) return
                      await vote(code, uid, side)
                      setPoll(await votes(code, uid))
                    }}
                    className={`relative overflow-hidden rounded-lg border p-3 text-left text-sm ${poll.mine === side ? 'border-accent' : 'border-line'}`}
                  >
                    <span className="absolute inset-y-0 left-0 bg-surface-2" style={{ width: `${pct}%` }} aria-hidden />
                    <span className="relative">
                      <strong className="text-ink">{side === 'a' ? (pauta.moral ? 'Argumentos de um lado' : 'A favor da proposta') : pauta.moral ? 'Argumentos do outro lado' : 'Contra a proposta'}</strong>
                      <span className="block text-xs text-ink-2">
                        {n} {n === 1 ? 'voto' : 'votos'} ({pct}%){poll.mine === side ? ' · seu voto' : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-bold tracking-widest text-muted uppercase">Placar</div>
          {results.length === 0 ? (
            <p className="mt-1 text-sm text-ink-2">Ninguém terminou uma partida ainda.</p>
          ) : (
            <div className="mt-1 overflow-x-auto">
              <table className="tnum w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-ink-2">
                    <th className="py-1 text-left font-medium">#</th>
                    <th className="py-1 text-left font-medium">Jogador</th>
                    <th className="py-1 text-left font-medium">Cargo</th>
                    <th className="py-1 text-right font-medium">Pontos</th>
                    <th className="py-1 text-right font-medium">Pobreza</th>
                    <th className="py-1 text-right font-medium">Desmatamento</th>
                    <th className="py-1 text-right font-medium">Leis</th>
                    <th className="py-1 text-right font-medium">Medalhas</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.uid} className={`border-t border-line ${r.uid === uid ? 'bg-surface-2' : ''}`}>
                      <td className="py-1 text-ink-2">{i + 1}</td>
                      <td className="py-1 font-bold tracking-widest text-ink">{r.initials}</td>
                      <td className="py-1 text-ink-2">{OFFICE_ICONS[r.office]}</td>
                      <td className="py-1 text-right font-semibold text-ink">{fmtNum(r.score, 0)}</td>
                      <td className="py-1 text-right text-ink-2">−{fmtNum(r.justice / 10, 1)} p.p.</td>
                      <td className="py-1 text-right text-ink-2">−{r.green}%</td>
                      <td className="py-1 text-right text-ink-2">{r.laws}</td>
                      <td className="py-1 text-right text-ink-2">{r.achievements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

type Goal = 'pc' | 'debt' | 'approval' | 'recovery' | 'balance'

const GOALS: { id: Goal; label: string; unit: string; def: number; separationOnly?: boolean }[] = [
  { id: 'pc', label: 'PIB per capita no máximo X% abaixo da trajetória esperada', unit: '%', def: 4 },
  { id: 'debt', label: 'Dívida/PIB até X% no fim', unit: '%', def: 105 },
  { id: 'approval', label: 'Aprovação do governo de pelo menos X% no fim', unit: '%', def: 40 },
  { id: 'recovery', label: 'Economia voltando a crescer até o ano X', unit: 'ano', def: 5, separationOnly: true },
  { id: 'balance', label: 'Blocos com desempenho a até X p.p. um do outro', unit: 'p.p.', def: 3, separationOnly: true },
]

function GroupEditor({ onCreated }: { onCreated: (g: Group) => void }) {
  const { uid } = useAuth()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'turma' | 'grupo'>('turma')
  const [title, setTitle] = useState('Brasil 2027: governar em tempos difíceis')
  const [summary, setSummary] = useState('Um cenário para a turma testar como as decisões de cada cargo mudam o país.')
  const [base, setBase] = useState<'unido' | SeparationType>('unido')
  const [freq, setFreq] = useState(20)
  const [office, setOffice] = useState<Office | ''>('')
  const [goals, setGoals] = useState<Record<Goal, number | null>>({ pc: 4, debt: 105, approval: null, recovery: null, balance: null })
  const [debate, setDebate] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const separated = base !== 'unido'
  const chosen = (Object.entries(goals) as [Goal, number | null][]).filter(([g, v]) => v !== null && (separated || !GOALS.find((x) => x.id === g)?.separationOnly))

  async function create() {
    if (!uid) return
    setBusy(true)
    setError('')
    try {
      const objectives: ObjectiveSpec[] = chosen.slice(0, 3).map(([g, v]) => {
        const n = v as number
        switch (g) {
          case 'pc':
            return { type: 'pc', block: separated ? 'ambos' : 'A', gap: n }
          case 'debt':
            return { type: 'debt', limit: n }
          case 'approval':
            return { type: 'approval', min: n }
          case 'recovery':
            return { type: 'recovery', t: n }
          case 'balance':
            return { type: 'balance', gap: n }
        }
      })
      const spec: MissionSpec = {
        title: title.trim().slice(0, 80) || 'Cenário da turma',
        summary: summary.trim().slice(0, 400),
        separation: separated ? base : 'intermediaria',
        separationYear: separated ? 1 : null,
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        eventProbability: freq,
        objectives,
      }
      const g = await createGroup(uid, { name: name.trim().slice(0, 60) || title.slice(0, 60), kind, spec, office: office || null, debate: debate || null })
      onCreated(g)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Criar turma ou grupo" subtitle="Editor de cenários: todos que entrarem com o código jogarão este cenário">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-ink">
          Nome da turma ou grupo
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="3º ano B, Escola Estadual…" className={field} />
        </label>
        <label className="text-sm text-ink">
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as 'turma' | 'grupo')} className={field}>
            <option value="turma">Turma (professor e alunos)</option>
            <option value="grupo">Grupo de amigos</option>
          </select>
        </label>
        <label className="text-sm text-ink sm:col-span-2">
          Título do cenário
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={field} />
        </label>
        <label className="text-sm text-ink sm:col-span-2">
          Contexto para os jogadores
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} rows={2} className={`${field} py-2`} />
        </label>
        <label className="text-sm text-ink">
          País
          <select value={base} onChange={(e) => setBase(e.target.value as 'unido' | SeparationType)} className={field}>
            <option value="unido">Brasil unido</option>
            {(Object.keys(SEPARATION_LABELS) as SeparationType[]).map((s) => (
              <option key={s} value={s}>
                E se o país se dividisse? Separação {SEPARATION_LABELS[s].toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink">
          Crises e eventos
          <select value={freq} onChange={(e) => setFreq(Number(e.target.value))} className={field}>
            <option value={10}>Raros</option>
            <option value={20}>Moderados</option>
            <option value={30}>Frequentes</option>
          </select>
        </label>
        <label className="text-sm text-ink">
          Cargo
          <select value={office} onChange={(e) => setOffice(e.target.value as Office | '')} className={field}>
            <option value="">Livre: cada um escolhe</option>
            {OFFICE_ORDER.map((o) => (
              <option key={o} value={o}>
                {ROLES[o].title} para todos
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink">
          Pauta para debate
          <select value={debate} onChange={(e) => setDebate(e.target.value)} className={field}>
            <option value="">Sem debate</option>
            {PAUTAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold text-ink">Metas (até 3)</legend>
        <div className="mt-1 space-y-1.5">
          {GOALS.filter((g) => separated || !g.separationOnly).map((g) => {
            const on = goals[g.id] !== null
            return (
              <label key={g.id} className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && chosen.length >= 3}
                  onChange={(e) => setGoals({ ...goals, [g.id]: e.target.checked ? g.def : null })}
                />
                <span className="flex-1">{g.label}</span>
                {on && (
                  <input
                    type="number"
                    value={goals[g.id] ?? g.def}
                    onChange={(e) => setGoals({ ...goals, [g.id]: Number(e.target.value) })}
                    className="tnum min-h-9 w-20 rounded-md border border-line bg-surface px-2 text-right text-ink"
                    aria-label={`Valor de X (${g.unit})`}
                  />
                )}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="primary" disabled={!uid || busy} onClick={create}>
          {busy ? 'Criando…' : 'Criar e gerar código'}
        </Button>
        {!uid && <span className="text-xs text-muted">Aguardando conexão…</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
    </Card>
  )
}
