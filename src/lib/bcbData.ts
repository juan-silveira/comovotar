// Indicadores do Banco Central (SGS) com cache em três níveis, como os do
// IBGE: navegador, Firestore (público) e a API do Banco Central, consultada
// no máximo a cada 12 horas.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

export interface BcbPoint {
  date: string
  value: number
}

export interface BcbMacro {
  fetchedAt: string
  /** Meta da Selic, % ao ano (série 432) */
  selic: BcbPoint[]
  /** IPCA acumulado em 12 meses, % (série 13522) */
  ipca12: BcbPoint[]
  /** Dólar comercial, venda, R$ (série 1) */
  dollar: BcbPoint[]
}

/** Séries e quantos dias para trás buscar (a API limita “últimos N” a 20 valores; usa intervalo de datas). */
export const BCB_SERIES = {
  selic: { code: 432, label: 'Selic (meta)', unit: '% ao ano', days: 400 },
  ipca12: { code: 13522, label: 'IPCA em 12 meses', unit: '%', days: 730 },
  dollar: { code: 1, label: 'Dólar comercial', unit: 'R$', days: 90 },
} as const

const MAX_AGE = 12 * 3600 * 1000
const KEY = 'sdr.bcb-macro'

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd". */
function isoDate(br: string): string {
  const [d, m, y] = br.split('/')
  return `${y}-${m}-${d}`
}

const brDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

async function fetchSeries(code: number, days: number): Promise<BcbPoint[]> {
  const end = new Date()
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000)
  const res = await fetch(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${brDate(start)}&dataFinal=${brDate(end)}`,
  )
  if (!res.ok) throw new Error(`Banco Central respondeu ${res.status}`)
  const rows = (await res.json()) as { data: string; valor: string }[]
  return rows.map((r) => ({ date: isoDate(r.data), value: Number(r.valor) })).filter((p) => Number.isFinite(p.value))
}

/** A API do Banco Central falha de forma intermitente: tenta de novo antes de desistir. */
async function withRetry<T>(f: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await f()
    } catch (e) {
      last = e
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw last
}

export async function fetchBcbMacro(): Promise<BcbMacro> {
  // Em sequência, para não disparar o limite de requisições da API.
  const out: Partial<Record<keyof typeof BCB_SERIES, BcbPoint[]>> = {}
  for (const id of Object.keys(BCB_SERIES) as (keyof typeof BCB_SERIES)[]) {
    try {
      out[id] = await withRetry(() => fetchSeries(BCB_SERIES[id].code, BCB_SERIES[id].days))
    } catch {
      out[id] = []
    }
  }
  if (!out.selic?.length && !out.ipca12?.length && !out.dollar?.length) throw new Error('Banco Central indisponível')
  const selic = out.selic ?? []
  // A série da meta Selic é diária e repete o valor: guarda só as mudanças e o último dia útil.
  const today = new Date().toISOString().slice(0, 10)
  const past = selic.filter((p) => p.date <= today)
  const changes = past.filter((p, i) => i === 0 || p.value !== past[i - 1].value)
  const last = past[past.length - 1]
  const compact = last && changes[changes.length - 1] !== last ? [...changes, last] : changes
  return { fetchedAt: new Date().toISOString(), selic: compact, ipca12: out.ipca12 ?? [], dollar: out.dollar ?? [] }
}

const fresh = (m: BcbMacro | null) => !!m && Date.now() - new Date(m.fetchedAt).getTime() < MAX_AGE

export interface BcbLoad {
  data: BcbMacro
  origin: 'navegador' | 'firebase' | 'bcb'
}

export async function loadBcbMacro(): Promise<BcbLoad> {
  let local: BcbMacro | null = null
  try {
    local = JSON.parse(localStorage.getItem(KEY) ?? 'null') as BcbMacro | null
  } catch {
    local = null
  }
  if (local && fresh(local)) return { data: local, origin: 'navegador' }
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'datasets', 'bcb-macro'))
      const cloud = snap.exists() ? (snap.data().data as BcbMacro) : null
      if (cloud && fresh(cloud)) {
        save(cloud)
        return { data: cloud, origin: 'firebase' }
      }
    } catch {
      // segue para a API
    }
  }
  try {
    const data = await fetchBcbMacro()
    save(data)
    if (db && auth?.currentUser && data.selic.length && data.ipca12.length && data.dollar.length) {
      try {
        await setDoc(doc(db, 'datasets', 'bcb-macro'), { data, fetchedAtTs: serverTimestamp() })
      } catch {
        // outro jogador renovou o cache há pouco
      }
    }
    return { data, origin: 'bcb' }
  } catch (e) {
    if (local) return { data: local, origin: 'navegador' }
    throw e
  }
}

function save(m: BcbMacro) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    // ignorado
  }
}
