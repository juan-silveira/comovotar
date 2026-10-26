// Conquistas (medalhas): calculadas a partir do estado da carreira, sem
// guardar nada a mais. Algumas premiam o que é difícil na política real,
// como votar pelo mérito contra o próprio partido.

import { lowerFirst } from '../lib/format'
import type { Office } from './bills'
import { territoryStats, type CareerState } from './career'
import { findPromise } from './promises'
import { OFFICE_ORDER, ROLES } from './roles'
import type { SimInput, YearResult } from './simulation'

export interface AchievementContext {
  career: CareerState
  input: SimInput
  results: YearResult[]
}

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  /** Escondida até ser conquistada */
  secret?: boolean
  check: (c: AchievementContext) => boolean
}

const ownLaws = (c: CareerState) => c.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei')
const logHas = (c: CareerState, re: RegExp) => c.log.some((l) => re.test(l.title))
const count = (c: CareerState, kind: string, ids: string[]) => c.history.filter((h) => h.kind === kind && ids.includes(h.id)).length

/** Cargos que o jogador ocupou: o inicial e os conquistados em eleições. */
export function officesHeld(c: CareerState): Office[] {
  const won = OFFICE_ORDER.filter((o) => c.log.some((l) => l.title === `Eleito(a) ${lowerFirst(ROLES[o].title)}`))
  return [...new Set([firstOffice(c), ...won])]
}

function firstOffice(c: CareerState): Office {
  const first = c.log.find((l) => l.title.startsWith('Você assume como'))
  return OFFICE_ORDER.find((o) => first?.title === `Você assume como ${lowerFirst(ROLES[o].title)}`) ?? c.setup.office
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeira-lei',
    icon: '📜',
    title: 'Legislador',
    description: 'Ter um projeto de sua autoria transformado em lei.',
    check: ({ career }) => ownLaws(career).length >= 1,
  },
  {
    id: 'tres-leis',
    icon: '📚',
    title: 'Pai ou mãe da lei',
    description: 'Aprovar 3 leis de sua autoria.',
    check: ({ career }) => ownLaws(career).length >= 3,
  },
  {
    id: 'veto-derrubado',
    icon: '🔨',
    title: 'Veto derrubado',
    description: 'Ver o Congresso derrubar um veto a uma lei sua.',
    check: ({ career }) => ownLaws(career).some((b) => b.state.log.some((l) => l.title.startsWith('Veto derrubado'))),
  },
  {
    id: 'merito',
    icon: '🧭',
    title: 'Voto pelo mérito',
    description: 'Votar a favor de uma boa proposta que o seu partido rejeitava só por estratégia.',
    check: ({ career }) => count(career, 'voto', ['merito']) >= 1,
  },
  {
    id: 'reeleito',
    icon: '🗳️',
    title: 'O eleitor aprovou',
    description: 'Ser reeleito(a).',
    check: ({ career }) => logHas(career, /^Reeleito/),
  },
  {
    id: 'oito-anos',
    icon: '⏳',
    title: 'Dois mandatos',
    description: 'Governar 8 anos seguidos, o limite da Constituição para o Executivo.',
    check: ({ career }) => career.termLimited.length > 0,
  },
  {
    id: 'carreira',
    icon: '🪜',
    title: 'Carreira política',
    description: 'Ocupar 3 cargos diferentes.',
    check: ({ career }) => officesHeld(career).length >= 3,
  },
  {
    id: 'promessa',
    icon: '🤝',
    title: 'Palavra cumprida',
    description: 'Cumprir uma promessa de campanha.',
    check: ({ career }) => career.promises.some((p) => p.status === 'cumprida'),
  },
  {
    id: 'promessa-lua',
    icon: '🌙',
    title: 'Prometeu a Lua',
    description: 'Ser cobrado(a) por uma promessa impossível.',
    secret: true,
    check: ({ career }) => career.promises.some((p) => p.status === 'quebrada' && findPromise(p.id)?.feasibility === 'impossivel'),
  },
  {
    id: 'ficha-limpa',
    icon: '🧼',
    title: 'Ficha limpa',
    description: 'Recusar ou denunciar 3 propostas ilícitas.',
    check: ({ career }) => count(career, 'oferta', ['recusar', 'denunciar']) >= 3,
  },
  {
    id: 'denuncia',
    icon: '📣',
    title: 'Denunciante',
    description: 'Denunciar uma proposta de corrupção ao Ministério Público.',
    check: ({ career }) => count(career, 'oferta', ['denunciar']) >= 1,
  },
  {
    id: 'absolvido',
    icon: '😮‍💨',
    title: 'Por um triz',
    description: 'Ser absolvido(a) por falta de provas.',
    secret: true,
    check: ({ career }) => logHas(career, /^Absolvido/),
  },
  {
    id: 'investidor',
    icon: '🏗️',
    title: 'Obra pronta',
    description: 'Escolher o orçamento de investimento em 4 anos.',
    check: ({ career }) => count(career, 'orcamento', ['investimento']) >= 4,
  },
  {
    id: 'crise',
    icon: '🌧️',
    title: 'Mão firme na crise',
    description: 'Responder a 3 crises climáticas sem minimizar.',
    check: ({ career }) => Object.values(career.crises).filter((v) => v !== 'minimizar').length >= 3,
  },
  {
    id: 'territorio',
    icon: '📈',
    title: 'Mais rico que a tendência',
    description: 'Terminar com o seu território acima da trajetória esperada.',
    check: ({ career, input, results }) => career.t >= 30 && territoryStats(career, input, results, career.t).vs > 0,
  },
  {
    id: 'estadista',
    icon: '🏛️',
    title: 'Estadista',
    description: 'Chegar ao fim dos 30 anos sem condenação e com aprovação de pelo menos 60%.',
    check: ({ career }) => career.t >= 30 && !logHas(career, /^Condenado/) && career.approval >= 60,
  },
]

export function unlockedAchievements(ctx: AchievementContext): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(ctx))
}
