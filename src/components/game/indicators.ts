// Indicadores da tela principal (estilo Democracy): cada nó tem valor,
// situação, explicação e ligações de causa e efeito com outros nós.

import { fmtBRLFull, fmtNum, fmtSignedPct } from '../../lib/format'
import { separatedAt, territoryStats, type CareerState } from '../../model/career'
import { PREPAREDNESS_LABELS } from '../../model/climate'
import { CABINET_LABELS } from '../../model/institutions'
import { TRANSPARENCY_LABELS } from '../../model/politics'
import type { SimInput, YearResult } from '../../model/simulation'

export type Group = 'economia' | 'politica' | 'congresso' | 'justica' | 'clima' | 'sociedade'
export type Status = 'bom' | 'atencao' | 'ruim' | 'neutro'

export const GROUP_LABELS: Record<Group, string> = {
  economia: 'Economia',
  politica: 'Política',
  congresso: 'Congresso',
  justica: 'Justiça',
  clima: 'Clima e energia',
  sociedade: 'Sociedade',
}

export interface Indicator {
  id: string
  group: Group
  label: string
  icon: string
  value: string
  status: Status
  /** Explicação curta do que o indicador mede e do que o afeta */
  text: string
  /** Indicadores que este afeta */
  affects: string[]
  /** Série dos últimos anos, para mini gráfico */
  series?: number[]
  /** Temas de projeto de lei relacionados (áreas do catálogo) */
  areas?: string[]
  /** Termo do glossário que explica o indicador */
  term?: string
}

function status(v: number, good: number, bad: number, higherIsBetter = true): Status {
  if (higherIsBetter) return v >= good ? 'bom' : v <= bad ? 'ruim' : 'atencao'
  return v <= good ? 'bom' : v >= bad ? 'ruim' : 'atencao'
}

export function buildIndicators(career: CareerState, input: SimInput, results: YearResult[]): Indicator[] {
  const t = career.t
  const r = results[t]
  const separated = separatedAt(input, t)
  const side = separated ? input.params.partition[career.setup.uf] : 'A'
  const b = r[side]
  const w = r.A.gdp / (r.A.gdp + r.B.gdp)
  const nat = (f: (x: YearResult) => number, g: (x: YearResult) => number) => w * f(r) + (1 - w) * g(r)
  const terr = territoryStats(career, input, results, t)
  const past = results.slice(Math.max(0, t - 9), t + 1)
  const s = (f: (x: YearResult) => number) => past.map(f)
  const inst = b.institutions
  const growth = separated ? b.growth : nat((x) => x.A.growth, (x) => x.B.growth)
  const pc = separated ? b.gdpPc : (r.A.gdp + r.B.gdp) / (r.A.pop + r.B.pop)
  const climateEvents = r.climateEvents.filter((e) => !separated || e.block === side)
  const scope = separated ? `Bloco ${side}` : 'Brasil'
  const p = input.params
  const cabinet = side === 'A' ? p.cabinetA : p.cabinetB
  const prep = side === 'A' ? p.climatePrepA : p.climatePrepB
  const migration = separated ? b.netMigration : r.A.netMigration
  const lawsPassed = career.bills.filter((x) => x.authorIsPlayer && x.state.status === 'lei').length

  const list: Indicator[] = [
    {
      id: 'renda',
      term: 'pib-per-capita',
      group: 'economia',
      label: 'Renda',
      icon: '💰',
      value: fmtBRLFull(pc),
      status: status(terr.vs, 0, -5),
      text: `PIB per capita (${scope}). No seu território (${terr.name}), ${fmtSignedPct(terr.vs)} frente à tendência histórica.`,
      affects: ['aprovacao'],
      series: s((x) => (separated ? x[side].gdpPc : (x.A.gdp + x.B.gdp) / (x.A.pop + x.B.pop))),
    },
    {
      id: 'crescimento',
      term: 'crescimento',
      group: 'economia',
      label: 'Crescimento',
      icon: '📈',
      value: t === 0 ? '—' : fmtSignedPct(growth, 1),
      status: t === 0 ? 'neutro' : status(growth, 2, 0.5),
      text: 'Crescimento do PIB no ano. Soma da tendência histórica com os efeitos de política, comércio, migração, empresas, bolsa, clima e eventos.',
      affects: ['renda', 'aprovacao', 'bolsa', 'divida'],
      series: s((x) => (separated ? x[side].growth : w * x.A.growth + (1 - w) * x.B.growth)),
    },
    {
      id: 'divida',
      term: 'divida',
      group: 'economia',
      label: 'Dívida',
      icon: '🏦',
      value: `${fmtNum(b.debt, 0)}% PIB`,
      status: status(b.debt, 80, 110, false),
      text: `Dívida pública. Cresce com juros reais (${fmtNum(b.interestRate, 1)}%) acima do crescimento e com déficits; segurança jurídica e transparência baixam os juros.`,
      affects: ['bolsa'],
      series: s((x) => x[side].debt),
    },
    {
      id: 'bolsa',
      term: 'bolsa',
      group: 'economia',
      label: 'Bolsa',
      icon: '📊',
      value: fmtNum(inst.market, 0),
      status: status(inst.marketReturn, 6, 0),
      text: `Índice da bolsa (2023 = 100), retorno de ${fmtSignedPct(inst.marketReturn, 1)} no ano. Reage a decisões, eleições e segurança jurídica e influencia o investimento no ano seguinte.`,
      affects: ['crescimento', 'empresas'],
      series: s((x) => x[side].institutions.market),
    },
    {
      id: 'empresas',
      group: 'economia',
      label: 'Empresas',
      icon: '🏭',
      value: b.firmFlow === 0 ? 'estável' : `${b.firmFlow > 0 ? '+' : '−'}R$ ${fmtNum(Math.abs(b.firmFlow) / 1e9, 0)} bi`,
      status: b.firmFlow > 0 ? 'bom' : b.firmFlow < 0 ? 'ruim' : 'neutro',
      text: 'Atividade de empresas que muda de lugar por incentivos ou restrições. Incentivos custam receita; restrições afastam investimento.',
      affects: ['crescimento'],
      areas: ['Impostos'],
    },
    {
      id: 'aprovacao',
      term: 'aprovacao',
      group: 'politica',
      label: 'Aprovação',
      icon: '👍',
      value: `${fmtNum(b.approval, 0)}%`,
      status: status(b.approval, 55, 40),
      text: 'Aprovação do governo. Reage ao crescimento, a crises e escândalos (amplificados pela mídia) e ao gasto em ano eleitoral. Decide eleições e o apoio no Congresso.',
      affects: ['congresso', 'separatismo'],
      series: s((x) => x[side].approval),
    },
    {
      id: 'midia',
      group: 'politica',
      label: 'Mídia',
      icon: '📰',
      value: `${fmtNum(p.mediaInfluence, 0)}%`,
      status: 'neutro',
      text: 'Influência da mídia: quanto a cobertura amplifica a reação da opinião pública a boas e más notícias.',
      affects: ['aprovacao', 'separatismo'],
    },
    {
      id: 'transparencia',
      term: 'emendas',
      group: 'politica',
      label: 'Transparência',
      icon: '🔎',
      value: TRANSPARENCY_LABELS[side === 'A' ? p.transparency : p.transparency],
      status: p.transparency === 'alta' ? 'bom' : p.transparency === 'baixa' ? 'ruim' : 'atencao',
      text: 'Rastreio de emendas e limites a sigilos de gastos. Mais transparência torna o gasto mais eficiente, reduz escândalos e juros.',
      affects: ['emendas', 'divida', 'aprovacao'],
      areas: ['Transparência'],
    },
    {
      id: 'emendas',
      term: 'emendas',
      group: 'congresso',
      label: 'Emendas',
      icon: '🧾',
      value: `${fmtNum(b.politics?.emendasTotal ?? p.emendas, 2)}% PIB`,
      status: (b.politics?.emendasTotal ?? p.emendas) > 0.5 ? 'atencao' : 'neutro',
      text: 'Emendas parlamentares: recursos indicados por parlamentares, usados também para formar maioria. Governos impopulares ampliam emendas.',
      affects: ['congresso', 'crescimento'],
      areas: ['Orçamento'],
    },
    {
      id: 'congresso',
      term: 'base-governo',
      group: 'congresso',
      label: 'Base no Congresso',
      icon: '🏛',
      value: `${fmtNum(inst.congressSupport, 0)}%`,
      status: status(inst.congressSupport, 55, 40),
      text: 'Apoio ao governo no Congresso: define a chance de aprovar propostas. Cresce com aprovação, ministério político e emendas.',
      affects: ['leis'],
      series: s((x) => x[side].institutions.congressSupport),
    },
    {
      id: 'ministerio',
      group: 'congresso',
      label: 'Ministério',
      icon: '👔',
      value: CABINET_LABELS[cabinet],
      status: 'neutro',
      text: 'Técnico: políticas mais eficientes e juros menores. Político: mais apoio no Congresso. Afeta também a resposta a desastres.',
      affects: ['congresso', 'crescimento', 'clima'],
    },
    {
      id: 'leis',
      group: 'congresso',
      label: 'Suas leis',
      icon: '📜',
      value: String(lawsPassed),
      status: lawsPassed > 0 ? 'bom' : 'neutro',
      text: 'Leis de sua autoria aprovadas. Cada uma passa por comissões, plenário, casa revisora, sanção ou veto e pode ser questionada no tribunal.',
      affects: ['crescimento', 'aprovacao'],
    },
    {
      id: 'seguranca',
      term: 'seguranca-juridica',
      group: 'justica',
      label: 'Segurança jurídica',
      icon: '⚖',
      value: fmtNum(inst.legalCertainty, 0),
      status: status(inst.legalCertainty, 62, 52),
      text: 'Previsibilidade das regras e decisões. Cai com mudanças de entendimento do tribunal e decisões individuais de impacto; afeta juros, bolsa e investimento.',
      affects: ['bolsa', 'divida', 'crescimento'],
      series: s((x) => x[side].institutions.legalCertainty),
    },
    {
      id: 'tribunal',
      group: 'justica',
      label: 'Tribunal',
      icon: '👩‍⚖️',
      value: `${inst.alignedSeats}/11 alinhados`,
      status: inst.alignedSeats >= 4 ? 'atencao' : 'neutro',
      text: 'Ministros indicados por afinidade com o governo atual. Indicações são do presidente e precisam do Senado; muitas indicações alinhadas aumentam a chance de mudanças de entendimento.',
      affects: ['seguranca'],
    },
    {
      id: 'clima',
      group: 'clima',
      label: 'Desastres',
      icon: '🌪',
      value: climateEvents.length === 0 ? 'nenhum' : `${climateEvents.length} no ano`,
      status: climateEvents.length === 0 ? 'bom' : climateEvents.length > 1 ? 'ruim' : 'atencao',
      text: `Secas, enchentes, queimadas, falta de energia e de água. ${climateEvents.map((e) => e.title).join('; ') || 'Nenhum evento grave neste ano.'}`,
      affects: ['crescimento', 'aprovacao', 'separatismo'],
      areas: ['Clima'],
    },
    {
      id: 'preparo',
      group: 'clima',
      label: 'Prevenção',
      icon: '🛡',
      value: PREPAREDNESS_LABELS[prep],
      status: prep === 'alto' ? 'bom' : prep === 'baixo' ? 'ruim' : 'atencao',
      text: 'Investimento em alertas, drenagem, reservatórios, brigadas e redundância elétrica. Reduz os danos dos desastres.',
      affects: ['clima'],
      areas: ['Clima', 'Meio ambiente'],
    },
    {
      id: 'migracao',
      term: 'migracao',
      group: 'sociedade',
      label: 'Migração',
      icon: '🚶',
      value: `${migration >= 0 ? '+' : '−'}${fmtNum(Math.abs(migration) / 1000, 0)} mil`,
      status: 'neutro',
      text: separated
        ? 'Saldo migratório entre os blocos: vai da região de menor renda para a de maior renda, conforme as políticas de fronteira.'
        : 'Migração interna do Norte e Nordeste para o Centro-Sul, atraída pela diferença de renda. Dentro do país ela é livre (art. 5º, XV).',
      affects: ['crescimento', 'idosos'],
    },
    {
      id: 'idosos',
      group: 'sociedade',
      label: 'Idosos',
      icon: '👵',
      value: `${fmtNum(b.elderlyShare, 1)}%`,
      status: status(b.elderlyShare, 10.9, 12.5, false),
      text: 'Proporção de pessoas com 65 anos ou mais. Acima da média nacional reduz a força de trabalho relativa e o crescimento.',
      affects: ['crescimento'],
    },
  ]
  if (!separated) {
    const m = Math.max(career.movement.A, career.movement.B)
    list.push({
      id: 'separatismo',
      group: 'sociedade',
      label: 'Separatismo',
      icon: '🧭',
      value: `${fmtNum(m, 0)}%`,
      status: status(m, 15, 35, false),
      text: `Apoio a movimentos separatistas (Centro-Sul ${fmtNum(career.movement.A, 0)}%, Norte-Nordeste ${fmtNum(career.movement.B, 0)}%). Cresce com baixa aprovação, escândalos e crises. A federação é indissolúvel (art. 1º): separar seria uma ruptura, que só acontece no jogo se você seguir esse caminho.`,
      affects: [],
    })
  }
  return list
}
