import { useState } from 'react'
import { legalRef } from '../../model/constitution'

/** Etiqueta clicável com o dispositivo legal e seu resumo. */
export function LegalRefChip({ id }: { id: string }) {
  const [open, setOpen] = useState(false)
  const r = legalRef(id)
  if (!r) return null
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded border border-line px-1.5 py-0.5 text-[11px] text-ink-2 hover:bg-surface-2"
      >
        {r.ref}
      </button>
      {open && (
        <span
          role="note"
          className="absolute bottom-full left-0 z-30 mb-1 block w-72 rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-ink-2 shadow-lg"
        >
          <strong className="block text-ink">{r.title}</strong>
          {r.summary}
          {r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 block font-semibold text-ink underline">
              Ler o texto oficial ↗
            </a>
          )}
        </span>
      )}
    </span>
  )
}
