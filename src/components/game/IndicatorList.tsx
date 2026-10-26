import { useState, type ReactNode } from 'react'
import { useThemeColors } from '../../lib/theme'
import { glossary } from '../../model/glossary'
import { GROUP_LABELS, type Group, type Indicator, type Status } from './indicators'

const ORDER: Group[] = ['economia', 'politica', 'congresso', 'justica', 'clima', 'sociedade']

const STATUS: Record<Status, { label: string; dot: string }> = {
  bom: { label: 'Bom', dot: '#0ca30c' },
  atencao: { label: 'Atenção', dot: '#fab219' },
  ruim: { label: 'Ruim', dot: '#d03b3b' },
  neutro: { label: '', dot: 'transparent' },
}

function Spark({ series, color }: { series: number[]; color: string }) {
  if (series.length < 2) return null
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-28" aria-hidden preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Painel do país: indicadores agrupados por tema. Tocar abre a explicação,
 * as relações de causa e efeito e as ações possíveis para o cargo.
 */
export function IndicatorList({ nodes, actions }: { nodes: Indicator[]; actions?: (n: Indicator) => ReactNode }) {
  const c = useThemeColors()
  const [open, setOpen] = useState<string | null>(null)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return (
    <div className="space-y-4">
      {ORDER.map((g) => {
        const items = nodes.filter((n) => n.group === g)
        if (items.length === 0) return null
        return (
          <section key={g} aria-labelledby={`grp-${g}`}>
            <h3 id={`grp-${g}`} className="mb-1.5 text-[11px] font-bold tracking-widest text-muted uppercase">
              {GROUP_LABELS[g]}
            </h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {items.map((n) => {
                const isOpen = open === n.id
                const st = STATUS[n.status]
                const dependsOn = nodes.filter((m) => m.affects.includes(n.id))
                const g2 = n.term ? glossary(n.term) : undefined
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : n.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg" aria-hidden>
                        {n.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{n.label}</span>
                        {st.label && (
                          <span className="flex items-center gap-1 text-[11px] text-ink-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: st.dot }} aria-hidden />
                            {st.label}
                          </span>
                        )}
                      </span>
                      <span className="tnum shrink-0 text-right text-sm font-bold text-ink">{n.value}</span>
                      <span className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden>
                        ›
                      </span>
                    </button>
                    {isOpen && (
                      <div className="space-y-2 bg-surface-2/60 px-3 pt-1 pb-3 text-xs leading-relaxed text-ink-2">
                        {g2 && (
                          <p>
                            <strong className="text-ink">O que é?</strong> {g2.short}
                          </p>
                        )}
                        <p>{n.text}</p>
                        {n.series && n.series.length > 1 && (
                          <div className="flex items-center gap-2">
                            <span>Últimos anos:</span>
                            <Spark series={n.series} color={c.ink} />
                          </div>
                        )}
                        {n.affects.length > 0 && (
                          <p>
                            <strong className="text-ink">Afeta:</strong>{' '}
                            {n.affects
                              .map((id) => byId.get(id)?.label)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                        {dependsOn.length > 0 && (
                          <p>
                            <strong className="text-ink">Depende de:</strong> {dependsOn.map((m) => m.label).join(', ')}
                          </p>
                        )}
                        {actions?.(n)}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
