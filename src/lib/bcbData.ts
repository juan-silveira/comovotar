// Indicadores do Banco Central (SGS) com cache em três níveis, como os do
// IBGE: navegador, Firestore (público) e a API do Banco Central, consultada
// no máximo a cada 12 horas.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

import { fetchBcbMacro, type BcbMacro } from '../model/bcb'

export { BCB_SERIES, fetchBcbMacro, fetchSeries, type BcbMacro, type BcbPoint } from '../model/bcb'

const MAX_AGE = 12 * 3600 * 1000
const KEY = 'sdr.bcb-macro'

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
