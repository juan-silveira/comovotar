import { useState } from 'react'
import { Button, Card } from '../components/ui'
import { aiChat, aiConfigured, clearAi, loadAi, PROVIDERS, saveAi, type AiProvider, type AiSettings, type ChatMessage } from '../lib/ai'
import { ASSISTANT_SYSTEM } from '../lib/assistantPrompt'
import { ROLES } from '../model/roles'
import { useGame } from '../state/game'

const SUGGESTIONS = [
  'O que um deputado federal pode e não pode fazer?',
  'Como funciona a derrubada de um veto?',
  'Por que meu projeto foi barrado na CCJ?',
  'Qual a diferença entre lei ordinária e complementar?',
  'O que é um jabuti?',
]

export function Assistant() {
  const { career, results } = useGame()
  const [settings, setSettings] = useState<AiSettings>(loadAi)
  const [saved, setSaved] = useState(aiConfigured())
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const info = PROVIDERS[settings.provider]

  function context(): string {
    if (!career) return 'Nenhuma partida em andamento.'
    const r = results[career.t]
    const last = career.bills[career.bills.length - 1]
    return [
      `Cargo: ${career.office ? ROLES[career.office].title : 'sem mandato'}; UF ${career.setup.uf}${career.setup.municipio ? `, município ${career.setup.municipio.name}` : ''}.`,
      `Ano ${r?.year}; popularidade ${Math.round(career.approval)}%; capital político ${career.capital}.`,
      last ? `Último projeto: ${last.state.log.map((l) => l.title).join(' → ')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  async function send(text: string) {
    if (!text.trim()) return
    const next = [...history, { role: 'user' as const, text }]
    setHistory(next)
    setInput('')
    setBusy(true)
    setError('')
    try {
      const answer = await aiChat(next, `${ASSISTANT_SYSTEM}\n\nSituação atual da partida:\n${context()}`)
      setHistory([...next, { role: 'model', text: answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Assistente de IA (opcional)</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          O jogo funciona inteiramente sem IA. Com ela, você pode criar propostas próprias e o jogo analisa competência,
          custos, prós e contras e a reação dos partidos. Também pode tirar dúvidas em linguagem livre. Use a sua própria
          chave do provedor que preferir.
        </p>
      </div>
      <Card title="Provedor e chave">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Provedor">
            {(Object.keys(PROVIDERS) as AiProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={settings.provider === p}
                onClick={() => {
                  setSettings({ ...settings, provider: p, model: PROVIDERS[p].model, baseUrl: PROVIDERS[p].baseUrl })
                  setSaved(false)
                }}
                className={`min-h-10 rounded-full border px-3 text-sm ${settings.provider === p ? 'border-accent bg-accent text-accent-ink' : 'border-line text-ink'}`}
              >
                {PROVIDERS[p].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-2">
            {info.note}{' '}
            <a href={info.keyUrl} target="_blank" rel="noreferrer" className="underline">
              Obter uma chave
            </a>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-ink">
              Chave da API
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => {
                  setSettings({ ...settings, apiKey: e.target.value.trim() })
                  setSaved(false)
                }}
                autoComplete="off"
                className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
              />
            </label>
            <label className="text-sm text-ink">
              Modelo
              <input
                value={settings.model}
                onChange={(e) => {
                  setSettings({ ...settings, model: e.target.value.trim() })
                  setSaved(false)
                }}
                placeholder="nome do modelo"
                className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
              />
            </label>
            {(settings.provider === 'compat' || settings.provider === 'openai' || settings.provider === 'deepseek') && (
              <label className="text-sm text-ink sm:col-span-2">
                Endereço base da API
                <input
                  value={settings.baseUrl}
                  onChange={(e) => {
                    setSettings({ ...settings, baseUrl: e.target.value.trim() })
                    setSaved(false)
                  }}
                  className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
                />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!settings.apiKey || !settings.model}
              onClick={() => {
                saveAi(settings)
                setSaved(true)
              }}
            >
              {saved ? '✓ Salvo neste navegador' : 'Salvar'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearAi()
                setSettings({ ...settings, apiKey: '' })
                setSaved(false)
              }}
            >
              Apagar chave
            </Button>
          </div>
          <p className="rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
            🔒 A chave fica <strong className="text-ink">somente neste navegador</strong>, no armazenamento local do seu dispositivo. Ela
            nunca é enviada ao servidor do jogo nem salva no banco de dados: as chamadas vão direto do seu navegador para o
            provedor escolhido. Não use em computadores compartilhados e apague a chave quando terminar.
          </p>
        </div>
      </Card>
      <Card title="Conversa">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => send(s)} className="min-h-9 rounded-full border border-line px-3 text-xs text-ink-2 hover:bg-surface-2">
              {s}
            </button>
          ))}
        </div>
        <div className="max-h-[480px] space-y-3 overflow-y-auto">
          {history.map((m, i) => (
            <div key={i} className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-surface-2 text-ink' : 'border border-line text-ink-2'}`}>
              <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{m.role === 'user' ? 'Você' : 'Assistente'}</div>
              {m.text}
            </div>
          ))}
          {busy && <p className="text-sm text-muted">Pensando…</p>}
          {error && <p className="text-sm text-bad">{error}</p>}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre o jogo, a Constituição ou o processo legislativo"
            aria-label="Pergunta"
            className="min-h-10 flex-1 rounded-md border border-line bg-surface px-3"
          />
          <Button variant="primary" disabled={busy || !aiConfigured()}>
            Enviar
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted">Respostas de IA podem conter erros; confira nas referências da página Instituições.</p>
      </Card>
    </div>
  )
}
