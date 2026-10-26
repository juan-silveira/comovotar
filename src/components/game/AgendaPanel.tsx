import { useState } from 'react'
import { fmtBRL, fmtBRLShort, fmtNum, lowerFirst } from '../../lib/format'
import { FEASIBILITY_LABELS, promisesFor } from '../../model/promises'
import { CAMPAIGN_SPEND, convictionChance, ILLICIT_OFFERS, type CampaignSpend } from '../../model/wealth'
import { BUDGET_OPTIONS, EMENDA_OPTIONS, emendaGrowth, FREE_SHARE } from '../../model/budget'
import { billArguments, billEffectSummary, findBill, type BillTemplate } from '../../model/bills'
import { canRunFor, CRISIS_OPTIONS, nextElectionOfType, separatismOptions, type CareerState, type TurnItem } from '../../model/career'
import { findOption } from '../../model/decisions'
import { findParty, SPECTRUM_LABELS } from '../../model/legislature'
import { OFFICE_ORDER, ROLES } from '../../model/roles'
import { Card, Term } from '../ui'
import { BillView } from './BillView'
import { LegalRefChip } from './LegalRef'

interface Choice {
  id: string
  label: string
  description?: string
  cost?: number
  disabled?: boolean
  pros?: string[]
  cons?: string[]
  /** Linha extra (ex.: efeito estimado) */
  note?: string
}

function Choices({ choices, onChoose, capital }: { choices: Choice[]; onChoose: (id: string) => void; capital: number }) {
  return (
    <div className="mt-3 grid gap-2">
      {choices.map((c) => {
        const tooExpensive = (c.cost ?? 0) > capital
        return (
          <button
            key={c.id}
            type="button"
            disabled={c.disabled || tooExpensive}
            onClick={() => onChoose(c.id)}
            className="rounded-lg border border-line p-3 text-left transition hover:border-accent hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex justify-between gap-2 text-sm font-semibold text-ink">
              <span>{c.label}</span>
              {c.cost ? <span className="tnum text-xs font-normal text-muted">{c.cost} de capital</span> : null}
            </div>
            {c.description && <div className="mt-0.5 text-xs leading-relaxed text-ink-2">{c.description}</div>}
            {(c.pros?.length || c.cons?.length) && (
              <ul className="mt-1.5 space-y-0.5 text-xs leading-snug">
                {c.pros?.map((x) => (
                  <li key={x} className="text-ink-2">
                    <span className="font-bold text-good">+ </span>
                    {x}
                  </li>
                ))}
                {c.cons?.map((x) => (
                  <li key={x} className="text-ink-2">
                    <span className="font-bold text-bad">− </span>
                    {x}
                  </li>
                ))}
              </ul>
            )}
            {c.note && <div className="mt-1 text-[11px] text-muted">{c.note}</div>}
          </button>
        )
      })}
    </div>
  )
}

export function AgendaItem({
  item,
  career,
  onResolve,
  onCareer,
}: {
  item: TurnItem
  career: CareerState
  onResolve: (optionId: string) => void
  onCareer: (office: (typeof OFFICE_ORDER)[number] | null) => void
}) {
  const office = career.office
  const cap = career.capital
  switch (item.kind) {
    case 'card':
      return (
        <div>
          <Tag>Decisão do Executivo{item.side ? ` · Bloco ${item.side}` : ' · tratado'}</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">{item.card.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{item.card.context}</p>
          <p className="mt-2 text-xs text-muted">
            Quem decide: {item.card.decider}. {item.card.legalBasis}
            {item.card.needsCongress && ' Depende de aprovação no Congresso.'}
          </p>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={item.card.options.map((o) => ({ id: o.id, label: o.label, description: o.description }))}
          />
        </div>
      )
    case 'vote-card':
      return (
        <div>
          <Tag>Votação no Congresso</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {item.card.title}: {findOption(item.card.id, item.optionId)?.label}
          </h3>
          <p className="mt-1 text-sm text-ink-2">{findOption(item.card.id, item.optionId)?.description}</p>
          <p className="mt-2 text-sm text-ink-2">
            O presidente enviou a proposta ao Congresso. Como líder da bancada do {career.setup.party}, sua orientação
            muda em cerca de 15 pontos percentuais a chance de aprovação.
          </p>
          <p className="mt-1 text-xs text-muted">{item.card.legalBasis}</p>
          <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
            <div className="text-[11px] font-bold tracking-widest text-muted uppercase">
              <Term id="orientacao">Pressão do seu partido</Term>
            </div>
            <p className="mt-1 text-ink">{item.stance.text}</p>
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              {
                id: 'favor',
                label: 'Orientar a favor',
                description: item.stance.orientation === 'sim' ? 'Segue o partido: +1 de capital político.' : 'Contraria o partido: −2 de capital político.',
              },
              {
                id: 'contra',
                label: 'Orientar contra',
                description: item.stance.orientation === 'nao' ? 'Segue o partido: +1 de capital político.' : 'Contraria o partido: −2 de capital político.',
              },
              { id: 'liberar', label: 'Liberar a bancada', description: 'Cada deputado vota como quiser; o partido vê com desconfiança.' },
            ]}
          />
        </div>
      )
    case 'stf-card':
      return (
        <div>
          <Tag>Ação no tribunal constitucional</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Ação contra “{item.card.title}: {findOption(item.card.id, item.optionId)?.label}”
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            Uma entidade legitimada questiona a medida. Você foi sorteado(a) relator(a).
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="art102" />
            <LegalRefChip id="art103" />
            <LegalRefChip id="art97" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              {
                id: 'liminar',
                label: 'Conceder liminar individual',
                description: 'Suspende a medida por um ano até o plenário decidir. Reduz a segurança jurídica e a sua legitimidade.',
              },
              {
                id: 'plenario',
                label: 'Levar direto ao plenário',
                description: 'Os 11 ministros decidem; a medida segue valendo até o julgamento.',
              },
              { id: 'negar', label: 'Negar seguimento', description: 'Entende que não há inconstitucionalidade evidente.' },
            ]}
          />
        </div>
      )
    case 'quiz':
      return <QuizItem item={item} onResolve={onResolve} />
    case 'crise': {
      const opts = CRISIS_OPTIONS.filter((o) => office && o.offices.includes(office))
      return (
        <div>
          <Tag>Crise no seu território</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">{item.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{item.text}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="lei12608" />
            <LegalRefChip id="art21" />
          </div>
          <Choices capital={cap} onChoose={onResolve} choices={opts.map((o) => ({ id: o.id, label: o.label, description: o.description }))} />
        </div>
      )
    }
    case 'ai-bill-vote': {
      const t = findBill(item.draft.templateId)
      const author = findParty(item.authorParty)
      const st = item.stance
      const consequence = (vote: 'favor' | 'contra') => {
        if (!st || st.orientation === 'liberada') return 'Bancada liberada: sem custo com o partido.'
        const follows = (vote === 'favor') === (st.orientation === 'sim')
        return follows
          ? 'Segue o partido: +1 de capital político e mais apoio da legenda na campanha.'
          : 'Contraria o partido: −2 de capital político e piora a relação com a liderança.'
      }
      const pop = t?.position.popularity ?? 0
      const popular = (vote: 'favor' | 'contra') =>
        Math.abs(pop) < 0.2
          ? ''
          : (vote === 'favor') === pop > 0
            ? ' O eleitor tende a gostar deste voto.'
            : ' O eleitor tende a reprovar este voto.'
      return (
        <div>
          <Tag>Projeto em votação na sua casa</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">{t?.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{t?.summary}</p>
          <p className="mt-2 text-xs text-ink-2">
            Autor: <strong className="text-ink">{author?.name ?? item.authorParty}</strong>
            {author && ` (${lowerFirst(SPECTRUM_LABELS[author.spectrum])}, ${item.authorInGovernment ? 'base do governo' : 'oposição'})`}.
          </p>
          {t && <BillMerits t={t} />}
          {st && (
            <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
              <div className="text-[11px] font-bold tracking-widest text-muted uppercase">
                <Term id="orientacao">Orientação do seu partido</Term>
              </div>
              <p className="mt-1 text-ink">{st.text}</p>
              {st.reason === 'estrategia' && (
                <p className="mt-1 text-xs text-ink-2">
                  Isso é um <Term id="voto-estrategico">voto estratégico</Term>: decidir pelo cálculo político, e não pelo conteúdo. Você
                  pode seguir o partido ou votar pelo mérito e arcar com o custo.
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                Sua relação com o partido: {Math.round(career.partyLoyalty)}/100. <Term id="fidelidade">Fidelidade partidária</Term>
              </p>
            </div>
          )}
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              { id: 'favor', label: 'Votar SIM', description: consequence('favor') + popular('favor') },
              { id: 'contra', label: 'Votar NÃO', description: consequence('contra') + popular('contra') },
              { id: 'abster', label: 'Abster-se', description: 'Não se compromete com nenhum lado; o partido vê com desconfiança.' },
            ]}
          />
        </div>
      )
    }
    case 'bill-pending': {
      const bill = career.activeBill
      if (!bill?.state.pending) return null
      return (
        <div>
          <Tag>Tramitação: sua decisão</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">{bill.state.pending.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{bill.state.pending.text}</p>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={bill.state.pending.options.map((o) => ({ id: o.id, label: o.label, description: o.description, cost: o.cost }))}
          />
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-ink-2">Ver tramitação até aqui</summary>
            <div className="mt-2">
              <BillView bill={bill.state} />
            </div>
          </details>
        </div>
      )
    }
    case 'orcamento': {
      const level = office === 'presidente' ? 'federal' : office === 'governador' ? 'estadual' : 'municipal'
      const house = office === 'presidente' ? 'Congresso' : office === 'governador' ? 'Assembleia' : 'Câmara Municipal'
      const support = Math.round(item.support)
      return (
        <div>
          <Tag>Lei Orçamentária Anual</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">Que orçamento você envia ao Legislativo?</h3>
          <p className="mt-1 text-sm text-ink-2">
            O orçamento diz quanto o governo vai arrecadar e gastar no ano. Só cerca de{' '}
            <strong className="text-ink">{fmtNum(FREE_SHARE[level], 0)}%</strong> dele é livre: o resto já chega “carimbado” com
            salários, aposentadorias, mínimos de saúde e educação e juros da dívida. Você escolhe o que fazer com essa parte.
          </p>
          <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-ink-2">
            Apoio ao governo no {house}: <strong className="text-ink">{support}%</strong>.{' '}
            {support < 35
              ? 'Pouco apoio: o orçamento pode atrasar e custar mais emendas.'
              : support < 50
                ? 'Apoio dividido: espere negociação por emendas.'
                : 'Maioria: o texto deve passar sem grandes mudanças.'}{' '}
            {item.lastGrowth < 1 && 'A economia cresceu pouco no último ano: gastos extras podem ser contingenciados.'}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="art165" />
            <LegalRefChip id="art198" />
            <LegalRefChip id="lrf9" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={BUDGET_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              description: o.description,
              pros: o.pros,
              cons: o.cons,
              note:
                office === 'presidente' && o.fiscal !== 0
                  ? `Impacto no saldo das contas: ${o.fiscal > 0 ? '+' : '−'}${fmtNum(Math.abs(o.fiscal), 1)}% do PIB no ano.`
                  : undefined,
            }))}
          />
        </div>
      )
    }
    case 'emendas':
      return (
        <div>
          <Tag>Emendas parlamentares</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">Para onde vão as suas emendas?</h3>
          <p className="mt-1 text-sm text-ink-2">
            Todo ano você indica onde gastar uma parte do orçamento: cerca de <strong className="text-ink">{fmtBRL(item.value)}</strong>
            {office === 'deputado-estadual' || office === 'vereador' ? ' (estimativa ilustrativa)' : ' (valor de 2026, dividido igualmente)'}.
            {office === 'deputado-federal' || office === 'senador' ? ' Metade precisa ir para a saúde, e o governo é obrigado a pagar.' : ''}{' '}
            Isso equivale a {item.value / item.territoryGdp < 1e-5 ? 'menos de 0,001' : fmtNum((item.value / item.territoryGdp) * 100, 3)}% do PIB de {item.territory}: em lugares
            pequenos, faz diferença; em lugares grandes, quase não aparece.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="art166" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={EMENDA_OPTIONS.map((o) => ({
              id: o.id,
              label: o.label,
              description: o.description,
              pros: o.pros,
              cons: o.cons,
              note: `${(() => {
                const g = emendaGrowth(o, item.value, item.territoryGdp)
                return g < 0.001
                  ? `Efeito na economia de ${item.territory}: praticamente nenhum, pelo tamanho da economia local.`
                  : `Efeito estimado na economia de ${item.territory}: +${fmtNum(g, 3)} p.p. por ano durante ${o.years} ${o.years === 1 ? 'ano' : 'anos'}.`
              })()}${o.capital ? ` +${o.capital} de capital político.` : ''}`,
            }))}
          />
        </div>
      )
    case 'oferta': {
      const offer = ILLICIT_OFFERS.find((o) => o.id === item.offerId)
      if (!offer) return null
      return (
        <div>
          <Tag>Bastidores</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">{offer.title}</h3>
          <p className="mt-1 text-sm text-ink-2">
            {offer.text} Valor oferecido: <strong className="text-ink">{fmtBRL(item.amount)}</strong>. Seu patrimônio hoje:{' '}
            {fmtBRLShort(career.wealth)}.
          </p>
          <p className="mt-2 rounded-lg bg-surface-2 p-2 text-xs text-ink-2">⚖ {offer.law}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id={offer.ref} />
            <LegalRefChip id="lc135" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              {
                id: 'aceitar',
                label: 'Aceitar',
                pros: [`+${fmtBRL(item.amount)} no seu patrimônio, que pode pagar campanhas.`, '+1 de capital político com quem fez a oferta.'],
                cons: [
                  'Aumenta a chance de o esquema vir à tona: reportagem, inquérito, denúncia e julgamento.',
                  'Se condenado(a): perde o mandato, devolve o dinheiro com multa e fica inelegível por 8 anos.',
                ],
              },
              {
                id: 'recusar',
                label: 'Recusar discretamente',
                pros: ['Nenhum risco para você.'],
                cons: ['Quem ofereceu pode procurar outro político.'],
              },
              {
                id: 'denunciar',
                label: 'Denunciar ao Ministério Público',
                pros: ['+3 de aprovação: eleitores valorizam quem denuncia.'],
                cons: ['−2 de capital político: colegas passam a desconfiar de você.'],
              },
            ]}
          />
        </div>
      )
    }
    case 'defesa': {
      const pct = (d: 'advogado' | 'nenhuma') => Math.round(convictionChance(d) * 100)
      return (
        <div>
          <Tag>Processo criminal</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">Você é réu. Como vai se defender?</h3>
          <p className="mt-1 text-sm text-ink-2">
            A acusação aponta {fmtBRL(item.amount)} em vantagens indevidas. O julgamento acontece no próximo ano. Toda
            pessoa acusada tem direito a defesa; a decisão cabe ao tribunal.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="cp317" />
            <LegalRefChip id="lc135" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              {
                id: 'advogado',
                label: 'Contratar um escritório renomado',
                disabled: career.wealth < item.lawyerCost,
                pros: [`Chance de condenação cai para cerca de ${pct('advogado')}%.`],
                cons: [`Custa ${fmtBRL(item.lawyerCost)} do seu patrimônio${career.wealth < item.lawyerCost ? ' (você não tem esse valor)' : ''}.`],
              },
              {
                id: 'delacao',
                label: 'Fazer delação premiada',
                pros: ['Pena reduzida: devolve só o valor recebido, sem multa e sem prisão.'],
                cons: ['Condenação certa e inelegibilidade de 8 anos.', 'Você entrega outros envolvidos e o seu partido se afasta.'],
              },
              {
                id: 'nenhuma',
                label: 'Confiar na defensoria e esperar',
                pros: ['Sem custo.'],
                cons: [`Chance de condenação de cerca de ${pct('nenhuma')}%, com devolução em dobro.`],
              },
            ]}
          />
        </div>
      )
    }
    case 'campanha': {
      const role = ROLES[item.office]
      return (
        <div>
          <Tag>Campanha eleitoral</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">Como você vai financiar a campanha para {lowerFirst(role.title)}?</h3>
          <p className="mt-1 text-sm text-ink-2">
            O teto de gastos para o cargo é de cerca de <strong className="text-ink">{fmtBRL(item.ceiling)}</strong>. Mais dinheiro
            paga impulsionamento nas redes, eventos, material e equipe. Seu patrimônio: {fmtBRLShort(career.wealth)}.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="l9504" />
          </div>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={(Object.keys(CAMPAIGN_SPEND) as CampaignSpend[]).map((id) => {
              const o = CAMPAIGN_SPEND[id]
              const cost = Math.round(item.ceiling * o.share)
              return {
                id,
                label: o.label,
                disabled: cost > career.wealth,
                pros: o.bonus ? [`+${o.bonus} pontos na disputa.`] : ['Nenhum gasto pessoal.'],
                cons: [
                  ...(cost ? [`Custa ${fmtBRL(cost)} do seu patrimônio${cost > career.wealth ? ' (você não tem esse valor)' : ''}.`] : ['Menos dinheiro que os adversários que investem.']),
                  ...(id === 'proprio' ? ['Limite legal: até 10% do teto de gastos.'] : []),
                  ...(id === 'caixa2' ? ['Crime eleitoral: aumenta muito o risco de investigação e de cassação.'] : []),
                ],
              }
            })}
          />
        </div>
      )
    }
    case 'promessa': {
      const role = ROLES[item.office]
      return (
        <div>
          <Tag>{item.initial ? 'Sua campanha' : 'Campanha eleitoral'}</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {item.initial ? `O que você prometeu para se eleger ${lowerFirst(role.title)}?` : `Qual será a sua principal promessa para ${lowerFirst(role.title)}?`}
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            Promessas rendem votos, mas no fim do mandato o eleitor cobra. Cumprir aumenta a aprovação; descumprir derruba,
            e prometer o impossível derruba ainda mais. A etiqueta mostra a análise da sua assessoria.
          </p>
          <Choices
            capital={cap}
            onChoose={onResolve}
            choices={[
              ...promisesFor(item.office).map((p) => ({
                id: p.id,
                label: `${p.feasibility === 'impossivel' ? '⚠️' : p.feasibility === 'dificil' ? '🟡' : '✅'} ${p.label}`,
                description: p.description,
                pros: [item.initial ? 'Ajudou a eleger você.' : `+${p.voteBonus} pontos na disputa desta eleição.`],
                cons: [p.feasibility === 'impossivel' ? `${FEASIBILITY_LABELS[p.feasibility]}: ${p.how}` : `Para cumprir: ${lowerFirst(p.how)}`],
              })),
              {
                id: 'nenhuma',
                label: 'Não fazer promessas específicas',
                description: 'Campanha baseada no que já foi feito.',
                pros: ['Ninguém poderá cobrar uma promessa descumprida.'],
                cons: ['Menos votos do que quem promete.'],
              },
            ]}
          />
        </div>
      )
    }
    case 'separatismo':
      return (
        <div>
          <Tag>Crise federativa</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">
            Movimento separatista ganha força {item.region === 'A' ? 'no Centro-Sul' : 'no Norte e Nordeste'} ({Math.round(item.support)}%)
          </h3>
          <p className="mt-1 text-sm text-ink-2">
            Insatisfação com o governo, escândalos e crises alimentam grupos que defendem a separação da região. A
            Constituição define a federação como indissolúvel e protege a forma federativa como cláusula pétrea: qualquer
            separação seria uma ruptura da ordem constitucional. No jogo, esse caminho existe apenas como hipótese
            educativa, e só acontece se você o seguir.
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <LegalRefChip id="art1" />
            <LegalRefChip id="art60p4" />
          </div>
          <Choices capital={cap} onChoose={onResolve} choices={separatismOptions(office)} />
        </div>
      )
    case 'career':
      return (
        <div>
          <Tag>Carreira</Tag>
          <h3 className="mt-1 text-base font-semibold text-ink">Qual o próximo passo?</h3>
          <p className="mt-1 text-sm text-ink-2">
            Escolha um cargo para disputar. Se a eleição dele não for neste ano, você fica sem mandato até lá. Sua
            popularidade atual ({Math.round(career.approval)}%) pesa na disputa.
          </p>
          <Choices
            capital={cap}
            onChoose={(id) => onCareer(id === 'nenhum' ? null : (id as (typeof OFFICE_ORDER)[number]))}
            choices={[
              ...OFFICE_ORDER.filter((o) => o !== 'ministro-stf').map((o) => {
                const when = nextElectionOfType(o, career.t + 1)
                const limited = career.termLimited.some((x) => x.office === o)
                const blocked = when !== null && !canRunFor(career, o, when)
                const noMunicipio = ROLES[o].territory === 'municipio' && !career.setup.municipio
                return {
                  id: o,
                  label: ROLES[o].title,
                  description: noMunicipio
                    ? 'Disponível apenas para quem começou com um município escolhido.'
                    : blocked
                      ? 'Ainda não: depois de 8 anos seguidos é preciso ficar um mandato inteiro fora.'
                      : `Próxima eleição: ${when !== null ? 2023 + when : '—'}; mandato de ${ROLES[o].termYears} anos.${
                          limited ? ' Você já cumpriu dois mandatos seguidos aqui; como terá ficado um mandato fora, pode voltar a concorrer.' : ''
                        }`,
                  disabled: noMunicipio || blocked,
                }
              }),
              { id: 'nenhum', label: 'Deixar a política', description: 'Acompanha o restante da simulação sem cargo.' },
            ]}
          />
        </div>
      )
  }
}

function QuizItem({ item, onResolve }: { item: Extract<TurnItem, { kind: 'quiz' }>; onResolve: (id: string) => void }) {
  const [answer, setAnswer] = useState<string | null>(null)
  const q = item.quiz
  return (
    <div>
      <Tag>Pode ou não pode? (+20 pontos)</Tag>
      <h3 className="mt-1 text-base font-semibold text-ink">{q.question}</h3>
      {answer === null ? (
        <Choices capital={99} onChoose={setAnswer} choices={q.options.map((o) => ({ id: o.id, label: o.label }))} />
      ) : (
        <div className="mt-3 space-y-2">
          <p className={`text-sm font-semibold ${answer === q.correct ? 'text-good' : 'text-bad'}`}>
            {answer === q.correct ? '✓ Correto!' : `✕ Resposta: ${q.options.find((o) => o.id === q.correct)?.label}`}
          </p>
          <p className="text-sm text-ink-2">{q.explanation}</p>
          <LegalRefChip id={q.ref} />
          <div>
            <button
              type="button"
              onClick={() => onResolve(answer)}
              className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{children}</div>
}

export function AgendaPanel({
  items,
  career,
  onResolve,
  onCareer,
}: {
  items: TurnItem[]
  career: CareerState
  onResolve: (item: TurnItem, optionId: string) => void
  onCareer: (office: (typeof OFFICE_ORDER)[number] | null) => void
}) {
  if (items.length === 0)
    return (
      <Card title="Agenda do ano">
        <p className="text-sm text-ink-2">Nenhuma decisão pendente. Você pode propor um projeto ou avançar o ano.</p>
      </Card>
    )
  const item = items[0]
  return (
    <Card title="Agenda do ano" subtitle={`${items.length} ${items.length === 1 ? 'decisão pendente' : 'decisões pendentes'}`}>
      <AgendaItem item={item} career={career} onResolve={(id) => onResolve(item, id)} onCareer={onCareer} />
    </Card>
  )
}

/** Prós, contras e efeitos estimados de um projeto. */
export function BillMerits({ t }: { t: BillTemplate }) {
  const args = billArguments(t.id)
  const effects = billEffectSummary(t)
  return (
    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <div className="text-[11px] font-bold tracking-widest text-good uppercase">A favor</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-2">
          {args.pros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] font-bold tracking-widest text-bad uppercase">Contra</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-2">
          {args.cons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
      {effects.length > 0 && (
        <div className="sm:col-span-2">
          <div className="text-[11px] font-bold tracking-widest text-muted uppercase">Efeito estimado no jogo</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-ink-2">
            {effects.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
