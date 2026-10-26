// Objetivos pessoais por cargo: um principal, dois secundários e um oculto
// (revelado só quando cumprido). Avaliados a partir da carreira e da
// simulação; contam para o balanço da partida, não para o ranking.

import { officesHeld } from './achievements'
import type { Office } from './bills'
import { territoryStats, type CareerState } from './career'
import { macroSeries } from './macro'
import type { SimInput, YearResult } from './simulation'
import { socialSeries } from './social'

export interface CareerObjective {
  id: string
  kind: 'principal' | 'secundario' | 'oculto'
  label: string
  /** 'ok' cumprido; 'falhou' impossível de cumprir; 'pendente' ainda em aberto */
  check: (c: Ctx) => 'ok' | 'falhou' | 'pendente'
}

interface Ctx {
  career: CareerState
  input: SimInput
  results: YearResult[]
  final: boolean
}

const ownLaws = (c: CareerState) => c.bills.filter((b) => b.authorIsPlayer && b.state.status === 'lei').length
const logged = (c: CareerState, re: RegExp) => c.log.some((l) => re.test(l.title))
const atLeast = (n: number, v: number, final: boolean) => (v >= n ? 'ok' : final ? 'falhou' : 'pendente')
const clean: CareerObjective['check'] = ({ career, final }) =>
  career.history.some((h) => h.kind === 'oferta' && h.id === 'aceitar') || logged(career, /^Condenado/) ? 'falhou' : final ? 'ok' : 'pendente'
const reelected: CareerObjective['check'] = ({ career, final }) => (logged(career, /^Reeleito/) ? 'ok' : final ? 'falhou' : 'pendente')
const promise: CareerObjective['check'] = ({ career, final }) =>
  career.promises.some((p) => p.status === 'cumprida') ? 'ok' : final ? 'falhou' : 'pendente'
const territory: CareerObjective['check'] = ({ career, input, results, final }) => {
  if (!final) return 'pendente'
  return territoryStats(career, input, results, Math.min(career.t, results.length - 1)).vs > 0 ? 'ok' : 'falhou'
}

const LEGISLATIVE = (laws: number): CareerObjective[] => [
  { id: 'leis', kind: 'principal', label: `Aprovar ${laws} ${laws === 1 ? 'lei' : 'leis'} de sua autoria`, check: ({ career, final }) => atLeast(laws, ownLaws(career), final) },
  { id: 'reeleicao', kind: 'secundario', label: 'Ser reeleito(a)', check: reelected },
  {
    id: 'merito',
    kind: 'secundario',
    label: 'Votar pelo mérito contra o próprio partido ao menos uma vez',
    check: ({ career, final }) => atLeast(1, career.history.filter((h) => h.kind === 'voto' && h.id === 'merito').length, final),
  },
  { id: 'limpo', kind: 'oculto', label: 'Terminar sem aceitar nenhuma proposta ilícita', check: clean },
]

const EXECUTIVE: CareerObjective[] = [
  { id: 'territorio', kind: 'principal', label: 'Terminar com o seu território acima da trajetória esperada', check: territory },
  { id: 'reeleicao', kind: 'secundario', label: 'Ser reeleito(a)', check: reelected },
  { id: 'promessa', kind: 'secundario', label: 'Cumprir uma promessa de campanha', check: promise },
  {
    id: 'crises',
    kind: 'oculto',
    label: 'Nunca minimizar uma crise climática',
    check: ({ career, final }) => (Object.values(career.crises).includes('minimizar') ? 'falhou' : final ? 'ok' : 'pendente'),
  },
]

export const OBJECTIVES_BY_OFFICE: Record<Office, CareerObjective[]> = {
  vereador: LEGISLATIVE(1),
  'deputado-estadual': LEGISLATIVE(2),
  'deputado-federal': LEGISLATIVE(2),
  senador: LEGISLATIVE(2),
  prefeito: EXECUTIVE,
  governador: EXECUTIVE,
  presidente: [
    {
      id: 'pobreza',
      kind: 'principal',
      label: 'Reduzir a pobreza no Brasil em 5 pontos ou mais',
      check: ({ career, results, final }) => {
        const s = socialSeries(career, results, Math.min(career.t, results.length - 1))
        return s[0].poverty - s[s.length - 1].poverty >= 5 ? 'ok' : final ? 'falhou' : 'pendente'
      },
    },
    {
      id: 'inflacao',
      kind: 'secundario',
      label: 'Terminar com a inflação dentro da meta (até 4,5%)',
      check: ({ career, results, final }) => {
        if (!final) return 'pendente'
        const m = macroSeries(results, Math.min(career.t, results.length - 1))
        return m[m.length - 1].inflation <= 4.5 ? 'ok' : 'falhou'
      },
    },
    { id: 'promessa', kind: 'secundario', label: 'Cumprir uma promessa de campanha', check: promise },
    {
      id: 'impeachment',
      kind: 'oculto',
      label: 'Sobreviver a um pedido de impeachment',
      check: ({ career, final }) => (logged(career, /sobreviveu ao pedido de impeachment/i) ? 'ok' : final ? 'falhou' : 'pendente'),
    },
  ],
  'ministro-stf': [
    {
      id: 'seguranca',
      kind: 'principal',
      label: 'Manter a segurança jurídica em 60 ou mais até o fim',
      check: ({ career, input, results, final }) => {
        if (!final) return 'pendente'
        const r = results[Math.min(career.t, results.length - 1)]
        const side = input.params.partition[career.setup.uf]
        return (r[side] ?? r.A).institutions.legalCertainty >= 60 ? 'ok' : 'falhou'
      },
    },
    {
      id: 'plenario',
      kind: 'secundario',
      label: 'Levar 3 casos ao plenário em vez de decidir sozinho(a)',
      check: ({ career, final }) =>
        atLeast(
          3,
          career.decisions.filter((d) => d.cardId.startsWith('stf:') && d.optionId === 'plenario').length +
            career.history.filter((h) => h.kind === 'pressao' && /:plenario/.test(h.id)).length,
          final,
        ),
    },
    { id: 'limpo', kind: 'secundario', label: 'Não aceitar convites de partes com processos no tribunal', check: clean },
    {
      id: 'sem-liminar',
      kind: 'oculto',
      label: 'Nunca dar uma liminar monocrática',
      check: ({ career, final }) =>
        career.decisions.some((d) => d.cardId.startsWith('stf:') && d.optionId === 'liminar') ||
        career.history.some((h) => h.kind === 'pressao' && h.id.startsWith('stf-') && h.id.endsWith(':liminar'))
          ? 'falhou'
          : final
            ? 'ok'
            : 'pendente',
    },
  ],
}

export interface ObjectiveStatus {
  objective: CareerObjective
  status: 'ok' | 'falhou' | 'pendente'
}

export function careerObjectives(career: CareerState, input: SimInput, results: YearResult[]): ObjectiveStatus[] {
  const final = career.t >= results.length - 1
  // Os objetivos seguem o cargo em que a partida começou.
  return OBJECTIVES_BY_OFFICE[officesHeld(career)[0]].map((o) => ({ objective: o, status: o.check({ career, input, results, final }) }))
}
