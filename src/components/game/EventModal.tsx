import { useEffect, useRef } from 'react'
import type { CareerState, TurnItem } from '../../model/career'
import type { OFFICE_ORDER } from '../../model/roles'
import { AgendaItem } from './AgendaPanel'

const HEADER: Record<TurnItem['kind'], { label: string; icon: string }> = {
  card: { label: 'Decisão de governo', icon: '🏛' },
  'vote-card': { label: 'Votação', icon: '🗳' },
  'stf-card': { label: 'Tribunal', icon: '⚖' },
  quiz: { label: 'Pode ou não pode?', icon: '❓' },
  crise: { label: 'Crise', icon: '🌪' },
  'ai-bill-vote': { label: 'Projeto em votação', icon: '📜' },
  'bill-pending': { label: 'Tramitação', icon: '📜' },
  career: { label: 'Carreira', icon: '🎯' },
  separatismo: { label: 'Crise federativa', icon: '🧭' },
  orcamento: { label: 'Orçamento do ano', icon: '💰' },
  emendas: { label: 'Suas emendas', icon: '🧾' },
  promessa: { label: 'Campanha', icon: '📣' },
  oferta: { label: 'Proposta nos bastidores', icon: '🤫' },
  defesa: { label: 'Processo', icon: '⚖' },
  campanha: { label: 'Dinheiro da campanha', icon: '💸' },
  cpi: { label: 'Pedido de CPI', icon: '🔎' },
  'cpi-governo': { label: 'CPI contra o governo', icon: '🔎' },
  impeachment: { label: 'Pedido de impeachment', icon: '⚠️' },
  'impeachment-voto': { label: 'Impeachment', icon: '🗳' },
  'crise-global': { label: 'O mundo lá fora', icon: '🌍' },
}

/** Carta de evento em pop-up, uma decisão por vez. */
export function EventModal({
  open,
  items,
  career,
  onResolve,
  onCareer,
  onClose,
}: {
  open: boolean
  items: TurnItem[]
  career: CareerState
  onResolve: (item: TurnItem, optionId: string) => void
  onCareer: (office: (typeof OFFICE_ORDER)[number] | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const item = items[0]
  const show = open && !!item
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (show && !d.open) d.showModal()
    if (!show && d.open) d.close()
  }, [show])
  const h = item ? HEADER[item.kind] : null
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-label={h?.label}
      className="m-auto w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      {item && h && (
        <div>
          <div className="flex items-center justify-between gap-2 bg-accent px-5 py-3 text-accent-ink">
            <span className="text-sm font-bold tracking-wide uppercase">
              <span aria-hidden>{h.icon}</span> {h.label}
            </span>
            <span className="text-xs opacity-80">
              {items.length > 1 ? `+${items.length - 1} na fila` : 'última decisão do ano'}
            </span>
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-5">
            <AgendaItem item={item} career={career} onResolve={(id) => onResolve(item, id)} onCareer={onCareer} />
          </div>
          <div className="flex justify-end border-t border-line px-5 py-2">
            <button type="button" onClick={onClose} className="text-xs text-ink-2 underline">
              Ver o painel e decidir depois
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
