import { fmtBRLShort, fmtNum, lowerFirst } from '../../lib/format'
import type { CareerState } from '../../model/career'
import { ROLES } from '../../model/roles'
import { CASE_STAGES, exposureChance, statsFor, TSE_PATRIMONIO } from '../../model/wealth'

/** Patrimônio do jogador, comparado ao declarado pelos eleitos (TSE). */
export function WealthPanel({ career, mediaInfluence }: { career: CareerState; mediaInfluence: number }) {
  const office = career.office ?? career.setup.office
  const { stats, proxy } = statsFor(office)
  const start = career.wealthHistory[0]?.value ?? career.wealth
  const change = start > 0 ? (career.wealth / start - 1) * 100 : 0
  const declared = Math.max(0, career.wealth - career.illicitGains)
  const growth = TSE_PATRIMONIO.reelectedGrowth['deputado-federal']
  const risk = career.exposure > 0 && !career.criminalCase ? exposureChance(career.exposure, mediaInfluence) * 100 : 0
  const where =
    career.wealth < stats.p25 ? 'abaixo da maioria' : career.wealth > stats.p75 ? 'acima da maioria' : 'na faixa típica'

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <h3 className="text-sm font-semibold text-ink">💼 Seu patrimônio</h3>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="tnum text-2xl font-bold text-ink">{fmtBRLShort(career.wealth)}</span>
        {career.wealthHistory.length > 1 && (
          <span className="tnum text-xs text-ink-2">
            {change >= 0 ? '+' : '−'}
            {fmtNum(Math.abs(change), 0)}% desde o início
          </span>
        )}
      </div>
      <Sparkline points={career.wealthHistory.map((h) => h.value)} />
      {career.illicitGains > 0 && (
        <p className="mt-1 text-xs text-ink-2">
          Declarado à Justiça Eleitoral: <strong className="text-ink">{fmtBRLShort(declared)}</strong>. Os outros{' '}
          {fmtBRLShort(career.illicitGains)} vieram de propostas ilícitas e não aparecem na declaração.
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        {stats.group === 'eleitos' ? 'Eleitos' : 'Candidatos'} para {proxy ? 'o Senado (referência)' : lowerFirst(ROLES[office].title)} em{' '}
        {stats.year} declararam ao TSE, na mediana, <strong className="text-ink">{fmtBRLShort(stats.median)}</strong>; metade
        ficou entre {fmtBRLShort(stats.p25)} e {fmtBRLShort(stats.p75)}. Você está {where}.
      </p>
      {growth && (
        <p className="mt-1 text-xs leading-relaxed text-ink-2">
          Entre os {growth.n} deputados federais reeleitos em 2026, o patrimônio declarado cresceu{' '}
          {fmtNum(growth.medianGrowth * 100, 0)}% na mediana desde 2022, e {fmtNum(growth.grewShare * 100, 0)}% deles
          declararam mais bens. Isso não indica irregularidade: o salário de deputado, poupado, já explica boa parte; os bens
          são declarados pelo valor de compra, e heranças e investimentos também contam.
        </p>
      )}
      {career.criminalCase && (
        <p className="mt-2 rounded-lg bg-bad/10 p-2 text-xs text-ink">
          ⚖ Processo em andamento: <strong>{lowerFirst(CASE_STAGES[career.criminalCase.stage].title)}</strong>.
        </p>
      )}
      {risk > 0 && (
        <p className="mt-2 text-xs text-ink-2">
          Risco de o esquema vir à tona: cerca de <strong className="text-bad">{fmtNum(risk, 0)}% por ano</strong>, maior com uma imprensa mais atuante.
        </p>
      )}
      {career.ineligibleUntil !== null && career.t < career.ineligibleUntil && (
        <p className="mt-2 text-xs text-bad">Inelegível até {2023 + career.ineligibleUntil} (Lei da Ficha Limpa).</p>
      )}
      <p className="mt-2 text-[11px] text-muted">Fonte: {TSE_PATRIMONIO.source}. Só estatísticas por cargo, sem nomes.</p>
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const w = 240
  const h = 40
  const max = Math.max(...points)
  const min = Math.min(0, ...points)
  const x = (i: number) => (i / (points.length - 1)) * (w - 4) + 2
  const y = (v: number) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6)
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-10 w-full max-w-xs" preserveAspectRatio="none" role="img" aria-label={`Evolução do patrimônio: de ${fmtBRLShort(points[0])} para ${fmtBRLShort(points[points.length - 1])}`}>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={3} fill="var(--accent)" />
    </svg>
  )
}
