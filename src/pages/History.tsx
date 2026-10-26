import { useState } from 'react'
import { Card } from '../components/ui'
import { HISTORY } from '../model/history'

const KEY = 'sdr.historia'

function loadAnswers(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Modo história: decisões reais desde 1990, com o que aconteceu e o debate. */
export function History() {
  const [answers, setAnswers] = useState<Record<number, string>>(loadAnswers)
  const [i, setI] = useState(() => Math.min(Object.keys(loadAnswers()).length, HISTORY.length - 1))
  const card = HISTORY[i]
  const answer = answers[i]
  const same = Object.entries(answers).filter(([k, v]) => HISTORY[Number(k)]?.real === v).length
  const choose = (id: string) => {
    const next = { ...answers, [i]: id }
    setAnswers(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // ignorado
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Modo história</h1>
        <p className="mt-1 text-sm text-ink-2">
          Decisões reais do Brasil desde 1990. Escolha o que você faria e veja o que aconteceu, as consequências e o debate.
          Não há resposta certa: o objetivo é entender os dilemas de cada época.
        </p>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Linha do tempo">
        {HISTORY.map((h, k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === i}
            onClick={() => setI(k)}
            title={h.title}
            className={`tnum min-h-9 shrink-0 rounded-full border px-3 text-xs ${k === i ? 'border-accent bg-accent text-accent-ink' : answers[k] ? 'border-line bg-surface-2 text-ink' : 'border-line text-ink-2'}`}
          >
            {h.year}
          </button>
        ))}
      </div>
      <Card title={`${card.year} · ${card.title}`} subtitle={`${i + 1} de ${HISTORY.length}`}>
        <p className="text-sm leading-relaxed text-ink-2">{card.context}</p>
        <h3 className="mt-3 text-base font-semibold text-ink">{card.question}</h3>
        <div className="mt-2 grid gap-2">
          {card.options.map((o) => {
            const picked = answer === o.id
            const real = answer && card.real === o.id
            return (
              <button
                key={o.id}
                type="button"
                disabled={!!answer}
                onClick={() => choose(o.id)}
                className={`rounded-lg border p-3 text-left text-sm transition disabled:cursor-default ${picked ? 'border-accent bg-surface-2' : 'border-line hover:border-accent'}`}
              >
                <span className="text-ink">{o.label}</span>
                {picked && <span className="ml-2 text-xs text-ink-2">· sua escolha</span>}
                {real && <span className="ml-2 text-xs font-semibold text-ink">· o que o Brasil fez</span>}
              </button>
            )
          })}
        </div>
        {answer && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-ink">
              <strong>O que aconteceu: </strong>
              {card.happened}
            </p>
            <div>
              <strong className="text-ink">Consequências</strong>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
                {card.consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {card.debate.map((d) => (
                <p key={d} className="rounded-lg bg-surface-2 p-2 text-xs leading-relaxed text-ink-2">
                  {d}
                </p>
              ))}
            </div>
            <div className="flex justify-between">
              <button type="button" className="text-sm text-ink-2 underline" disabled={i === 0} onClick={() => setI(i - 1)}>
                ← Anterior
              </button>
              {i < HISTORY.length - 1 ? (
                <button type="button" className="text-sm font-semibold text-ink underline" onClick={() => setI(i + 1)}>
                  Próxima decisão →
                </button>
              ) : (
                <span className="text-sm text-ink-2">
                  Fim da linha do tempo: você escolheu como o Brasil em {same} de {HISTORY.length} decisões.
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
      {Object.keys(answers).length > 0 && (
        <button
          type="button"
          className="text-xs text-muted underline"
          onClick={() => {
            setAnswers({})
            setI(0)
            try {
              localStorage.removeItem(KEY)
            } catch {
              // ignorado
            }
          }}
        >
          Recomeçar a linha do tempo
        </button>
      )}
    </div>
  )
}
