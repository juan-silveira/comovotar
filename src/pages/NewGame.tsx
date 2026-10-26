import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BrazilMap } from '../components/BrazilMap'
import { Button, Card, Disclaimer, Segmented } from '../components/ui'
import { loadMunicipios } from '../lib/ibgeData'
import { fmtNum, fmtPop, lowerFirst } from '../lib/format'
import { useThemeColors } from '../lib/theme'
import type { Office } from '../model/bills'
import { DIFFICULTIES, type Difficulty } from '../model/difficulty'
import { allMissions } from '../model/game'
import { CAPITALS, type Municipio } from '../model/ibge'
import {
  assemblySeats,
  councilSeats,
  FEDERAL_SEATS,
  PARODY_SEATS,
  partiesOf,
  PARTY_SYSTEM_LABELS,
  SPECTRUM_LABELS,
  SPECTRUM_ORDER,
  type PartySystem,
} from '../model/legislature'
import { SEPARATION_LABELS } from '../model/params'
import { ORIGINAL_PARTITION } from '../model/partition'
import { OFFICE_ICONS, OFFICE_ORDER, ROLES } from '../model/roles'
import { STATE_META, type UF } from '../model/states'
import { DEFAULT_BASELINE } from '../model/baseline'
import { useGame } from '../state/game'

export function NewGame() {
  const navigate = useNavigate()
  const { dispatch, career } = useGame()
  const c = useThemeColors()
  const missions = allMissions()
  const [query] = useSearchParams()
  const [missionId, setMissionId] = useState(() => missions.find((m) => m.id === query.get('missao'))?.id ?? missions[0].id)
  const [office, setOffice] = useState<Office>(() => {
    const q = query.get('cargo') as Office | null
    return q && OFFICE_ORDER.includes(q) ? q : 'deputado-federal'
  })
  const [uf, setUf] = useState<UF>('SP')
  const [system, setSystem] = useState<PartySystem>('ficticio')
  const [difficulty, setDifficulty] = useState<Difficulty>('realista')
  const [party, setParty] = useState('UDC')
  const PARTIES = partiesOf(system).filter((p) => p.share > 0)
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null)
  const [munError, setMunError] = useState('')
  const [munOrigin, setMunOrigin] = useState('')
  const [munId, setMunId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const role = ROLES[office]
  const municipal = role.territory === 'municipio'
  const dfBlocked = municipal && uf === 'DF'

  useEffect(() => {
    if (!municipal || uf === 'DF') return
    let alive = true
    setMunicipios(null)
    setMunError('')
    loadMunicipios(uf)
      .then((d) => {
        if (!alive) return
        setMunicipios(d.municipios)
        setMunOrigin(d.origin)
        setMunId(CAPITALS[uf])
      })
      .catch((e: Error) => alive && setMunError(e.message))
    return () => {
      alive = false
    }
  }, [uf, municipal])

  const filtered = useMemo(() => {
    if (!municipios) return []
    const q = search
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    return municipios
      .filter((m) =>
        m.name
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 60)
  }, [municipios, search])
  const municipio = municipios?.find((m) => m.id === munId) ?? null

  const canStart = !dfBlocked && (!municipal || municipio !== null)
  const side = ORIGINAL_PARTITION[uf]
  const unified = missions.find((m) => m.id === missionId)?.separationYear === null
  const st = DEFAULT_BASELINE.states[uf]

  function seatsInfo(): string {
    switch (office) {
      case 'vereador':
      case 'prefeito':
        return municipio ? `Câmara Municipal com ${councilSeats(municipio.pop)} vereadores (art. 29, IV).` : ''
      case 'deputado-estadual':
      case 'governador':
        return `Assembleia com ${assemblySeats(FEDERAL_SEATS[uf])} deputados estaduais (art. 27).`
      case 'deputado-federal':
        return `${uf} elege ${FEDERAL_SEATS[uf]} dos 513 deputados federais: 1 para cada ${fmtNum(st.pop / FEDERAL_SEATS[uf] / 1000, 0)} mil habitantes.`
      case 'senador':
        return `${uf} tem 3 senadores, como todas as UFs: 1 para cada ${fmtNum(st.pop / 3 / 1e6, 2)} milhão de habitantes.`
      case 'presidente':
        return unified ? 'Você governa o Brasil.' : `Você governa o Bloco ${side}.`
      case 'ministro-stf':
        return unified ? 'Você integra o Supremo Tribunal Federal.' : `Você integra o tribunal constitucional do Bloco ${side}.`
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Nova partida</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-2">
          Escolha um cargo e veja, ano a ano, o que ele pode e o que não pode fazer, como as decisões passam pelos
          outros poderes e o que isso causa na economia, no clima e na vida política do país.
        </p>
      </div>
      {career && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">
              Há uma partida em andamento ({ROLES[career.office ?? career.setup.office].title}, ano {career.t}).
            </span>
            <Button onClick={() => navigate('/jogo')}>Continuar partida</Button>
          </div>
        </Card>
      )}

      <Card title="1. Cenário">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Cenário">
          {missions.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={missionId === m.id}
              onClick={() => setMissionId(m.id)}
              className={`rounded-lg border p-3 text-left ${missionId === m.id ? 'border-accent bg-surface-2' : 'border-line hover:bg-surface-2'}`}
            >
              <div className="text-sm font-semibold text-ink">{m.title}</div>
              <div className="text-xs text-muted">
                {m.separationYear === null ? 'Federação (separação só se você seguir esse caminho)' : `Separação ${lowerFirst(SEPARATION_LABELS[m.separation])} desde 2024`}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{m.summary}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card title="2. Cargo">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Cargo">
          {OFFICE_ORDER.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={office === o}
              onClick={() => setOffice(o)}
              className={`rounded-lg border p-3 text-left ${office === o ? 'border-accent bg-surface-2' : 'border-line hover:bg-surface-2'}`}
            >
              <div className="text-sm font-semibold text-ink">
                <span aria-hidden className="mr-1.5 text-lg">
                  {OFFICE_ICONS[o]}
                </span>
                {ROLES[o].title}
              </div>
              <div className="text-xs text-muted">
                {ROLES[o].power} · {ROLES[o].level}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-good">O que pode</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              {role.can.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold text-bad">O que não pode</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
              {role.cannot.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Mandato: {role.termYears ? `${role.termYears} anos` : 'vitalício até os 75 anos'}. {role.reelection}
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card title="3. Território" subtitle="Clique no mapa para escolher a UF">
          <BrazilMap
            ariaLabel="Mapa do Brasil para escolher a UF"
            partition={ORIGINAL_PARTITION}
            fill={(u) => (ORIGINAL_PARTITION[u] === 'A' ? c['series-a'] : c['series-b'])}
            selected={uf}
            onSelect={setUf}
            tooltip={(u) => `${DEFAULT_BASELINE.states[u].name} (${u}) · ${fmtPop(DEFAULT_BASELINE.states[u].pop)}`}
            showBorder={!unified}
            height={380}
          />
          <label className="mt-2 block text-sm text-ink">
            UF
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value as UF)}
              className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
            >
              {Object.values(DEFAULT_BASELINE.states)
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((s) => (
                  <option key={s.uf} value={s.uf}>
                    {s.name} ({s.uf})
                  </option>
                ))}
            </select>
          </label>
        </Card>

        <Card title={municipal ? '4. Município e partido' : '4. Partido'}>
          <div className="space-y-4">
            <p className="text-sm text-ink-2">
              <strong className="text-ink">
                {st.name} · região {STATE_META[uf].region}
                {unified ? '' : ` · Bloco ${side}`}
              </strong>
              <br />
              {seatsInfo()}
            </p>
            {municipal &&
              (dfBlocked ? (
                <p className="rounded-lg bg-warn-bg p-3 text-sm text-warn-ink">
                  O Distrito Federal não pode ser dividido em municípios (CF, art. 32): não há prefeito nem vereadores.
                  Lá, a Câmara Legislativa tem deputados distritais e o governador acumula funções estaduais e
                  municipais. Escolha outra UF para um cargo municipal.
                </p>
              ) : munError ? (
                <p className="text-sm text-bad">Não foi possível carregar os municípios do IBGE: {munError}</p>
              ) : !municipios ? (
                <p className="text-sm text-muted">Carregando municípios do IBGE…</p>
              ) : (
                <div>
                  <label className="block text-sm text-ink">
                    Buscar município ({municipios.length} em {uf}; fonte: {munOrigin})
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Digite o nome"
                      className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
                    />
                  </label>
                  <ul className="mt-2 max-h-56 overflow-y-auto rounded-md border border-line" role="listbox" aria-label="Municípios">
                    {filtered.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={munId === m.id}
                          onClick={() => setMunId(m.id)}
                          className={`flex w-full justify-between gap-2 px-3 py-2 text-left text-sm ${
                            munId === m.id ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-2 hover:bg-surface-2'
                          }`}
                        >
                          <span>{m.name}</span>
                          <span className="tnum text-xs text-muted">{fmtNum(m.pop, 0)} hab.</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {municipio && (
                    <p className="tnum mt-2 text-xs text-muted">
                      {municipio.name}: {fmtNum(municipio.pop, 0)} habitantes (Censo 2022), PIB per capita de R${' '}
                      {fmtNum(municipio.gdp / municipio.pop, 0)} (IBGE).
                    </p>
                  )}
                </div>
              ))}
            {office !== 'ministro-stf' ? (
              <fieldset>
                <legend className="mb-2 text-sm text-ink">Partido</legend>
                <Segmented<PartySystem>
                  label="Sistema partidário"
                  value={system}
                  onChange={(v) => {
                    setSystem(v)
                    setParty(v === 'ficticio' ? 'UDC' : 'PSDi')
                  }}
                  options={[
                    { value: 'ficticio', label: PARTY_SYSTEM_LABELS.ficticio },
                    { value: 'parodia-2026', label: 'Paródia de 2026' },
                  ]}
                />
                {system === 'parodia-2026' && <ParodyComposition />}
                <div className="h-3" />
                <div className="space-y-3">
                  {SPECTRUM_ORDER.map((sp, i) => {
                    const group = PARTIES.filter((p) => p.spectrum === sp)
                    if (group.length === 0) return null
                    return (
                      <div key={sp}>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[11px] font-bold tracking-widest text-muted uppercase">{SPECTRUM_LABELS[sp]}</span>
                          <span className="flex gap-0.5" aria-hidden>
                            {SPECTRUM_ORDER.map((_, k) => (
                              <span key={k} className={`h-1.5 w-3 rounded-sm ${k === i ? 'bg-accent' : 'bg-surface-2'}`} />
                            ))}
                          </span>
                        </div>
                        {group.map((p) => (
                          <label key={p.id} className="flex items-start gap-2 py-0.5 text-sm">
                            <input type="radio" name="party" checked={party === p.id} onChange={() => setParty(p.id)} className="mt-1" />
                            <span>
                              <strong className="text-ink">{p.id}</strong> <span className="text-ink">{p.name}</span>
                              <span className="block text-xs text-ink-2">{p.profile}</span>
                              <span className="block text-xs text-muted">
                                Pragmatismo {p.pragmatism > 0.6 ? 'alto' : p.pragmatism < 0.35 ? 'baixo' : 'médio'} · compromisso
                                democrático {p.democracy >= 0.85 ? 'alto' : p.democracy >= 0.6 ? 'médio' : 'baixo'} ·{' '}
                                {system === 'parodia-2026'
                                  ? `${plural(PARODY_SEATS.camara[p.id] ?? 0, 'deputado', 'deputados')} · ${plural(PARODY_SEATS.senado[p.id] ?? 0, 'senador', 'senadores')}`
                                  : `${Math.round(p.share * 100)}% das cadeiras`}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {system === 'ficticio'
                    ? 'Os partidos são fictícios, para manter a neutralidade: não representam partidos reais. Os dois extremos são definidos pelo mesmo critério, a defesa da ruptura da ordem democrática.'
                    : 'Paródia com nomes e descrições humorísticos. As cadeiras seguem o resultado oficial de 2026 (TSE e Agência Senado) e valem para a legislatura 2027–2030 com o país unido. A posição no espectro é aproximada e discutível; partidos dos extremos não elegeram representantes.'}
                </p>
              </fieldset>
            ) : (
              <p className="text-sm text-ink-2">
                Ministros do STF não podem ser filiados a partidos nem exercer atividade político-partidária (art. 95).
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Dificuldade">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Dificuldade">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border p-3 text-left ${difficulty === d ? 'border-accent bg-surface-2' : 'border-line hover:bg-surface-2'}`}
            >
              <div className="text-sm font-semibold text-ink">
                {d === 'facil' ? '🌱 ' : d === 'realista' ? '⚖️ ' : '🔥 '}
                {DIFFICULTIES[d].label}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{DIFFICULTIES[d].description}</p>
            </button>
          ))}
        </div>
      </Card>

      <Disclaimer compact />
      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={!canStart}
          onClick={() => {
            dispatch({
              type: 'start',
              missionId,
              setup: {
                office,
                uf,
                municipio: municipal ? municipio : null,
                party: office === 'ministro-stf' ? '' : party,
                partySystem: system,
                difficulty,
              },
            })
            navigate('/jogo')
          }}
        >
          Começar como {lowerFirst(role.title)}
        </Button>
      </div>
    </div>
  )
}

/** Composição das casas eleitas em 2026, em barras empilhadas por posição no espectro. */
function ParodyComposition() {
  const parties = partiesOf('parodia-2026')
  const rows: { label: string; seats: Record<string, number>; total: number }[] = [
    { label: 'Câmara dos Deputados', seats: PARODY_SEATS.camara, total: 513 },
    { label: 'Senado Federal (a partir de 2027)', seats: PARODY_SEATS.senado, total: 81 },
  ]
  const order = [...parties].sort((a, b) => SPECTRUM_ORDER.indexOf(a.spectrum) - SPECTRUM_ORDER.indexOf(b.spectrum) || a.econ - b.econ)
  return (
    <div className="mt-3 space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs text-ink-2">
            <span>{row.label}</span>
            <span className="tnum">{row.total} cadeiras · maioria absoluta {Math.floor(row.total / 2) + 1}</span>
          </div>
          <div className="flex h-5 overflow-hidden rounded-md" role="img" aria-label={`Composição: ${order.filter((p) => row.seats[p.id]).map((p) => `${p.id} ${row.seats[p.id]}`).join(', ')}`}>
            {order
              .filter((p) => row.seats[p.id])
              .map((p) => {
                const k = SPECTRUM_ORDER.indexOf(p.spectrum)
                return (
                  <span
                    key={p.id}
                    title={`${p.name} (${p.id}): ${row.seats[p.id]}`}
                    className="flex items-center justify-center border-r-2 border-surface text-[9px] font-semibold last:border-r-0"
                    style={{
                      width: `${(row.seats[p.id] / row.total) * 100}%`,
                      background: SPECTRUM_COLORS[k],
                      color: k >= 2 && k <= 4 ? '#0b0b0b' : '#ffffff',
                    }}
                  >
                    {row.seats[p.id] / row.total > 0.06 ? p.id : ''}
                  </span>
                )
              })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2">
        {SPECTRUM_ORDER.map((sp, k) => (
          <span key={sp} className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SPECTRUM_COLORS[k] }} aria-hidden />
            {SPECTRUM_LABELS[sp]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Escala divergente (vermelho ↔ cinza ↔ azul) para as posições do espectro. */
const SPECTRUM_COLORS = ['#b42323', '#e34948', '#ec8f8e', '#898781', '#86b6ef', '#2a78d6', '#184f95']

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}
