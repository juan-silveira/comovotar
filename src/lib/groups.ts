// Turmas e grupos: um código compartilhado que fixa o mesmo cenário para
// todos, com placar próprio e votação de debate. Sem Firebase, funciona só
// neste navegador.

import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import type { Office } from '../model/bills'
import type { MissionSpec } from '../model/game'
import { db } from './firebase'

export interface Group {
  code: string
  ownerUid: string
  name: string
  kind: 'turma' | 'grupo'
  spec: MissionSpec
  /** Cargo fixo para todos (null = livre) */
  office: Office | null
  /** Pauta em debate (id de PAUTAS) */
  debate: string | null
}

export interface GroupResult {
  uid: string
  initials: string
  office: Office
  uf: string
  score: number
  justice: number
  green: number
  laws: number
  objectives: number
  achievements: number
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newCode(): string {
  let c = ''
  const r = crypto.getRandomValues(new Uint32Array(6))
  for (const x of r) c += ALPHABET[x % ALPHABET.length]
  return c
}

export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/

export const groupMissionId = (code: string) => `grupo-${code}`

// Modo local (sem Firebase) ---------------------------------------------------------------
const LOCAL = 'sdr.groups'
function local(): Record<string, { group: Group; results: Record<string, GroupResult>; votes: Record<string, 'a' | 'b'> }> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '{}')
  } catch {
    return {}
  }
}
function saveLocal(v: ReturnType<typeof local>) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(v))
  } catch {
    // ignorado
  }
}

export async function createGroup(uid: string, g: Omit<Group, 'code' | 'ownerUid'>): Promise<Group> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode()
    const group: Group = { ...g, code, ownerUid: uid }
    if (!db) {
      const all = local()
      if (all[code]) continue
      all[code] = { group, results: {}, votes: {} }
      saveLocal(all)
      return group
    }
    const ref = doc(db, 'groups', code)
    if ((await getDoc(ref)).exists()) continue
    const { code: _code, ...data } = group
    void _code
    await setDoc(ref, { ...data, createdAt: serverTimestamp() })
    return group
  }
  throw new Error('Não foi possível gerar um código. Tente de novo.')
}

export async function getGroup(code: string): Promise<Group | null> {
  if (!CODE_RE.test(code)) return null
  if (!db) return local()[code]?.group ?? null
  const snap = await getDoc(doc(db, 'groups', code))
  if (!snap.exists()) return null
  const d = snap.data()
  return { code, ownerUid: d.ownerUid, name: d.name, kind: d.kind, spec: d.spec, office: d.office ?? null, debate: d.debate ?? null }
}

export async function myGroups(uid: string): Promise<Group[]> {
  if (!db) return Object.values(local()).map((x) => x.group).filter((g) => g.ownerUid === uid)
  const snap = await getDocs(query(collection(db, 'groups'), where('ownerUid', '==', uid), limit(50)))
  return snap.docs.map((d) => ({ code: d.id, ...(d.data() as Omit<Group, 'code'>) }))
}

/** Guarda o resultado do jogador no placar do grupo (só substitui por pontuação maior). */
export async function submitGroupResult(code: string, r: GroupResult): Promise<'novo-recorde' | 'sem-melhora'> {
  if (!db) {
    const all = local()
    const g = all[code]
    if (!g) throw new Error('Grupo não encontrado.')
    if ((g.results[r.uid]?.score ?? -1) >= r.score) return 'sem-melhora'
    g.results[r.uid] = r
    saveLocal(all)
    return 'novo-recorde'
  }
  const ref = doc(db, 'groups', code, 'results', r.uid)
  const prev = await getDoc(ref)
  if (prev.exists() && (prev.data().score as number) >= r.score) return 'sem-melhora'
  const { uid: _uid, ...data } = r
  void _uid
  await setDoc(ref, { ...data, createdAt: serverTimestamp() })
  return 'novo-recorde'
}

export async function groupResults(code: string): Promise<GroupResult[]> {
  if (!db) return Object.values(local()[code]?.results ?? {}).sort((a, b) => b.score - a.score)
  const snap = await getDocs(query(collection(db, 'groups', code, 'results'), orderBy('score', 'desc'), limit(200)))
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<GroupResult, 'uid'>) }))
}

export async function vote(code: string, uid: string, side: 'a' | 'b') {
  if (!db) {
    const all = local()
    if (all[code]) all[code].votes[uid] = side
    saveLocal(all)
    return
  }
  await setDoc(doc(db, 'groups', code, 'votes', uid), { side, createdAt: serverTimestamp() })
}

export async function votes(code: string, uid: string | null): Promise<{ a: number; b: number; mine: 'a' | 'b' | null }> {
  const list: { id: string; side: 'a' | 'b' }[] = db
    ? (await getDocs(query(collection(db, 'groups', code, 'votes'), limit(500)))).docs.map((d) => ({ id: d.id, side: d.data().side }))
    : Object.entries(local()[code]?.votes ?? {}).map(([id, side]) => ({ id, side }))
  return {
    a: list.filter((v) => v.side === 'a').length,
    b: list.filter((v) => v.side === 'b').length,
    mine: list.find((v) => v.id === uid)?.side ?? null,
  }
}
