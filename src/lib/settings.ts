// Preferências do jogador (acessibilidade, sons e vibração), guardadas no
// navegador e aplicadas ao documento.

import { useEffect, useState } from 'react'

export interface Settings {
  sound: boolean
  vibration: boolean
  textSize: 'normal' | 'grande' | 'maior'
  contrast: 'normal' | 'alto'
  reduceMotion: boolean
  easyReading: boolean
  /** Enviar contagens anônimas de uso e erros */
  analytics: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  sound: false,
  vibration: true,
  textSize: 'normal',
  contrast: 'normal',
  reduceMotion: false,
  easyReading: false,
  analytics: true,
}

const KEY = 'sdr.settings'
const listeners = new Set<(s: Settings) => void>()

export function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignorado
  }
  applySettings(s)
  for (const l of listeners) l(s)
}

/** Aplica tamanho do texto, contraste, movimento e leitura fácil ao documento. */
export function applySettings(s: Settings = loadSettings()) {
  const root = document.documentElement
  root.style.fontSize = s.textSize === 'maior' ? '125%' : s.textSize === 'grande' ? '112.5%' : ''
  root.toggleAttribute('data-high-contrast', s.contrast === 'alto')
  root.toggleAttribute('data-reduce-motion', s.reduceMotion)
  root.toggleAttribute('data-easy-reading', s.easyReading)
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [s, setS] = useState<Settings>(loadSettings)
  useEffect(() => {
    listeners.add(setS)
    return () => {
      listeners.delete(setS)
    }
  }, [])
  return [s, (patch) => saveSettings({ ...loadSettings(), ...patch })]
}

// Sons sintetizados (sem arquivos) ---------------------------------------------------------

type Cue = 'decision' | 'success' | 'fail' | 'achievement'

const NOTES: Record<Cue, [number, number][]> = {
  decision: [[660, 0.06]],
  success: [
    [523, 0.09],
    [784, 0.14],
  ],
  fail: [
    [330, 0.12],
    [247, 0.18],
  ],
  achievement: [
    [523, 0.08],
    [659, 0.08],
    [784, 0.08],
    [1047, 0.2],
  ],
}

let ctx: AudioContext | null = null

export function playCue(cue: Cue) {
  const s = loadSettings()
  if (s.vibration && 'vibrate' in navigator) {
    navigator.vibrate(cue === 'achievement' ? [30, 40, 30] : cue === 'fail' ? [60] : [12])
  }
  if (!s.sound) return
  try {
    ctx ??= new AudioContext()
    let t = ctx.currentTime
    for (const [freq, dur] of NOTES[cue]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + dur + 0.02)
      t += dur * 0.9
    }
  } catch {
    // áudio indisponível
  }
}
