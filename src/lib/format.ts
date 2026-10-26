// Formatação no padrão brasileiro.

const nf = (digits: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Usa o sinal de menos tipográfico (−) em vez do hífen. */
const minus = (s: string) => s.replace(/^-/, '−')

export function fmtNum(v: number, digits = 1): string {
  return minus(nf(digits).format(v))
}

export function fmtPct(v: number, digits = 1): string {
  return `${fmtNum(v, digits)}%`
}

/** Pontos percentuais com sinal explícito. */
export function fmtPp(v: number, digits = 2): string {
  const s = nf(digits).format(Math.abs(v))
  return `${v < 0 ? '−' : '+'}${s} p.p.`
}

export function fmtSignedPct(v: number, digits = 1): string {
  const s = nf(digits).format(Math.abs(v))
  return `${v < 0 ? '−' : '+'}${s}%`
}

/** R$ em trilhões/bilhões. */
export function fmtBRL(v: number): string {
  if (Math.abs(v) >= 1e12) return `R$ ${nf(2).format(v / 1e12)} tri`
  if (Math.abs(v) >= 1e9) return `R$ ${nf(1).format(v / 1e9)} bi`
  if (Math.abs(v) >= 1e6) return `R$ ${nf(1).format(v / 1e6)} mi`
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

/** Valor compacto para patrimônios: R$ 590 mil, R$ 1,4 mi. */
export function fmtBRLShort(v: number): string {
  if (Math.abs(v) >= 1e6) return fmtBRL(v)
  if (Math.abs(v) >= 1e4) return `R$ ${nf(0).format(v / 1e3)} mil`
  return fmtBRLFull(v)
}

export function fmtBRLFull(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

export function fmtPop(v: number): string {
  return `${nf(1).format(v / 1e6)} mi`
}

export function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

/**
 * Põe só a primeira letra em minúscula, para usar um rótulo no meio da frase.
 * Preserva siglas ("STF", "PIB", "PEC") e nomes próprios no restante
 * ("Presidente da República" → "presidente da República").
 */
export function lowerFirst(s: string): string {
  if (!s) return s
  const firstWord = s.split(/[\s(]/)[0]
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase() && /[A-ZÀ-Ý]/.test(firstWord)) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}
