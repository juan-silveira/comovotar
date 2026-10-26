import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { glossary } from '../model/glossary'
import { fmtNum } from '../lib/format'

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-accent text-accent-ink hover:opacity-90',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
    ghost: 'text-ink-2 hover:bg-surface-2',
  }
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

/** Ícone "i" com texto explicativo; abre ao passar o mouse, focar ou tocar. */
export function InfoTip({ text, label = 'Mais informações' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-[11px] font-semibold text-muted hover:text-ink"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed font-normal text-ink-2 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  tooltip,
  onChange,
  disabled,
  badge,
  digits,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  tooltip?: string
  onChange: (v: number) => void
  disabled?: boolean
  badge?: ReactNode
  digits?: number
}) {
  const id = useId()
  const d = digits ?? (step >= 1 ? 0 : step >= 0.1 ? 1 : 2)
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex flex-wrap items-center gap-1.5 text-sm text-ink">
          {label}
          {tooltip && <InfoTip text={tooltip} label={`Sobre: ${label}`} />}
          {badge}
        </label>
        <span className="tnum shrink-0 text-sm font-semibold text-ink">
          {fmtNum(value, d)}
          {unit && <span className="ml-1 text-xs font-normal text-muted">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="tnum flex justify-between text-[11px] text-muted">
        <span>{fmtNum(min, d)}</span>
        <span>{fmtNum(max, d)}</span>
      </div>
    </div>
  )
}

export function CalibrateBadge() {
  return (
    <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warn-ink uppercase">
      hipótese a calibrar
    </span>
  )
}

/** Marcador de identidade do bloco: cor + letra, nunca só a cor. */
export function BlockTag({ block, children }: { block: 'A' | 'B' | 'U'; children?: ReactNode }) {
  const color = block === 'A' ? 'bg-series-a' : block === 'B' ? 'bg-series-b' : 'bg-united'
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden />
      <span>{children ?? (block === 'U' ? 'Brasil unido' : `Bloco ${block}`)}</span>
    </span>
  )
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className={`rounded-lg bg-warn-bg text-warn-ink ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} leading-relaxed`}
    >
      <strong>Exercício hipotético e educacional.</strong> O modelo é simplificado e seus resultados não são
      previsões. A Constituição Federal (art. 1º) define a República Federativa do Brasil como união indissolúvel
      dos estados, municípios e Distrito Federal.
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Termo técnico com explicação simples ao passar o mouse, focar ou tocar. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const g = glossary(id)
  if (!g) return <>{children}</>
  return (
    <span className="relative inline">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? tipId : undefined}
        className="cursor-help underline decoration-dotted decoration-from-font underline-offset-2"
      >
        {children ?? g.term}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute bottom-full left-0 z-40 mb-1 block w-64 rounded-lg border border-line bg-surface p-3 text-left text-xs leading-relaxed font-normal tracking-normal text-ink-2 normal-case shadow-lg"
        >
          <strong className="block text-ink">{g.term}</strong>
          {g.short}
          {g.example && <span className="mt-1 block text-muted">Ex.: {g.example}</span>}
        </span>
      )}
    </span>
  )
}
