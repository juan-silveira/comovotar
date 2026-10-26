// Manchetes do legado do jogador no fim da partida.

import { fmtBRLShort, fmtNum, lowerFirst } from '../lib/format'
import { officesHeld } from './achievements'
import { territoryStats, type CareerState } from './career'
import { ROLES } from './roles'
import type { SimInput, YearResult } from './simulation'

export interface Headline {
  text: string
  good?: boolean
}

export function legacyHeadlines(career: CareerState, input: SimInput, results: YearResult[]): Headline[] {
  const out: Headline[] = []
  const offices = officesHeld(career)
  const years = career.yearsInOffice
  out.push({
    text:
      offices.length > 1
        ? `De ${lowerFirst(ROLES[offices[0]].title)} a ${lowerFirst(ROLES[offices[offices.length - 1]].title)}: ${years} anos de mandato em ${offices.length} cargos`
        : `${ROLES[offices[0]].title}: ${years} anos de mandato`,
  })
  const laws = career.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei').length
  const proposed = career.bills.filter((b) => b.authorIsPlayer).length
  out.push(
    laws > 0
      ? { text: `${laws} ${laws === 1 ? 'lei' : 'leis'} de sua autoria ${laws === 1 ? 'aprovada' : 'aprovadas'}, de ${proposed} propostas`, good: true }
      : { text: proposed > 0 ? `Nenhuma das suas ${proposed} propostas virou lei: aprovar é mais difícil do que parece` : 'Nenhuma lei de sua autoria' },
  )
  const terr = territoryStats(career, input, results, Math.min(career.t, results.length - 1))
  out.push({
    text: `${terr.name} termina ${terr.vs >= 0 ? 'acima' : 'abaixo'} da trajetória esperada: ${terr.vs >= 0 ? '+' : '−'}${fmtNum(Math.abs(terr.vs), 1)}%`,
    good: terr.vs >= 0,
  })
  const kept = career.promises.filter((p) => p.status === 'cumprida').length
  const broken = career.promises.filter((p) => p.status === 'quebrada').length
  if (kept + broken > 0) out.push({ text: `Promessas: ${kept} ${kept === 1 ? 'cumprida' : 'cumpridas'}, ${broken} ${broken === 1 ? 'descumprida' : 'descumpridas'}`, good: kept >= broken })
  const convicted = career.log.find((l) => l.title.startsWith('Condenado'))
  if (convicted) out.push({ text: `Condenado(a) por corrupção em ${2023 + convicted.year}`, good: false })
  const start = career.wealthHistory[0]?.value ?? career.wealth
  out.push({ text: `Patrimônio pessoal: de ${fmtBRLShort(start)} para ${fmtBRLShort(career.wealth)}` })
  out.push({ text: `Aprovação final: ${Math.round(career.approval)}%`, good: career.approval >= 50 })
  return out
}
