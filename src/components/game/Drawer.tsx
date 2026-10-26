import { useEffect, useRef, type ReactNode } from 'react'

/** Painel lateral sobreposto (notícias, leis, carreira, gráficos). */
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="mt-0 mr-0 ml-auto h-dvh max-h-dvh w-[min(760px,100vw)] max-w-none border-l border-line bg-page p-0 text-ink backdrop:bg-black/40"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-page px-5 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} className="min-h-9 rounded-md border border-line px-3 text-sm">
          Fechar
        </button>
      </div>
      <div className="space-y-4 p-5">{open && children}</div>
    </dialog>
  )
}
