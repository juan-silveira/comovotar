import { useEffect, useRef, useState } from 'react'
import { playCue } from '../../lib/settings'
import { ACHIEVEMENTS, unlockedAchievements, type Achievement, type AchievementContext } from '../../model/achievements'

/** Quadro de medalhas: conquistadas em cor, as demais apagadas (secretas aparecem como “???”). */
export function AchievementsPanel({ ctx, compact = false }: { ctx: AchievementContext; compact?: boolean }) {
  const unlocked = new Set(unlockedAchievements(ctx).map((a) => a.id))
  const list = compact ? ACHIEVEMENTS.filter((a) => unlocked.has(a.id)) : ACHIEVEMENTS
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <h3 className="text-sm font-semibold text-ink">
        🏅 Conquistas{' '}
        <span className="tnum font-normal text-ink-2">
          {unlocked.size}/{ACHIEVEMENTS.length}
        </span>
      </h3>
      {list.length === 0 ? (
        <p className="mt-1 text-xs text-ink-2">Nenhuma conquista nesta partida.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((a) => {
            const got = unlocked.has(a.id)
            const hidden = a.secret && !got
            return (
              <li
                key={a.id}
                className={`rounded-lg border p-2 ${got ? 'border-accent bg-surface-2' : 'border-line opacity-50'}`}
                title={hidden ? 'Conquista secreta' : a.description}
              >
                <div className={`text-xl ${got ? '' : 'grayscale'}`} aria-hidden>
                  {hidden ? '❔' : a.icon}
                </div>
                <div className="text-xs font-semibold text-ink">{hidden ? '???' : a.title}</div>
                {!compact && <div className="text-[11px] leading-snug text-ink-2">{hidden ? 'Conquista secreta.' : a.description}</div>}
                <span className="sr-only">{got ? 'conquistada' : 'não conquistada'}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Aviso flutuante quando uma conquista nova é desbloqueada. */
export function AchievementToasts({ ctx }: { ctx: AchievementContext }) {
  const ids = unlockedAchievements(ctx).map((a) => a.id)
  const seen = useRef<Set<string> | null>(null)
  const [queue, setQueue] = useState<Achievement[]>([])
  const key = ids.join(',')
  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(ids)
      return
    }
    const fresh = ACHIEVEMENTS.filter((a) => ids.includes(a.id) && !seen.current!.has(a.id))
    if (fresh.length === 0) return
    for (const a of fresh) seen.current.add(a.id)
    playCue('achievement')
    setQueue((q) => [...q, ...fresh])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => {
    if (queue.length === 0) return
    const id = setTimeout(() => setQueue((q) => q.slice(1)), 4000)
    return () => clearTimeout(id)
  }, [queue])
  const a = queue[0]
  if (!a) return null
  return (
    <div role="status" className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-accent bg-surface px-4 py-3 shadow-2xl">
        <span className="text-3xl" aria-hidden>
          {a.icon}
        </span>
        <div>
          <div className="text-[10px] font-bold tracking-widest text-muted uppercase">Conquista desbloqueada</div>
          <div className="text-sm font-bold text-ink">{a.title}</div>
          <div className="text-xs text-ink-2">{a.description}</div>
        </div>
      </div>
    </div>
  )
}
