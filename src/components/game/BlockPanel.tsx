import { fmtBRLFull, fmtNum, fmtPop, fmtSignedPct } from '../../lib/format'
import { CABINET_LABELS } from '../../model/institutions'
import type { Params } from '../../model/params'
import type { BlockId, YearResult } from '../../model/simulation'
import { BlockTag, Card, InfoTip } from '../ui'

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-2">
        <span className="flex items-center gap-1">
          {label}
          {hint && <InfoTip text={hint} label={`Sobre: ${label}`} />}
        </span>
        <span className="tnum font-semibold text-ink">{fmtNum(value, 0)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-line py-1 text-xs last:border-0">
      <span className="text-ink-2">{label}</span>
      <span className="tnum text-right font-semibold text-ink">{value}</span>
    </div>
  )
}

/** Resumo de um bloco ao lado do mapa. Os dois blocos usam o mesmo componente. */
export function BlockPanel({
  block,
  r,
  label,
  params,
}: {
  block: BlockId
  r: YearResult
  label: string
  params: Params
}) {
  const b = r[block]
  const inst = b.institutions
  const cabinet = block === 'A' ? params.cabinetA : params.cabinetB
  return (
    <Card title={<BlockTag block={block}>{`Bloco ${block} · ${label}`}</BlockTag>}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-ink-2">PIB per capita</div>
          <div className="tnum text-lg font-bold text-ink">{fmtBRLFull(b.gdpPc)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-2">Crescimento</div>
          <div className="tnum text-lg font-bold text-ink">{r.t === 0 ? '—' : fmtSignedPct(b.growth, 2)}</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Meter
          label="Aprovação do governo"
          value={b.approval}
          hint="Reage ao crescimento, a crises, escândalos e ao gasto em ano eleitoral, amplificada pela influência da mídia."
        />
        <Meter
          label="Apoio no Congresso"
          value={inst.congressSupport}
          hint="Depende da aprovação, do perfil do ministério e das emendas. Define a chance de aprovar propostas."
        />
        <Meter
          label="Segurança jurídica"
          value={inst.legalCertainty}
          hint="Previsibilidade das regras e decisões. Cai com mudanças de entendimento do tribunal e decisões individuais de impacto; afeta juros e investimento."
        />
      </div>
      <div className="mt-3">
        <Line label="Bolsa (2023 = 100)" value={`${fmtNum(inst.market, 0)} (${fmtSignedPct(inst.marketReturn, 1)})`} />
        <Line label="Dívida pública" value={`${fmtNum(b.debt, 0)}% do PIB`} />
        <Line label="Juro real" value={`${fmtNum(b.interestRate, 1)}%`} />
        <Line label="População" value={fmtPop(b.pop)} />
        <Line label="Saldo migratório" value={`${b.netMigration >= 0 ? '+' : '−'}${fmtNum(Math.abs(b.netMigration) / 1000, 0)} mil/ano`} />
        <Line label="vs. sem separação" value={fmtSignedPct(b.vsNoSeparation)} />
        <Line label="Ministério" value={CABINET_LABELS[cabinet]} />
        <Line label="Tribunal: indicados por afinidade" value={`${inst.alignedSeats} de 11`} />
      </div>
    </Card>
  )
}
