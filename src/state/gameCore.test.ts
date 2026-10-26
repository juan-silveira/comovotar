import { describe, expect, it } from 'vitest'
import { pendingItems } from '../model/career'
import { findMission, MISSIONS } from '../model/game'
import { reducer, replay, withResults, type GameState } from './gameCore'

function play(years: number): GameState {
  let s: GameState = reducer({ missionId: null, career: null }, { type: 'start', missionId: MISSIONS[0].id, setup: { office: 'governador', uf: 'BA', municipio: null, party: 'UDC' } })
  for (let y = 0; y < years; y++) {
    for (let guard = 0; guard < 20; guard++) {
      const { input, results } = withResults(findMission(s.missionId!)!, s.career!)
      const items = pendingItems(s.career!, input, results)
      if (items.length === 0) break
      const item = items[0]
      if (item.kind === 'career') {
        s = reducer(s, { type: 'career', office: null })
        continue
      }
      const option =
        item.kind === 'orcamento' ? 'investimento' : item.kind === 'promessa' ? 'obras' : item.kind === 'oferta' ? 'recusar' : item.kind === 'campanha' ? 'fundo' : 'x'
      const before = s
      s = reducer(s, { type: 'resolve', item, optionId: option })
      if (s === before) break
    }
    s = reducer(s, { type: 'advance' })
  }
  return s
}

describe('repetição da partida (verificação do ranking)', () => {
  it('reproduz exatamente o estado a partir do registro de ações', () => {
    const s = play(6)
    expect(s.career!.t).toBeGreaterThan(0)
    const again = replay(s.log!)
    expect(again).not.toBeNull()
    expect(again!.career!.t).toBe(s.career!.t)
    expect(again!.career!.approval).toBe(s.career!.approval)
    expect(again!.career!.lawEffects).toEqual(s.career!.lawEffects)
  })

  it('rejeita decisões forjadas que não estavam disponíveis', () => {
    const s = play(3)
    const forged = [
      ...s.log!,
      { type: 'resolve' as const, item: { kind: 'crise-global' as const, eventId: 'pandemia' as const, title: 'x', text: 'x' }, optionId: 'auxilio' },
    ]
    expect(replay(forged)).toBeNull()
  })
})
