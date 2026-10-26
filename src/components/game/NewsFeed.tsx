import { fmtPp } from '../../lib/format'
import type { CareerLog } from '../../model/career'
import type { YearResult } from '../../model/simulation'
import { Card } from '../ui'

interface NewsItem {
  icon: string
  title: string
  text: string
  tag: string
}

export function yearNews(r: YearResult, log: CareerLog[]): NewsItem[] {
  const items: NewsItem[] = []
  for (const l of log.filter((x) => x.year === r.t))
    items.push({ icon: l.good === false ? '✕' : l.good ? '★' : '•', title: l.title, text: l.text, tag: 'Sua carreira' })
  for (const e of r.climateEvents)
    items.push({
      icon: { seca: '☀', enchente: '☔', queimada: '🔥', apagao: '⚡', 'falta-agua': '💧' }[e.kind],
      title: e.title,
      text: `${e.explanation} Efeito no Bloco ${e.block}: ${fmtPp(e.effect)}`,
      tag: 'Clima',
    })
  for (const e of r.newEvents)
    items.push({
      icon: '📈',
      title: e.title,
      text: `${e.explanation} A: ${fmtPp(e.effectA, 1)}, B: ${fmtPp(e.effectB, 1)}`,
      tag: 'Economia',
    })
  for (const e of r.politicalEvents) items.push({ icon: e.kind === 'escandalo' ? '📰' : '🗳', title: e.title, text: e.explanation, tag: 'Política' })
  for (const e of r.institutionalEvents)
    items.push({
      icon: e.kind.startsWith('congresso') ? '🏛' : '⚖',
      title: e.title,
      text: e.explanation,
      tag: e.kind.startsWith('congresso') ? 'Congresso' : 'Tribunal',
    })
  return items
}

export function NewsFeed({ r, log }: { r: YearResult; log: CareerLog[] }) {
  const items = yearNews(r, log)
  return (
    <Card title={`Notícias de ${r.year}`} subtitle={r.t === 0 ? 'Ano de partida' : `${items.length} acontecimentos`}>
      {items.length === 0 ? (
        <p className="text-sm text-ink-2">{r.t === 0 ? 'Avance o ano para ver o que acontece.' : 'Um ano sem grandes acontecimentos.'}</p>
      ) : (
        <ul className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {items.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 w-5 shrink-0 text-center" aria-hidden>
                {n.icon}
              </span>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{n.tag}</div>
                <div className="text-sm font-semibold text-ink">{n.title}</div>
                <p className="text-xs leading-relaxed text-ink-2">{n.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
