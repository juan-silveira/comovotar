// Dados do IBGE com cache em três níveis:
//   1. memória/localStorage do navegador;
//   2. Firestore (documento público em datasets/, compartilhado entre jogadores);
//   3. API do IBGE, consultada só quando o cache não existe ou passou de 30 dias.
// Se tudo falhar, o app usa o snapshot embutido no código.

import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { buildBaseline, DEFAULT_BASELINE, type Baseline } from '../model/baseline'
import { fetchIbgeDataset, fetchMunicipios, validateDataset, type IbgeDataset, type MunicipiosDataset } from '../model/ibge'
import type { UF } from '../model/states'
import { auth, db } from './firebase'

export const CACHE_DAYS = 30
const MAX_AGE = CACHE_DAYS * 24 * 3600 * 1000

function fresh(iso: string | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < MAX_AGE
}

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento cheio ou indisponível
  }
}

async function readCloud<T>(id: string): Promise<T | null> {
  if (!db) return null
  try {
    const snap = await getDoc(doc(db, 'datasets', id))
    return snap.exists() ? (snap.data().data as T) : null
  } catch {
    return null
  }
}

async function writeCloud(id: string, data: unknown) {
  if (!db || !auth?.currentUser) return
  try {
    await setDoc(doc(db, 'datasets', id), { data, fetchedAtTs: serverTimestamp() })
  } catch {
    // As regras só permitem regravar caches vencidos; falhar aqui é esperado.
  }
}

export interface BaselineLoad {
  baseline: Baseline
  origin: 'navegador' | 'firebase' | 'ibge' | 'embutido'
  fetchedAt: string
  error?: string
}

/** Carrega os dados por UF, preferindo caches. `force` consulta o IBGE mesmo com cache válido. */
export async function loadBaseline(force = false): Promise<BaselineLoad> {
  const key = 'sdr.ibge-uf'
  if (!force) {
    const local = readLocal<IbgeDataset>(key)
    if (local && fresh(local.fetchedAt)) return { baseline: buildBaseline(local, 'firebase'), origin: 'navegador', fetchedAt: local.fetchedAt }
    const cloud = await readCloud<IbgeDataset>('ibge-uf')
    if (cloud && fresh(cloud.fetchedAt)) {
      writeLocal(key, cloud)
      return { baseline: buildBaseline(cloud, 'firebase'), origin: 'firebase', fetchedAt: cloud.fetchedAt }
    }
  }
  try {
    const data = await fetchIbgeDataset()
    validateDataset(data)
    writeLocal(key, data)
    await writeCloud('ibge-uf', data)
    return { baseline: buildBaseline(data, 'ibge'), origin: 'ibge', fetchedAt: data.fetchedAt }
  } catch (e) {
    return {
      baseline: DEFAULT_BASELINE,
      origin: 'embutido',
      fetchedAt: DEFAULT_BASELINE.source.fetchedAt,
      error: (e as Error).message,
    }
  }
}

const memo = new Map<UF, MunicipiosDataset>()

/** Municípios de uma UF (população do Censo 2022 e PIB municipal). */
export async function loadMunicipios(uf: UF): Promise<MunicipiosDataset & { origin: string }> {
  const cached = memo.get(uf)
  if (cached) return { ...cached, origin: 'memória' }
  const key = `sdr.municipios.${uf}`
  const local = readLocal<MunicipiosDataset>(key)
  if (local && fresh(local.fetchedAt)) {
    memo.set(uf, local)
    return { ...local, origin: 'navegador' }
  }
  const cloud = await readCloud<MunicipiosDataset>(`ibge-municipios-${uf}`)
  if (cloud && fresh(cloud.fetchedAt)) {
    memo.set(uf, cloud)
    writeLocal(key, cloud)
    return { ...cloud, origin: 'firebase' }
  }
  const data = await fetchMunicipios(uf)
  memo.set(uf, data)
  writeLocal(key, data)
  await writeCloud(`ibge-municipios-${uf}`, data)
  return { ...data, origin: 'ibge' }
}

export function timestampToIso(v: unknown): string | undefined {
  return v instanceof Timestamp ? v.toDate().toISOString() : undefined
}
