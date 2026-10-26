// Escalas de cor para o mapa: sequencial (uma matiz, claro → escuro) e
// divergente (vermelho ↔ cinza ↔ azul). Passos da paleta de referência.

const SEQ_LIGHT = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']
const SEQ_DARK = [...SEQ_LIGHT].reverse()
const DIV_LIGHT = { neg: '#e34948', mid: '#f0efec', pos: '#2a78d6' }
const DIV_DARK = { neg: '#e66767', mid: '#383835', pos: '#3987e5' }

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const f = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${f(r1, r2)}, ${f(g1, g2)}, ${f(b1, b2)})`
}

export function isDark(): boolean {
  const root = document.documentElement
  const theme = root.getAttribute('data-theme')
  if (theme) return theme === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** t de 0 a 1 → cor sequencial. */
export function sequential(t: number, dark = isDark()): string {
  const ramp = dark ? SEQ_DARK : SEQ_LIGHT
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1)
  const i = Math.min(ramp.length - 2, Math.floor(x))
  return mix(ramp[i], ramp[i + 1], x - i)
}

/** v em [−max, max] → cor divergente com cinza no zero. */
export function diverging(v: number, max: number, dark = isDark()): string {
  const d = dark ? DIV_DARK : DIV_LIGHT
  const t = Math.max(-1, Math.min(1, max === 0 ? 0 : v / max))
  return t < 0 ? mix(d.mid, d.neg, -t) : mix(d.mid, d.pos, t)
}

export const SEQ_STOPS = SEQ_LIGHT
