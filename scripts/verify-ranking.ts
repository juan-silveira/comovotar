// Verificador do ranking: para cada entrada ainda não verificada, repete a
// partida a partir do registro de ações (prova) com o mesmo motor do jogo e
// confere a pontuação. Pontuações que não batem são removidas.
// Uso: npm run verify-ranking   (requer conta de serviço; ver scripts/admin.ts)
import { FieldValue } from 'firebase-admin/firestore'
import { careerScore } from '../src/model/career'
import { findMission, registerMission, type MissionSpec } from '../src/model/game'
import { replay, withResults, type Action } from '../src/state/gameCore'
import { db } from './admin'

const entries = await db.collection('leaderboard').get()
let ok = 0
let removed = 0
let noProof = 0
for (const doc of entries.docs) {
  const e = doc.data()
  if (e.verified === true) continue
  const proof = await db.collection('proofs').doc(doc.id).get()
  if (!proof.exists) {
    noProof++
    continue
  }
  let valid = false
  try {
    // Cenários de turma precisam da especificação guardada no grupo.
    if (String(e.missionId).startsWith('grupo-')) {
      const g = await db.collection('groups').doc(String(e.missionId).slice(6)).get()
      if (g.exists) registerMission(e.missionId, g.data()!.spec as MissionSpec)
    }
    const log = JSON.parse(proof.data()!.log as string) as Action[]
    const state = replay(log)
    const mission = state?.missionId ? findMission(state.missionId) : undefined
    if (state?.career && mission && state.missionId === e.missionId && state.career.t >= 30) {
      const { input, results } = withResults(mission, state.career)
      const s = careerScore(state.career, input, results, mission)
      valid = s.total === e.score && s.territory === e.territory && state.career.setup.uf === e.uf
    }
  } catch (err) {
    console.warn(doc.id, (err as Error).message)
  }
  if (valid) {
    await doc.ref.update({ verified: true, verifiedAt: FieldValue.serverTimestamp() })
    ok++
  } else {
    await doc.ref.delete()
    await proof.ref.delete()
    removed++
  }
}
console.log(`Verificadas: ${ok} · removidas: ${removed} · sem prova (mantidas sem selo): ${noProof}`)
