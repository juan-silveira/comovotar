// Persistência de cenários e ranking. Usa o Firestore quando configurado e
// o localStorage como alternativa (modo local).

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { Baseline } from '../model/baseline'
import type { DecisionChoice } from '../model/decisions'
import type { Office } from '../model/bills'
import type { Coefficients, Params, SeparationType } from '../model/params'
import { MODEL_VERSION, type YearResult } from '../model/simulation'
import { db } from './firebase'

// Cenários -------------------------------------------------------------------

export interface CompactBlock {
  gdp: number
  pop: number
  gdpPc: number
  growth: number
  debt: number
  fiscalBalance: number
  vsNoSeparation: number
}

export interface CompactYear {
  t: number
  year: number
  A: CompactBlock
  B: CompactBlock
  unitedGdpPc: number
}

export interface SavedScenario {
  id: string
  name: string
  createdAt: Date
  mode: 'livre' | 'missao'
  missionId: string | null
  params: Params
  coef: Coefficients
  baseline: Baseline
  seed: number
  decisions: DecisionChoice[]
  results: CompactYear[]
  notes: string
  modelVersion: number
}

export function compactResults(results: YearResult[]): CompactYear[] {
  const b = (x: YearResult['A']): CompactBlock => ({
    gdp: x.gdp,
    pop: x.pop,
    gdpPc: x.gdpPc,
    growth: x.growth,
    debt: x.debt,
    fiscalBalance: x.fiscalBalance,
    vsNoSeparation: x.vsNoSeparation,
  })
  return results.map((r) => ({ t: r.t, year: r.year, A: b(r.A), B: b(r.B), unitedGdpPc: r.united.gdpPc }))
}

const LOCAL_SCENARIOS = 'sdr.scenarios'

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function writeLocal<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // Armazenamento indisponível (navegação privada etc.)
  }
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
}

export async function saveScenario(
  uid: string,
  data: Omit<SavedScenario, 'id' | 'createdAt' | 'modelVersion'> & { id?: string },
): Promise<string> {
  const id = data.id ?? newId()
  const payload = { ...data, id, modelVersion: MODEL_VERSION }
  if (db) {
    const ref = doc(db, 'users', uid, 'scenarios', id)
    const existing = await getDoc(ref)
    await setDoc(ref, {
      ...payload,
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    })
  } else {
    const all = readLocal<SavedScenario>(LOCAL_SCENARIOS).filter((s) => s.id !== id)
    const prev = readLocal<SavedScenario>(LOCAL_SCENARIOS).find((s) => s.id === id)
    all.unshift({ ...payload, createdAt: prev?.createdAt ?? new Date() })
    writeLocal(LOCAL_SCENARIOS, all)
  }
  return id
}

export async function listScenarios(uid: string): Promise<SavedScenario[]> {
  if (db) {
    const snap = await getDocs(query(collection(db, 'users', uid, 'scenarios'), orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => {
      const data = d.data()
      return { ...(data as SavedScenario), id: d.id, createdAt: toDate(data.createdAt) }
    })
  }
  return readLocal<SavedScenario>(LOCAL_SCENARIOS).map((s) => ({ ...s, createdAt: new Date(s.createdAt) }))
}

export async function updateScenarioNotes(uid: string, id: string, notes: string): Promise<void> {
  if (db) {
    await updateDoc(doc(db, 'users', uid, 'scenarios', id), { notes })
  } else {
    writeLocal(
      LOCAL_SCENARIOS,
      readLocal<SavedScenario>(LOCAL_SCENARIOS).map((s) => (s.id === id ? { ...s, notes } : s)),
    )
  }
}

export async function deleteScenario(uid: string, id: string): Promise<void> {
  if (db) await deleteDoc(doc(db, 'users', uid, 'scenarios', id))
  else writeLocal(LOCAL_SCENARIOS, readLocal<SavedScenario>(LOCAL_SCENARIOS).filter((s) => s.id !== id))
}

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date()
}

// Ranking ---------------------------------------------------------------------

export interface LeaderboardEntry {
  missionId: string
  office: Office
  uf: string
  initials: string
  score: number
  territory: number
  yearsInOffice: number
  laws: number
  quiz: number
  objectivesMet: number
  separation: SeparationType
  modelVersion: number
  createdAt: Date
  /** Verdadeiro se for a entrada do próprio jogador */
  mine?: boolean
}

export const INITIALS_RE = /^[A-Z]{2,3}$/

export function normalizeInitials(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
}

const LOCAL_BOARD = 'sdr.leaderboard'

export type SubmitResult = 'novo-recorde' | 'sem-melhora'

function entryId(missionId: string, office: Office, uid: string) {
  return `${missionId}__${office}__${uid}`
}

/**
 * Envia a pontuação. Cada jogador tem uma entrada por cenário e cargo; ela só
 * é substituída por uma pontuação maior (regra também imposta no Firestore).
 */
export async function submitScore(
  uid: string,
  entry: Omit<LeaderboardEntry, 'createdAt' | 'mine' | 'modelVersion'>,
): Promise<SubmitResult> {
  if (!INITIALS_RE.test(entry.initials)) throw new Error('Iniciais inválidas: use 2 ou 3 letras.')
  const id = entryId(entry.missionId, entry.office, uid)
  const clean = {
    missionId: entry.missionId,
    office: entry.office,
    uf: entry.uf,
    uid,
    initials: entry.initials,
    score: Math.round(entry.score),
    territory: Math.round(entry.territory),
    yearsInOffice: Math.round(entry.yearsInOffice),
    laws: Math.round(entry.laws),
    quiz: Math.round(entry.quiz),
    objectivesMet: entry.objectivesMet,
    separation: entry.separation,
    modelVersion: MODEL_VERSION,
  }
  if (db) {
    const ref = doc(db, 'leaderboard', id)
    const existing = await getDoc(ref)
    if (existing.exists() && (existing.data().score as number) >= clean.score) return 'sem-melhora'
    await setDoc(ref, { ...clean, createdAt: serverTimestamp() })
    return 'novo-recorde'
  }
  const all = readLocal<LeaderboardEntry & { id: string }>(LOCAL_BOARD)
  const prev = all.find((e) => e.id === id)
  if (prev && prev.score >= clean.score) return 'sem-melhora'
  writeLocal(LOCAL_BOARD, [...all.filter((e) => e.id !== id), { ...clean, id, createdAt: new Date() }])
  return 'novo-recorde'
}

export async function topScores(missionId: string, office: Office, uid: string | null, max = 50): Promise<LeaderboardEntry[]> {
  if (db) {
    const snap = await getDocs(
      query(
        collection(db, 'leaderboard'),
        where('missionId', '==', missionId),
        where('office', '==', office),
        orderBy('score', 'desc'),
        limit(max),
      ),
    )
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        missionId: data.missionId,
        office: data.office,
        uf: data.uf,
        initials: data.initials,
        score: data.score,
        territory: data.territory,
        yearsInOffice: data.yearsInOffice,
        laws: data.laws,
        quiz: data.quiz,
        objectivesMet: data.objectivesMet,
        separation: data.separation,
        modelVersion: data.modelVersion,
        createdAt: toDate(data.createdAt),
        mine: uid !== null && data.uid === uid,
      }
    })
  }
  return readLocal<LeaderboardEntry & { id: string }>(LOCAL_BOARD)
    .filter((e) => e.missionId === missionId && e.office === office)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((e) => ({ ...e, createdAt: new Date(e.createdAt), mine: uid !== null && e.id.endsWith(`__${uid}`) }))
}

const INITIALS_KEY = 'sdr.initials'

export function savedInitials(): string {
  try {
    return localStorage.getItem(INITIALS_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberInitials(v: string) {
  try {
    localStorage.setItem(INITIALS_KEY, v)
  } catch {
    // ignorado
  }
}
