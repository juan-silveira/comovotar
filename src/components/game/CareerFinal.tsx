import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { fmtNum, lowerFirst } from '../../lib/format'
import { unlockedAchievements } from '../../model/achievements'
import { legacyHeadlines } from '../../model/legacy'
import { ObjectivesPanel } from './ObjectivesPanel'
import { difficultyOf } from '../../model/difficulty'
import { INITIALS_RE, normalizeInitials, rememberInitials, savedInitials, submitScore, type SubmitResult } from '../../lib/storage'
import { careerScore } from '../../model/career'
import { ROLES } from '../../model/roles'
import { useGame } from '../../state/game'
import { Button, Card, InfoTip } from '../ui'

export function CareerFinal() {
  const { career, mission, input, results } = useGame()
  const { uid } = useAuth()
  const [initials, setInitials] = useState(savedInitials)
  const [status, setStatus] = useState<'idle' | 'sending' | SubmitResult | 'erro'>('idle')
  const [error, setError] = useState('')
  const [shared, setShared] = useState(false)
  if (!career || !mission || !input) return null
  const s = careerScore(career, input, results, mission)
  const office = career.setup.office
  const valid = INITIALS_RE.test(initials)

  async function submit() {
    if (!uid || !valid || !mission || !career) return
    setStatus('sending')
    try {
      rememberInitials(initials)
      setStatus(
        await submitScore(uid, {
          missionId: mission.id,
          office,
          uf: career.setup.uf,
          initials,
          score: s.total,
          territory: s.territory,
          yearsInOffice: s.yearsInOffice,
          laws: s.laws,
          quiz: s.quiz,
          objectivesMet: s.objectivesMet,
          separation: mission.separation,
        }),
      )
    } catch (e) {
      setError((e as Error).message)
      setStatus('erro')
    }
  }

  const rows: [string, number, string][] = [
    ['Desempenho do seu território', s.territory, '1000 × PIB per capita do território no fim ÷ trajetória sem separação.'],
    ['Anos no cargo', s.yearsInOffice, '10 pontos por ano com mandato.'],
    ['Leis de sua autoria', s.laws, '40 pontos por lei aprovada que você propôs.'],
    ['Perguntas certas', s.quiz, '20 pontos por resposta correta.'],
    ['Objetivos do cenário', s.objectives, '100 pontos por objetivo nacional cumprido.'],
  ]
  const headlines = legacyHeadlines(career, input, results)
  const medals = unlockedAchievements({ career, input, results })

  async function share() {
    if (!career || !mission) return
    const text = `Joguei “Como votar?” como ${lowerFirst(ROLES[office].title)}: ${fmtNum(s.total, 0)} pontos e ${medals.length} conquistas. ${headlines[1]?.text ?? ''}.`
    const url = 'https://comovotar.web.app'
    try {
      if (navigator.share) await navigator.share({ title: 'Como votar?', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setShared(true)
      }
    } catch {
      // compartilhamento cancelado
    }
  }

  return (
    <Card title="Fim da simulação: o seu legado">
      <div className="mb-4 rounded-xl bg-surface-2 p-4">
        <div className="text-[10px] font-bold tracking-widest text-muted uppercase">Retrato de {2023 + career.t}</div>
        <ul className="mt-2 space-y-1.5">
          {headlines.map((h) => (
            <li key={h.text} className={`text-sm font-semibold ${h.good === false ? 'text-bad' : h.good ? 'text-good' : 'text-ink'}`}>
              📰 {h.text}
            </li>
          ))}
        </ul>
        {medals.length > 0 && (
          <p className="mt-3 text-xl" aria-label={`Conquistas: ${medals.map((m) => m.title).join(', ')}`}>
            {medals.map((m) => (
              <span key={m.id} title={m.title} className="mr-1">
                {m.icon}
              </span>
            ))}
          </p>
        )}
        <div className="mt-3">
          <ObjectivesPanel ctx={{ career, input, results }} />
        </div>
        <Button className="mt-3" onClick={share}>
          {shared ? '✓ Texto copiado' : '↗ Compartilhar resultado'}
        </Button>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <div>
          <div className="text-xs text-ink-2">Pontuação</div>
          <div className="tnum text-4xl font-bold text-ink">{fmtNum(s.total, 0)}</div>
          <div className="text-xs text-muted">
            Ranking: {mission.title} · {ROLES[office].title} · dificuldade: {difficultyOf(career.setup.difficulty).label}
          </div>
        </div>
        <table className="tnum text-sm">
          <tbody>
            {rows.map(([label, v, hint]) => (
              <tr key={label}>
                <td className="py-0.5 pr-4 text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <InfoTip text={hint} />
                  </span>
                </td>
                <td className="py-0.5 text-right font-semibold text-ink">{fmtNum(v, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm text-ink">
          Suas iniciais no ranking
          <input
            value={initials}
            onChange={(e) => setInitials(normalizeInitials(e.target.value))}
            placeholder="ABC"
            maxLength={3}
            className="tnum mt-1 block min-h-10 w-24 rounded-md border border-line bg-surface px-2 text-center text-lg font-bold tracking-widest uppercase"
          />
        </label>
        <Button variant="primary" disabled={!valid || !uid || status === 'sending'} onClick={submit}>
          {status === 'sending' ? 'Enviando…' : 'Enviar ao ranking'}
        </Button>
        <Link to={`/ranking?missao=${encodeURIComponent(mission.id)}&cargo=${office}`} className="text-sm text-ink-2 underline">
          Ver ranking
        </Link>
      </div>
      <p className="mt-2 text-xs text-muted">Só as iniciais (2 ou 3 letras) aparecem publicamente. Vale a sua melhor pontuação por cenário e cargo.</p>
      {status === 'novo-recorde' && <p className="mt-2 text-sm text-good">Pontuação registrada.</p>}
      {status === 'sem-melhora' && <p className="mt-2 text-sm text-ink-2">Você já tem uma pontuação igual ou maior aqui.</p>}
      {status === 'erro' && <p className="mt-2 text-sm text-bad">Não foi possível enviar: {error}</p>}
    </Card>
  )
}
