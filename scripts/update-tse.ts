// Gera estatísticas de patrimônio declarado dos eleitos, por cargo, a partir
// dos dados abertos do TSE (candidatos e bens declarados). Só números
// agregados: nenhum nome ou CPF é salvo.
// Uso: npm run update-tse   (requer o comando `unzip` instalado)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MIN_GROUP = 50
const CDN = 'https://cdn.tse.jus.br/estatistica/sead/odsele'
const dir = mkdtempSync(join(tmpdir(), 'tse-'))

async function download(kind: 'consulta_cand' | 'bem_candidato', year: number): Promise<string> {
  const path = join(dir, `${kind}_${year}.zip`)
  const res = await fetch(`${CDN}/${kind}/${kind}_${year}.zip`)
  if (!res.ok) throw new Error(`TSE ${kind} ${year}: ${res.status}`)
  writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  return path
}

/** Linhas de todos os CSVs por UF do zip (o arquivo BRASIL repete os dados e é ignorado). */
function* rows(zip: string): Generator<Record<string, string>> {
  const files = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.csv') && !f.includes('BRASIL'))
  const latin1 = new TextDecoder('latin1')
  for (const f of files) {
    const text = latin1.decode(execFileSync('unzip', ['-p', zip, f], { maxBuffer: 1 << 30 }))
    let header: string[] | null = null
    for (const cols of parseCsv(text)) {
      if (!header) {
        header = cols
        continue
      }
      if (cols.length !== header.length) continue
      const row: Record<string, string> = {}
      header.forEach((h, j) => (row[h] = cols[j]))
      yield row
    }
  }
}

/** CSV com `;` e campos entre aspas (que podem conter quebras de linha). */
function* parseCsv(text: string): Generator<string[]> {
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ';') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1) yield row
      row = []
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    yield row
  }
}

interface Candidate {
  cargo: string
  elected: boolean
  cpf: string
}

async function load(year: number) {
  const cands = new Map<string, Candidate>()
  for (const r of rows(await download('consulta_cand', year))) {
    const sq = r.SQ_CANDIDATO
    const elected = r.DS_SIT_TOT_TURNO.startsWith('ELEITO')
    const prev = cands.get(sq)
    if (prev) {
      if (r.NR_TURNO === '2') prev.elected = elected
      continue
    }
    cands.set(sq, { cargo: r.DS_CARGO === 'DEPUTADO DISTRITAL' ? 'DEPUTADO ESTADUAL' : r.DS_CARGO, elected, cpf: r.NR_CPF_CANDIDATO })
  }
  const assets = new Map<string, number>()
  for (const r of rows(await download('bem_candidato', year))) {
    const v = Number((r.VR_BEM_CANDIDATO || '0').replace(',', '.'))
    assets.set(r.SQ_CANDIDATO, (assets.get(r.SQ_CANDIDATO) ?? 0) + (Number.isFinite(v) ? v : 0))
  }
  return { cands, assets }
}

function quantile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b)
  const k = (s.length - 1) * p
  const f = Math.floor(k)
  return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (k - f)
}

const round = (v: number) => Math.round(v)

function push<T>(m: Map<string, T[]>, key: string, v: T) {
  const list = m.get(key)
  if (list) list.push(v)
  else m.set(key, [v])
}

function stats(values: number[]) {
  return {
    n: values.length,
    p25: round(quantile(values, 0.25)),
    median: round(quantile(values, 0.5)),
    p75: round(quantile(values, 0.75)),
    p90: round(quantile(values, 0.9)),
    zeroShare: values.filter((v) => v === 0).length / values.length,
    millionShare: values.filter((v) => v >= 1e6).length / values.length,
  }
}

const OFFICES: Record<string, string> = {
  VEREADOR: 'vereador',
  PREFEITO: 'prefeito',
  'DEPUTADO ESTADUAL': 'deputado-estadual',
  GOVERNADOR: 'governador',
  'DEPUTADO FEDERAL': 'deputado-federal',
  SENADOR: 'senador',
  PRESIDENTE: 'presidente',
}

const out: Record<string, unknown> = {}
const byYear: Record<number, Awaited<ReturnType<typeof load>>> = {}
for (const year of [2024, 2026, 2022]) {
  byYear[year] = await load(year)
  console.log(`${year}: ${byYear[year].cands.size} candidaturas`)
}

const offices: Record<string, unknown> = {}
for (const year of [2024, 2026]) {
  const { cands, assets } = byYear[year]
  const elected = new Map<string, number[]>()
  const all = new Map<string, number[]>()
  for (const [sq, c] of cands) {
    const id = OFFICES[c.cargo]
    if (!id) continue
    const v = assets.get(sq) ?? 0
    push(all, id, v)
    if (c.elected) push(elected, id, v)
  }
  for (const [id, vals] of all) {
    const el = elected.get(id) ?? []
    // Grupos pequenos quase identificam pessoas: com menos de 50 eleitos usa
    // todos os candidatos ao cargo; com menos de 50 candidatos, omite o cargo.
    if (el.length >= MIN_GROUP) offices[id] = { year, group: 'eleitos', ...stats(el), candidates: stats(vals) }
    else if (vals.length >= MIN_GROUP) offices[id] = { year, group: 'candidatos', ...stats(vals) }
  }
}

// Reeleitos no mesmo cargo: 2022 → 2026, pareados pelo CPF (não salvo).
const growth: Record<string, unknown> = {}
const e22 = new Map<string, { cargo: string; value: number }>()
for (const [sq, c] of byYear[2022].cands)
  if (c.elected && /^\d{11}$/.test(c.cpf)) e22.set(c.cpf, { cargo: c.cargo, value: byYear[2022].assets.get(sq) ?? 0 })
const pairs = new Map<string, [number, number][]>()
for (const [sq, c] of byYear[2026].cands) {
  const before = e22.get(c.cpf)
  const id = OFFICES[c.cargo]
  if (!c.elected || !before || before.cargo !== c.cargo || before.value <= 0 || !id) continue
  push(pairs, id, [before.value, byYear[2026].assets.get(sq) ?? 0] as [number, number])
}
for (const [id, ps] of pairs) {
  if (ps.length < MIN_GROUP) continue
  const g = ps.map(([a, b]) => b / a - 1)
  growth[id] = {
    n: ps.length,
    medianGrowth: quantile(g, 0.5),
    grewShare: g.filter((x) => x > 0).length / g.length,
    doubledShare: g.filter((x) => x > 1).length / g.length,
    median2022: round(quantile(ps.map((p) => p[0]), 0.5)),
    median2026: round(quantile(ps.map((p) => p[1]), 0.5)),
  }
}

out.fetchedAt = new Date().toISOString().slice(0, 10)
out.source = 'TSE, Portal de Dados Abertos: candidatos e bens declarados (2022, 2024 e 2026)'
out.offices = offices
out.reelectedGrowth = growth
writeFileSync(new URL('../src/model/tse-patrimonio.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
rmSync(dir, { recursive: true, force: true })
console.log('Estatísticas salvas em src/model/tse-patrimonio.json')
