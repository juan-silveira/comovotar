import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { fmtNum } from '../../lib/format'
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
  return (
    <Card title="Fim da simulação: balanço da carreira">
      <div className="flex flex-wrap items-start gap-8">
        <div>
          <div className="text-xs text-ink-2">Pontuação</div>
          <div className="tnum text-4xl font-bold text-ink">{fmtNum(s.total, 0)}</div>
          <div className="text-xs text-muted">Ranking: {mission.title} · {ROLES[office].title}</div>
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
