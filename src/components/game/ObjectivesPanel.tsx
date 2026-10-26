import type { AchievementContext } from '../../model/achievements'
import { careerObjectives } from '../../model/objectives'

const KIND_LABEL = { principal: 'Principal', secundario: 'Secundário', oculto: 'Oculto' } as const
const ICON = { ok: '✅', falhou: '❌', pendente: '⏳' } as const

/** Objetivos pessoais do cargo; o oculto só aparece quando cumprido ou perdido no fim. */
export function ObjectivesPanel({ ctx }: { ctx: AchievementContext }) {
  const list = careerObjectives(ctx.career, ctx.input, ctx.results)
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <h3 className="text-sm font-semibold text-ink">🎯 Seus objetivos</h3>
      <ul className="mt-2 space-y-1.5">
        {list.map(({ objective: o, status }) => {
          const hidden = o.kind === 'oculto' && status === 'pendente'
          return (
            <li key={o.id} className="flex items-start gap-2 text-sm">
              <span aria-hidden>{ICON[status]}</span>
              <span className="flex-1">
                <span className={status === 'falhou' ? 'text-ink-2 line-through' : 'text-ink'}>{hidden ? 'Objetivo oculto: descubra jogando' : o.label}</span>
                <span className="ml-1 text-[11px] text-muted">
                  {KIND_LABEL[o.kind]} · {status === 'ok' ? 'cumprido' : status === 'falhou' ? 'perdido' : 'em aberto'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
