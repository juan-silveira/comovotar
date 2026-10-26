// Explicações geradas por regras, em linguagem neutra e analítica.

import { fmtNum, fmtPct, fmtPp, lowerFirst } from '../lib/format'
import { CABINET_LABELS } from './institutions'
import { FIRM_POLICY_LABELS, MIGRATION_POLICY_LABELS, type Params } from './params'
import { COMPONENT_LABELS, type BlockId, type Components, type SubComponents, type YearResult } from './simulation'

export type DriverKey = keyof SubComponents | 'trade' | 'transition'

export const DRIVER_LABELS: Record<DriverKey, string> = {
  separationFiscal: 'Fiscal da separação',
  monetary: 'Juros (Banco Central)',
  autonomy: 'Autonomia de política',
  politics: 'Política',
  institutions: 'Instituições',
  localPolicies: 'Leis e políticas locais',
  aging: 'Envelhecimento',
  migration: 'Migração',
  naturalResources: 'Recursos naturais',
  firms: 'Empresas',
  market: 'Bolsa e investimento',
  economicEvents: 'Eventos econômicos',
  climate: 'Clima',
  trade: 'Comércio',
  transition: 'Transição',
}

export interface Driver {
  block: BlockId
  key: DriverKey
  value: number
  text: string
}

const NAME: Record<BlockId, string> = { A: 'Bloco A', B: 'Bloco B' }

function describe(block: BlockId, key: DriverKey, value: number, r: YearResult, p: Params): string {
  const name = NAME[block]
  const v = fmtPp(value)
  const b = r[block]
  switch (key) {
    case 'separationFiscal':
      if (block === 'A')
        return value >= 0
          ? `${name}: deixa de transferir ${fmtPct(p.transferAtoB)} do PIB a B e reinveste parte dessa economia, o que soma ${v} ao crescimento. Arrecadação migrada${r.detail.transitionFund > 0 ? ', fundo de transição' : ''} e energia mais cara reduzem o ganho.`
          : `${name}: a arrecadação que migrou para B${r.detail.transitionFund > 0 ? ', o fundo de transição' : ''} e o custo da energia superam a economia com transferências (${v}).`
      return value < 0
        ? `${name}: perdeu transferências equivalentes a ${fmtPct(r.detail.netTransferLossB)} do seu PIB. O ajuste de gastos e receitas tira ${v} do crescimento.`
        : `${name}: a arrecadação recebida supera as transferências perdidas (${v}).`
    case 'monetary':
      return `${name}: com a inflação ${value < 0 ? 'acima' : 'abaixo'} da meta, o Banco Central ${value < 0 ? 'mantém juros altos, o que encarece o crédito e freia' : 'pode baixar os juros, o que estimula'} a economia (${v}).`
    case 'autonomy':
      return `${name}: com governo próprio, ajusta impostos, juros, câmbio e regras à sua economia e coordena menos UFs. Esse ganho cresce aos poucos e depende da qualidade do governo (${v}).`
    case 'politics': {
      const py = b.politics
      const parts: string[] = []
      if (py?.election) parts.push(`gasto extra de ano eleitoral (${py.election === 'geral' ? 'eleições gerais' : 'eleições municipais'})`)
      if (py && Math.abs(py.growth.emendas) > 0.005) parts.push('emendas parlamentares com eficiência diferente da de 2023')
      if (py && Math.abs(py.growth.taxes) > 0.005) parts.push('mudança na carga tributária')
      if (py && py.growth.alternation < 0) parts.push('incerteza após a troca de governo')
      if (py && py.growth.scandal < 0) parts.push('escândalo de gastos')
      return `${name}: ${parts.length ? parts.join(', ') : 'fatores políticos'} somam ${v} ao crescimento. A aprovação do governo está em ${fmtNum(b.approval, 0)}%.`
    }
    case 'institutions':
      return `${name}: o ministério ${lowerFirst(CABINET_LABELS[block === 'A' ? p.cabinetA : p.cabinetB])} e a segurança jurídica (${fmtNum(b.institutions.legalCertainty, 0)} de 100) contribuem com ${v}. Regras previsíveis reduzem juros e estimulam investimento.`
    case 'localPolicies':
      return `${name}: leis aprovadas e políticas estaduais e municipais somam ${v}.`
    case 'aging':
      return `${name}: a proporção de idosos (${fmtNum(b.elderlyShare, 1)}%) acima da média nacional reduz a força de trabalho relativa (${v}).`
    case 'migration': {
      const policy = lowerFirst(MIGRATION_POLICY_LABELS[block === 'A' ? r.detail.migrationPolicyA : r.detail.migrationPolicyB])
      return b.netMigration >= 0
        ? `${name}: recebeu ${fmtNum(b.netMigration / 1000, 0)} mil migrantes em idade ativa (política de entrada: ${policy}), o que soma ${v} à produção.`
        : `${name}: perdeu ${fmtNum(-b.netMigration / 1000, 0)} mil trabalhadores para o outro bloco, atraídos por renda maior (${v}).`
    }
    case 'naturalResources':
      return `${name}: minério, energia renovável e fronteira agrícola passam a gerar receita de exportação própria (${v}).`
    case 'firms': {
      const policy = lowerFirst(FIRM_POLICY_LABELS[block === 'A' ? r.detail.firmPolicyA : r.detail.firmPolicyB])
      return b.firmFlow > 0
        ? `${name}: atraiu empresas do outro bloco (política: ${policy}), somando ${v}.`
        : b.firmFlow < 0
          ? `${name}: empresas transferiram atividades para o outro bloco (política: ${policy}), com efeito de ${v}.`
          : `${name}: incentivos a empresas (política: ${policy}) somam ${v}, sem atrair atividade do outro bloco.`
    }
    case 'market':
      return `${name}: a bolsa ${value >= 0 ? 'subiu' : 'caiu'} no ano anterior, ${value >= 0 ? 'barateando' : 'encarecendo'} o capital das empresas (${v}).`
    case 'economicEvents': {
      const titles = r.activeEvents.map((e) => lowerFirst(e.title)).join(', ')
      return `${name}: eventos econômicos em curso (${titles}) têm efeito de ${v}.`
    }
    case 'climate': {
      const ev = r.climateEvents.filter((e) => e.block === block).map((e) => lowerFirst(e.title))
      return ev.length
        ? `${name}: ${ev.join(', ')}; o dano depende do preparo e da resposta do governo (${v}).`
        : `${name}: obras de reconstrução após eventos climáticos do ano anterior somam ${v}.`
    }
    case 'trade':
      return block === 'A'
        ? `${name}: parte das vendas para B deixou de existir por tarifas e custos de fronteira (${v}). O efeito diminui à medida que surgem mercados alternativos.`
        : `${name}: compra de A boa parte dos bens industriais e passou a pagar mais caro por importações (${v}).`
    case 'transition':
      return `${name}: o choque de transição (novas instituições, moeda, contratos renegociados e incerteza) ainda subtrai ${v}; ele cai pela metade a cada ${fmtNum(p.shockHalfLife, Number.isInteger(p.shockHalfLife) ? 0 : 1)} ${p.shockHalfLife === 1 ? 'ano' : 'anos'}.`
  }
}

/** Remove o ponto duplicado quando a frase termina numa unidade abreviada ("p.p."). */
function tidy(text: string): string {
  return text.replace(/p\.p\.\./g, 'p.p.').replace(/p\.p\.\)\./g, 'p.p.).')
}

/** Os 2 ou 3 fatores de maior peso no ano, com pelo menos um de cada bloco. */
export function topDrivers(r: YearResult, p: Params, n = 3): Driver[] {
  if (r.t === 0) return []
  const all: Driver[] = []
  for (const block of ['A', 'B'] as BlockId[]) {
    const values: Record<DriverKey, number> = {
      ...r[block].sub,
      trade: r[block].components.trade,
      transition: r[block].components.transition,
    }
    for (const key of Object.keys(values) as DriverKey[]) {
      if (Math.abs(values[key]) < 0.01) continue
      all.push({ block, key, value: values[key], text: tidy(describe(block, key, values[key], r, p)) })
    }
  }
  all.sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
  const picked = all.slice(0, n)
  for (const block of ['A', 'B'] as BlockId[]) {
    if (!picked.some((d) => d.block === block)) {
      const best = all.find((d) => d.block === block)
      if (best) picked[picked.length - 1] = best
    }
  }
  return picked.sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
}

export function yearHeadline(r: YearResult): string {
  if (r.t === 0) return 'Ano 0 (2023): situação de partida, antes da separação.'
  return `Em ${r.year} (ano ${r.t}), o Bloco A cresceu ${fmtPct(r.A.growth)} e o Bloco B, ${fmtPct(r.B.growth)}.`
}

export function componentLabel(key: keyof Components) {
  return COMPONENT_LABELS[key]
}

/** Parágrafo explicativo para um horizonte (curto, médio, longo). */
export function horizonParagraph(results: YearResult[], t: number): string {
  const r = results[t]
  if (!r) return ''
  const slice = results.slice(1, t + 1)
  const avg = (b: BlockId) => slice.reduce((s, x) => s + x[b].growth, 0) / slice.length
  const main = (b: BlockId) => {
    const keys: (keyof SubComponents)[] = Object.keys(r[b].sub) as (keyof SubComponents)[]
    const cum = (k: keyof SubComponents) => slice.reduce((s, x) => s + x[b].sub[k], 0)
    const extra: [DriverKey, number][] = [
      ['trade', slice.reduce((s, x) => s + x[b].components.trade, 0)],
      ['transition', slice.reduce((s, x) => s + x[b].components.transition, 0)],
    ]
    return [...keys.map((k) => [k, cum(k)] as [DriverKey, number]), ...extra]
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
      .slice(0, 2)
      .filter((x) => Math.abs(x[1]) > 0.01)
      .map(([k, v]) => `${lowerFirst(DRIVER_LABELS[k])} (${fmtPp(v)} acumulados)`)
      .join(' e ')
  }
  const rel = (b: BlockId) => {
    const v = r[b].vsNoSeparation
    return v >= 0
      ? `${fmtPct(v)} acima da trajetória que teria sem separação`
      : `${fmtPct(-v)} abaixo da trajetória que teria sem separação`
  }
  return (
    `Até ${r.year}, o Bloco A cresceu em média ${fmtPct(avg('A'))} ao ano e o Bloco B, ${fmtPct(avg('B'))}. ` +
    `O PIB per capita de A está ${rel('A')}; o de B está ${rel('B')}. ` +
    `Em A, pesaram mais ${main('A') || 'os fatores de tendência'}. Em B, ${main('B') || 'os fatores de tendência'}.`
  )
}
