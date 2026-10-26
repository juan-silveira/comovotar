import { useMemo } from 'react'
import { SPECTRUM_ORDER, type VoteResult } from '../../model/legislature'

type Seat = { x: number; y: number; vote: 'yes' | 'no' | 'absent'; party: string }

/** Posições das cadeiras num semicírculo, da esquerda para a direita. */
function layout(total: number): { x: number; y: number; angle: number }[] {
  const rows = Math.max(2, Math.min(14, Math.round(Math.sqrt(total / 4))))
  const inner = 0.45
  const radii = Array.from({ length: rows }, (_, i) => inner + ((1 - inner) * i) / Math.max(1, rows - 1))
  const sum = radii.reduce((a, r) => a + r, 0)
  const counts = radii.map((r) => Math.max(1, Math.round((total * r) / sum)))
  // Ajusta o arredondamento para bater o total, na fileira externa.
  counts[rows - 1] += total - counts.reduce((a, c) => a + c, 0)
  const pts: { x: number; y: number; angle: number }[] = []
  radii.forEach((r, i) => {
    const n = counts[i]
    for (let k = 0; k < n; k++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1)
      pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle })
    }
  })
  return pts.sort((a, b) => b.angle - a.angle)
}

/** Plenário em semicírculo: cada ponto é uma cadeira, acesa com o voto em sequência. */
export function Hemicycle({ vote }: { vote: VoteResult }) {
  const seats: Seat[] = useMemo(() => {
    const parties = [...vote.parties].sort((a, b) => SPECTRUM_ORDER.indexOf(a.party.spectrum) - SPECTRUM_ORDER.indexOf(b.party.spectrum))
    const order: Omit<Seat, 'x' | 'y'>[] = []
    for (const p of parties) {
      for (let i = 0; i < p.yes; i++) order.push({ vote: 'yes', party: p.party.id })
      for (let i = 0; i < p.no; i++) order.push({ vote: 'no', party: p.party.id })
      for (let i = 0; i < p.absent; i++) order.push({ vote: 'absent', party: p.party.id })
    }
    const pos = layout(order.length)
    return order.map((s, i) => ({ ...s, x: pos[i].x, y: pos[i].y }))
  }, [vote])
  const n = seats.length
  const r = Math.max(0.008, Math.min(0.03, 1.1 / Math.sqrt(n) / 2.2))
  const fill = { yes: 'var(--good)', no: 'var(--bad)', absent: 'var(--axis)' }
  const step = Math.min(6, 1200 / Math.max(1, n))

  return (
    <figure className="mt-2">
      <svg
        viewBox="-1.05 -1.05 2.1 1.12"
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`${vote.chamber}: ${vote.yes} votos sim, ${vote.no} não, ${vote.absent} ausentes; mínimo para aprovar ${vote.required}.`}
      >
        <g transform="scale(1,-1)">
          {seats.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={r}
              fill={fill[s.vote]}
              className="hemi-seat"
              style={{ animationDelay: `${i * step}ms` }}
            >
              <title>{`${s.party}: ${s.vote === 'yes' ? 'sim' : s.vote === 'no' ? 'não' : 'ausente'}`}</title>
            </circle>
          ))}
        </g>
        <text x={0} y={-0.1} textAnchor="middle" className="fill-ink" style={{ fontSize: 0.14, fontWeight: 800 }}>
          {vote.yes} × {vote.no}
        </text>
        <text x={0} y={0.0} textAnchor="middle" className="fill-ink-2" style={{ fontSize: 0.055 }}>
          mínimo: {vote.required}
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-good" aria-hidden /> Sim {vote.yes}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-bad" aria-hidden /> Não {vote.no}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-full" style={{ background: 'var(--axis)' }} aria-hidden /> Ausentes {vote.absent}
        </span>
        <span className={`font-semibold ${vote.passed ? 'text-good' : 'text-bad'}`}>{vote.passed ? '✓ Aprovado' : '✕ Rejeitado'}</span>
      </figcaption>
      <p className="mt-0.5 text-center text-[11px] text-muted">Partidos da esquerda para a direita do espectro.</p>
    </figure>
  )
}
