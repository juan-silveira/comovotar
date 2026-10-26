// Métricas anônimas de aprendizagem (contagens agregadas por dia, sem
// identificar ninguém) e registro de erros. O jogador pode desligar nas
// Configurações.

import { addDoc, collection, doc, getDocs, increment, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { loadSettings } from './settings'

export const METRICS = [
  'game_start',
  'game_end',
  'quiz_ok',
  'quiz_fail',
  'offer_accept',
  'offer_refuse',
  'offer_report',
  'merit_vote',
  'promise_impossible',
  'promise_possible',
  'budget_social',
  'budget_invest',
  'budget_austere',
  'budget_balanced',
  'custom_bill',
] as const

export type Metric = (typeof METRICS)[number]

const today = () => new Date().toISOString().slice(0, 10)

export function track(m: Metric) {
  if (!db || !auth?.currentUser || !loadSettings().analytics) return
  setDoc(doc(db, 'metrics', today()), { [m]: increment(1) }, { merge: true }).catch(() => {})
}

let sent = 0

/** Registra erros de página (no máximo 3 por sessão), para corrigir problemas. */
export function installErrorReporting() {
  const send = (message: string) => {
    if (!db || !auth?.currentUser || sent >= 3 || !loadSettings().analytics) return
    sent++
    addDoc(collection(db, 'errors'), {
      message: message.slice(0, 300),
      page: window.location.pathname.slice(0, 100),
      ua: navigator.userAgent.slice(0, 200),
      at: serverTimestamp(),
    }).catch(() => {})
  }
  window.addEventListener('error', (e) => send(String(e.message ?? e.error)))
  window.addEventListener('unhandledrejection', (e) => send(String((e.reason as Error)?.message ?? e.reason)))
}

export type DailyMetrics = Partial<Record<Metric, number>> & { day: string }

export async function recentMetrics(days = 30): Promise<DailyMetrics[]> {
  if (!db) return []
  const snap = await getDocs(query(collection(db, 'metrics'), orderBy('__name__', 'desc'), limit(days)))
  return snap.docs.map((d) => ({ day: d.id, ...(d.data() as Partial<Record<Metric, number>>) }))
}
