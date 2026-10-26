import { useEffect, useState } from 'react'
import { fmtDate, fmtNum } from '../../lib/format'
import { BCB_SERIES, loadBcbMacro, type BcbLoad, type BcbPoint } from '../../lib/bcbData'

/** "aaaa-mm-dd" → "dd/mm/aaaa". */
const day = (iso: string) => iso.split('-').reverse().join('/')

const TEXT = {
  selic: 'Juro básico definido pelo Banco Central a cada 45 dias. Mais alto segura a inflação, mas encarece o crédito e a dívida pública.',
  ipca12: 'Quanto os preços subiram nos últimos 12 meses. A meta do Banco Central é 3%, com tolerância até 4,5%.',
  dollar: 'Preço do dólar. Mais alto encarece importados e combustíveis, mas ajuda quem exporta.',
} as const

/** Indicadores ao vivo do Banco Central (SGS), com cache de 12 horas. */
export function LiveMacro() {
  const [load, setLoad] = useState<BcbLoad | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    loadBcbMacro()
      .then((l) => alive && setLoad(l))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])
  if (error) return <p className="text-xs text-muted">Indicadores do Banco Central indisponíveis agora ({error}).</p>
  if (!load) return <p className="text-xs text-muted">Carregando indicadores do Banco Central…</p>
  const d = load.data
  return (
    <section aria-label="Indicadores atuais do Banco Central" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile id="selic" points={d.selic} format={(v) => `${fmtNum(v, 2)}%`} />
        <Tile id="ipca12" points={d.ipca12} format={(v) => `${fmtNum(v, 2)}%`} />
        <Tile id="dollar" points={d.dollar} format={(v) => `R$ ${fmtNum(v, 2)}`} />
      </div>
      <p className="text-[11px] text-muted">
        Fonte: Banco Central do Brasil, Sistema Gerenciador de Séries Temporais (séries 432, 13522 e 1). Consultado em{' '}
        {fmtDate(new Date(d.fetchedAt))}
        {load.origin === 'firebase' ? ' (cache compartilhado)' : load.origin === 'navegador' ? ' (cache do navegador)' : ''}.
      </p>
    </section>
  )
}

function Tile({ id, points, format }: { id: keyof typeof BCB_SERIES; points: BcbPoint[]; format: (v: number) => string }) {
  const last = points[points.length - 1]
  const first = points[0]
  if (!last) return null
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-ink-2">{BCB_SERIES[id].label}</div>
      <div className="tnum text-2xl font-bold text-ink">{format(last.value)}</div>
      <div className="text-[11px] text-muted">
        em {day(last.date)}
        {first && first !== last && ` · antes: ${format(first.value)} em ${day(first.date)}`}
      </div>
      <Spark points={points.map((p) => p.value)} label={`${BCB_SERIES[id].label}: de ${format(first.value)} a ${format(last.value)}`} />
      <p className="mt-1 text-xs leading-snug text-ink-2">{TEXT[id]}</p>
    </div>
  )
}

function Spark({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2) return null
  const w = 200
  const h = 32
  const min = Math.min(...points)
  const max = Math.max(...points)
  const x = (i: number) => (i / (points.length - 1)) * (w - 4) + 2
  const y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1 h-8 w-full" role="img" aria-label={label}>
      <path d={points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  )
}
