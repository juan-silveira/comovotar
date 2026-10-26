// O mundo lá fora: crises globais que atingem o Brasil por canais diferentes
// (petróleo, alimentos, crédito, exportações) e as respostas do governo.
// Os blocos sentem de forma diferente conforme a pauta exportadora: o Bloco
// A (Centro-Sul) tem mais indústria e serviços; o B (Norte e Nordeste)
// depende mais de commodities e de transferências. Magnitudes são hipóteses.

import { hashString } from './legislature'
import { mulberry32, type EventOccurrence } from './events'

export type GlobalEventId = 'guerra' | 'pandemia' | 'retomada' | 'crise-financeira' | 'tarifas' | 'china' | 'acordo-ue'

interface GlobalEventDef {
  id: GlobalEventId
  weight: number
  duration: number
  title: string
  effectA: number
  effectB: number
  explanation: string
}

const DEFS: GlobalEventDef[] = [
  {
    id: 'guerra',
    weight: 3,
    duration: 2,
    title: 'Guerra em região produtora de petróleo',
    effectA: -0.5,
    effectB: -0.4,
    explanation:
      'O conflito encarece petróleo, gás e fertilizantes. Combustível e alimentos sobem, a inflação aperta e o Banco Central segura os juros. O agronegócio paga mais caro pelo adubo importado.',
  },
  {
    id: 'pandemia',
    weight: 1,
    duration: 1,
    title: 'Pandemia global',
    effectA: -3.2,
    effectB: -2.8,
    explanation:
      'Um novo vírus se espalha pelo mundo. Comércio e serviços param, o desemprego dispara e hospitais lotam. A recuperação depende da resposta de saúde e do apoio a famílias e empresas.',
  },
  {
    id: 'crise-financeira',
    weight: 2,
    duration: 1,
    title: 'Crise financeira global',
    effectA: -1.3,
    effectB: -0.9,
    explanation:
      'A quebra de grandes bancos no exterior seca o crédito. Investidores tiram dinheiro de países emergentes, o dólar sobe e empresas adiam investimentos.',
  },
  {
    id: 'tarifas',
    weight: 3,
    duration: 2,
    title: 'Guerra comercial: tarifas sobre exportações brasileiras',
    effectA: -0.4,
    effectB: -0.3,
    explanation:
      'Uma grande economia impõe tarifas sobre produtos brasileiros, como aço, carne, café e suco de laranja. Exportadores perdem mercado e procuram outros compradores.',
  },
  {
    id: 'china',
    weight: 3,
    duration: 2,
    title: 'Desaceleração da China',
    effectA: -0.2,
    effectB: -0.5,
    explanation:
      'A China, maior compradora do Brasil, cresce menos e importa menos minério, soja e petróleo. Regiões exportadoras de commodities sentem mais.',
  },
  {
    id: 'acordo-ue',
    weight: 2,
    duration: 3,
    title: 'Acordo Mercosul–União Europeia entra em vigor',
    effectA: 0.25,
    effectB: 0.15,
    explanation:
      'Tarifas caem gradualmente dos dois lados. O agronegócio ganha mercado; parte da indústria enfrenta mais concorrência europeia e exige regras de transição.',
  },
]

/** Chance anual de uma crise ou choque global, %. */
export const GLOBAL_PROBABILITY = 14

const occurrence = (d: GlobalEventDef, t: number): EventOccurrence => ({
  id: d.id,
  year: t,
  duration: d.duration,
  title: d.title,
  effectA: d.effectA,
  effectB: d.effectB,
  explanation: d.explanation,
})

/**
 * Sorteia o choque global do ano t. `previous` são os eventos que começaram
 * no ano anterior (uma pandemia é seguida de retomada parcial).
 */
export function drawGlobal(seed: number, t: number, previous: EventOccurrence[], active: EventOccurrence[], probability = GLOBAL_PROBABILITY): EventOccurrence[] {
  if (previous.some((e) => e.id === 'pandemia' && e.year === t - 1))
    return [
      {
        id: 'retomada',
        year: t,
        duration: 1,
        title: 'Retomada depois da pandemia',
        effectA: 2.2,
        effectB: 1.8,
        explanation: 'Com a vacinação e a reabertura, comércio e serviços voltam a funcionar e a economia recupera parte da queda.',
      },
    ]
  const rng = mulberry32((seed ^ hashString(`global:${t}`)) >>> 0)
  if (t < 2 || rng() >= probability / 100) return []
  const activeIds = new Set(active.map((e) => e.id))
  const pool = DEFS.filter((d) => !activeIds.has(d.id))
  const total = pool.reduce((a, d) => a + d.weight, 0)
  let x = rng() * total
  for (const d of pool) {
    x -= d.weight
    if (x <= 0) return [occurrence(d, t)]
  }
  return []
}

export function isGlobalEvent(id: string): id is GlobalEventId {
  return DEFS.some((d) => d.id === id) || id === 'retomada'
}

// Respostas do governo --------------------------------------------------------------------------

export interface GlobalResponse {
  id: string
  label: string
  pros: string[]
  cons: string[]
  /** Efeito no ano seguinte ao choque: crescimento (p.p.), saldo primário (% do PIB), aprovação */
  growth: number
  fiscal: number
  approval: number
  cost?: number
}

const STIMULUS: GlobalResponse = {
  id: 'estimulo',
  label: 'Estímulo: gastar mais para proteger empregos',
  pros: ['Amortece a queda da economia e do emprego.', 'Aumenta a aprovação no curto prazo.'],
  cons: ['Aumenta o déficit e a dívida.', 'Se a crise for longa, o dinheiro acaba antes dela.'],
  growth: 0.4,
  fiscal: -0.6,
  approval: 2,
}
const PRUDENCE: GlobalResponse = {
  id: 'prudencia',
  label: 'Prudência: segurar gastos e esperar passar',
  pros: ['Preserva as contas e a credibilidade com os investidores.'],
  cons: ['A população sente a crise sem ajuda (−3 de aprovação).'],
  growth: -0.1,
  fiscal: 0.1,
  approval: -3,
}

export const GLOBAL_RESPONSES: Record<GlobalEventId, GlobalResponse[]> = {
  guerra: [
    {
      id: 'subsidio',
      label: 'Subsidiar combustíveis e fertilizantes',
      pros: ['Segura o preço na bomba e do adubo (+3 de aprovação).'],
      cons: ['Custo fiscal alto e beneficia também quem não precisa.'],
      growth: 0.2,
      fiscal: -0.4,
      approval: 3,
    },
    {
      id: 'neutralidade',
      label: 'Neutralidade diplomática e busca de novos fornecedores',
      pros: ['Mantém comércio com os dois lados e reduz a dependência.'],
      cons: ['Críticas de aliados tradicionais; resultado lento.'],
      growth: 0.15,
      fiscal: 0,
      approval: 0,
      cost: 1,
    },
    PRUDENCE,
  ],
  pandemia: [
    {
      id: 'auxilio',
      label: 'Auxílio emergencial e apoio a empresas, com medidas de saúde',
      pros: ['Protege a renda dos mais pobres e evita falências (+6 de aprovação).', 'Acelera a retomada.'],
      cons: ['Custo muito alto: a dívida dá um salto.'],
      growth: 1.2,
      fiscal: -3,
      approval: 6,
    },
    {
      id: 'saude',
      label: 'Priorizar vacinas e hospitais, com auxílio menor',
      pros: ['Salva vidas e abre caminho para reabrir a economia.'],
      cons: ['Famílias informais ficam com pouca ajuda.'],
      growth: 0.6,
      fiscal: -1.2,
      approval: 3,
    },
    {
      id: 'minimizar',
      label: 'Minimizar a doença e manter tudo aberto',
      pros: ['Menos gasto público imediato.'],
      cons: ['Mais mortes e hospitais lotados derrubam a confiança (−8 de aprovação).', 'A economia sofre mesmo assim.'],
      growth: -0.3,
      fiscal: -0.2,
      approval: -8,
    },
  ],
  retomada: [],
  'crise-financeira': [
    STIMULUS,
    {
      id: 'credito',
      label: 'Liberar crédito pelos bancos públicos',
      pros: ['Empresas conseguem capital de giro e evitam demissões.'],
      cons: ['Risco de calote e de usar os bancos para fins políticos.'],
      growth: 0.3,
      fiscal: -0.2,
      approval: 1,
    },
    PRUDENCE,
  ],
  tarifas: [
    {
      id: 'negociar',
      label: 'Negociar na OMC e diretamente com o país',
      pros: ['Pode reduzir as tarifas sem escalar o conflito.'],
      cons: ['Resultado lento e incerto; custa capital político (−1).'],
      growth: 0.2,
      fiscal: 0,
      approval: 0,
      cost: 1,
    },
    {
      id: 'retaliar',
      label: 'Retaliar com tarifas sobre produtos deles',
      pros: ['Demonstra firmeza e agrada parte do eleitorado (+2).'],
      cons: ['Encarece importados e pode escalar a disputa.'],
      growth: -0.1,
      fiscal: 0.05,
      approval: 2,
    },
    {
      id: 'mercados',
      label: 'Abrir novos mercados para os exportadores',
      pros: ['Diversifica compradores no médio prazo.'],
      cons: ['Exige missões comerciais e acordos que levam anos.'],
      growth: 0.15,
      fiscal: -0.05,
      approval: 0,
    },
  ],
  china: [
    STIMULUS,
    {
      id: 'diversificar',
      label: 'Diversificar exportações e atrair investimento industrial',
      pros: ['Reduz a dependência de poucos produtos e de um comprador.'],
      cons: ['Efeito só no longo prazo; incentivos custam.'],
      growth: 0.1,
      fiscal: -0.1,
      approval: 0,
    },
    PRUDENCE,
  ],
  'acordo-ue': [
    {
      id: 'transicao',
      label: 'Criar programa de transição para a indústria afetada',
      pros: ['Reduz demissões nos setores que perdem proteção.'],
      cons: ['Custo fiscal moderado.'],
      growth: 0.1,
      fiscal: -0.1,
      approval: 1,
    },
    {
      id: 'aproveitar',
      label: 'Focar em exportar mais: missões e certificações ambientais',
      pros: ['Amplia os ganhos do acordo para o agro e a indústria competitiva.'],
      cons: ['Exige cumprir regras ambientais europeias mais rígidas.'],
      growth: 0.15,
      fiscal: -0.05,
      approval: 0,
    },
  ],
}
