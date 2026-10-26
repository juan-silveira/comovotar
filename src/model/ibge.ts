// Consulta aos dados por UF na API de agregados do IBGE (servicodados.ibge.gov.br).
// Este módulo não importa nada em tempo de execução, para poder ser usado
// tanto pelo app quanto pelo script scripts/update-ibge.ts.
//
// Tabelas usadas:
//   4709 – Censo 2022: população residente (v93) e variação absoluta desde 2010 (v5936)
//   5938 – Contas Regionais: PIB a preços correntes (v37), 2002 e último ano disponível
//   9514 – Censo 2022: população por idade, percentual do total (v1000093), faixas de 65 anos ou mais

import type { UF } from './states'

export interface IbgeStateRaw {
  uf: UF
  ibgeId: number
  name: string
  /** População residente, Censo 2022 */
  pop2022: number
  /** População residente, Censo 2010 (compatibilizada) */
  pop2010: number
  /** PIB a preços correntes no primeiro ano da série (R$) */
  gdpStart: number
  /** PIB a preços correntes no último ano disponível (R$) */
  gdpEnd: number
  /** Percentual da população com 65 anos ou mais, Censo 2022 */
  elderlyShare: number
}

export interface IbgeDataset {
  /** ISO 8601 */
  fetchedAt: string
  gdpStartYear: number
  gdpEndYear: number
  states: IbgeStateRaw[]
}

const BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados'
const ALL_UF = 'localidades=N3%5Ball%5D'
const AGE_65_PLUS = [93096, 93097, 93098, 49108, 49109, 60040, 60041, 6653]

export const UF_BY_ID: Record<number, UF> = {
  11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
  21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
  31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
  41: 'PR', 42: 'SC', 43: 'RS',
  50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
}

interface AgregadoSerie {
  localidade: { id: string; nome: string }
  serie: Record<string, string>
}
interface AgregadoVariavel {
  id: string
  resultados: { series: AgregadoSerie[] }[]
}

type Fetcher = (url: string) => Promise<unknown>

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status} para ${url}`)
  return res.json()
}

function num(v: string | undefined): number {
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Valor inválido do IBGE: ${v}`)
  return n
}

/** Consulta as três tabelas e monta o conjunto de dados por UF. */
export async function fetchIbgeDataset(fetcher: Fetcher = defaultFetcher, gdpStartYear = 2002): Promise<IbgeDataset> {
  const [popRaw, gdpStartRaw, gdpEndRaw, ageRaw] = (await Promise.all([
    fetcher(`${BASE}/4709/periodos/2022/variaveis/93%7C5936?${ALL_UF}`),
    fetcher(`${BASE}/5938/periodos/${gdpStartYear}/variaveis/37?${ALL_UF}`),
    fetcher(`${BASE}/5938/periodos/-1/variaveis/37?${ALL_UF}`),
    fetcher(
      `${BASE}/9514/periodos/2022/variaveis/1000093?${ALL_UF}&classificacao=2%5B6794%5D%7C287%5B${AGE_65_PLUS.join(',')}%5D%7C286%5B113635%5D`,
    ),
  ])) as [AgregadoVariavel[], AgregadoVariavel[], AgregadoVariavel[], AgregadoVariavel[]]

  const byId = new Map<number, Partial<IbgeStateRaw>>()
  const get = (id: string) => {
    const n = Number(id)
    if (!byId.has(n)) byId.set(n, { ibgeId: n, uf: UF_BY_ID[n] })
    return byId.get(n)!
  }

  const popVar = popRaw.find((v) => v.id === '93')
  const deltaVar = popRaw.find((v) => v.id === '5936')
  for (const s of popVar?.resultados[0].series ?? []) {
    const st = get(s.localidade.id)
    st.name = s.localidade.nome
    st.pop2022 = num(s.serie['2022'])
  }
  for (const s of deltaVar?.resultados[0].series ?? []) {
    const st = get(s.localidade.id)
    st.pop2010 = (st.pop2022 ?? 0) - num(s.serie['2022'])
  }

  // Tabela 5938 em mil reais.
  for (const s of gdpStartRaw[0]?.resultados[0].series ?? []) {
    get(s.localidade.id).gdpStart = num(s.serie[String(gdpStartYear)]) * 1000
  }
  let gdpEndYear = gdpStartYear
  for (const s of gdpEndRaw[0]?.resultados[0].series ?? []) {
    const year = Number(Object.keys(s.serie)[0])
    gdpEndYear = Math.max(gdpEndYear, year)
    get(s.localidade.id).gdpEnd = num(s.serie[String(year)]) * 1000
  }

  const elderly = new Map<number, number>()
  for (const r of ageRaw[0]?.resultados ?? []) {
    for (const s of r.series) {
      const id = Number(s.localidade.id)
      elderly.set(id, (elderly.get(id) ?? 0) + num(s.serie['2022']))
    }
  }
  for (const [id, v] of elderly) get(String(id)).elderlyShare = v

  const states = [...byId.values()].filter((s) => s.uf) as IbgeStateRaw[]
  validateDataset({ fetchedAt: '', gdpStartYear, gdpEndYear, states })
  return {
    fetchedAt: new Date().toISOString(),
    gdpStartYear,
    gdpEndYear,
    states: states.sort((a, b) => a.ibgeId - b.ibgeId),
  }
}

export function validateDataset(d: IbgeDataset): void {
  if (d.states.length !== 27) throw new Error(`Esperadas 27 UFs, recebidas ${d.states.length}`)
  for (const s of d.states) {
    for (const k of ['pop2022', 'pop2010', 'gdpStart', 'gdpEnd', 'elderlyShare'] as const) {
      if (!(typeof s[k] === 'number' && s[k] > 0)) throw new Error(`Dado ausente: ${s.uf}.${k}`)
    }
  }
}

// Municípios ---------------------------------------------------------------------

export interface Municipio {
  /** Código IBGE de 7 dígitos */
  id: number
  name: string
  uf: UF
  /** População residente, Censo 2022 */
  pop: number
  /** PIB a preços correntes no último ano disponível (R$) */
  gdp: number
}

export interface MunicipiosDataset {
  uf: UF
  fetchedAt: string
  gdpYear: number
  municipios: Municipio[]
}

const ID_BY_UF = Object.fromEntries(Object.entries(UF_BY_ID).map(([id, uf]) => [uf, Number(id)])) as Record<UF, number>

/** Consulta população (Censo 2022) e PIB (último ano) de todos os municípios de uma UF. */
export async function fetchMunicipios(uf: UF, fetcher: Fetcher = defaultFetcher): Promise<MunicipiosDataset> {
  const loc = `localidades=N6%5BN3%5B${ID_BY_UF[uf]}%5D%5D`
  const [popRaw, gdpRaw] = (await Promise.all([
    fetcher(`${BASE}/4709/periodos/2022/variaveis/93?${loc}`),
    fetcher(`${BASE}/5938/periodos/-1/variaveis/37?${loc}`),
  ])) as [AgregadoVariavel[], AgregadoVariavel[]]
  const gdp = new Map<string, number>()
  let gdpYear = 0
  for (const s of gdpRaw[0]?.resultados[0].series ?? []) {
    const year = Number(Object.keys(s.serie)[0])
    gdpYear = Math.max(gdpYear, year)
    const v = Number(s.serie[String(year)])
    if (Number.isFinite(v)) gdp.set(s.localidade.id, v * 1000)
  }
  const municipios: Municipio[] = []
  for (const s of popRaw[0]?.resultados[0].series ?? []) {
    const pop = Number(s.serie['2022'])
    const g = gdp.get(s.localidade.id)
    if (!Number.isFinite(pop) || g === undefined) continue
    municipios.push({
      id: Number(s.localidade.id),
      name: s.localidade.nome.replace(/ - [A-Z]{2}$/, ''),
      uf,
      pop,
      gdp: g,
    })
  }
  if (municipios.length === 0) throw new Error(`Nenhum município retornado para ${uf}`)
  municipios.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { uf, fetchedAt: new Date().toISOString(), gdpYear, municipios }
}

/** Capitais (código IBGE), usadas como sugestão inicial. */
export const CAPITALS: Record<UF, number> = {
  RO: 1100205, AC: 1200401, AM: 1302603, RR: 1400100, PA: 1501402, AP: 1600303, TO: 1721000,
  MA: 2111300, PI: 2211001, CE: 2304400, RN: 2408102, PB: 2507507, PE: 2611606, AL: 2704302, SE: 2800308, BA: 2927408,
  MG: 3106200, ES: 3205309, RJ: 3304557, SP: 3550308,
  PR: 4106902, SC: 4205407, RS: 4314902,
  MS: 5002704, MT: 5103403, GO: 5208707, DF: 5300108,
}
