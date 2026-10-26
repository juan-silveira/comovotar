import { useEffect, useState } from 'react'

const VARS = [
  'surface',
  'ink',
  'ink-2',
  'muted',
  'grid',
  'axis',
  'series-a',
  'series-b',
  'series-united',
  'c-fiscal',
  'c-trade',
  'c-transition',
  'c-demography',
  'c-resources',
  'c-events',
] as const

export type ThemeColors = Record<(typeof VARS)[number], string>

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement)
  return Object.fromEntries(VARS.map((v) => [v, cs.getPropertyValue(`--${v}`).trim()])) as ThemeColors
}

/** Lê os tokens de cor do CSS (Recharts precisa de cores literais) e acompanha o tema. */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setColors(read())
    mq.addEventListener('change', update)
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      obs.disconnect()
    }
  }, [])
  return colors
}

export type ThemeChoice = 'auto' | 'light' | 'dark'

export function applyTheme(choice: ThemeChoice) {
  const el = document.documentElement
  if (choice === 'auto') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', choice)
  try {
    localStorage.setItem('sdr.theme', choice)
  } catch {
    // ignorado
  }
}

export function storedTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem('sdr.theme')
    if (v === 'light' || v === 'dark') return v
  } catch {
    // ignorado
  }
  return 'auto'
}
