import { lowerFirst } from '../../lib/format'
import { useState } from 'react'
import { billsFor, NORM_LABELS, NORM_RANK, type BillTemplate, type NormType, type Office, type Vice } from '../../model/bills'
import { legalRef } from '../../model/constitution'
import { officeName, type BillDraft } from '../../model/lawmaking'
import { ROLES } from '../../model/roles'
import { Button, Segmented, Slider } from '../ui'
import { ProposalCreator } from './ProposalCreator'
import type { ProposalContext } from '../../lib/proposalAi'
import type { CustomBill } from '../../model/customBill'
import { LegalRefChip } from './LegalRef'
import { BillMerits } from './AgendaPanel'

const ADVICE_COST = 1

/** Vícios que a assessoria jurídica identificaria. */
export function adviseVices(t: BillTemplate, variantId: string | undefined, norm: NormType, author: Office): Vice[] {
  const v = t.variants?.find((x) => x.id === variantId)
  const out: Vice[] = [...(t.vices ?? []), ...(v?.vices ?? [])]
  if (t.initiative !== 'qualquer' && !t.initiative.includes(author))
    out.push({ ref: t.initiativeRef ?? 'art61p1', kind: 'iniciativa', text: `Só ${t.initiative.map(officeName).join(' ou ')} pode propor este tema.` })
  if (norm === 'medida-provisoria' && author !== 'presidente')
    out.push({ ref: 'art62', kind: 'forma', text: 'Só o presidente edita medidas provisórias.' })
  else if (norm !== 'medida-provisoria' && NORM_RANK[norm] < NORM_RANK[t.requiredNorm])
    out.push({ ref: t.requiredNorm === 'pec' ? 'art60' : 'art69', kind: 'forma', text: `O tema exige ${lowerFirst(NORM_LABELS[t.requiredNorm])}.` })
  return out
}

export function BillComposer({
  office,
  capital,
  onPropose,
  onCancel,
  onSpend,
  initialTemplateId,
  proposalCtx,
  politicalContext = '',
  onCreateCustom,
}: {
  initialTemplateId?: string
  /** Contexto para criar propostas próprias (com IA ou formulário) */
  proposalCtx?: ProposalContext
  politicalContext?: string
  onCreateCustom?: (c: CustomBill) => void
  office: Office
  capital: number
  onPropose: (d: BillDraft) => void
  onCancel: () => void
  onSpend: (n: number) => void
}) {
  const level = ROLES[office].level
  const templates = billsFor(level)
  const [mode, setMode] = useState<'catalogo' | 'criar'>('catalogo')
  const [templateId, setTemplateId] = useState(
    templates.find((x) => x.id === initialTemplateId)?.id ?? templates[0]?.id ?? '',
  )
  const t = templates.find((x) => x.id === templateId)
  const [variantId, setVariantId] = useState<string | undefined>(t?.variants?.[0]?.id)
  const [norm, setNorm] = useState<NormType>(t?.requiredNorm ?? 'lei-ordinaria')
  const [urgency, setUrgency] = useState(false)
  const [bargaining, setBargaining] = useState(0)
  const [advice, setAdvice] = useState<Vice[] | null>(null)

  const norms: NormType[] =
    level === 'federal'
      ? ['lei-ordinaria', 'lei-complementar', 'pec', ...(office === 'presidente' ? (['medida-provisoria'] as NormType[]) : [])]
      : ['lei-ordinaria', 'lei-complementar', 'pec']
  const normLabel = (n: NormType) =>
    level === 'federal' || n !== 'pec' ? NORM_LABELS[n] : level === 'estadual' ? 'Emenda à Constituição Estadual' : 'Emenda à Lei Orgânica'
  const cost = Math.round(bargaining * 4) + (urgency ? 2 : 0)

  const modeToggle = proposalCtx && onCreateCustom && (
    <Segmented
      label="Origem do projeto"
      value={mode}
      onChange={setMode}
      options={[
        { value: 'catalogo', label: 'Escolher um tema' },
        { value: 'criar', label: 'Criar a sua proposta' },
      ]}
    />
  )

  if (mode === 'criar' && proposalCtx && onCreateCustom)
    return (
      <div className="space-y-4">
        {modeToggle}
        <ProposalCreator
          ctx={proposalCtx}
          politicalContext={politicalContext}
          onCreate={(c) => {
            onCreateCustom(c)
            setTemplateId(c.id)
            setVariantId(undefined)
            setNorm(c.analysis.requiredNorm as NormType)
            setAdvice(null)
            setMode('catalogo')
          }}
        />
      </div>
    )

  if (!t) return <p className="text-sm text-muted">Nenhum projeto disponível para este cargo.</p>

  return (
    <div className="space-y-4">
      {modeToggle}
      <label className="block text-sm text-ink">
        Tema
        <select
          value={templateId}
          onChange={(e) => {
            const nt = templates.find((x) => x.id === e.target.value)!
            setTemplateId(nt.id)
            setVariantId(nt.variants?.[0]?.id)
            setNorm(nt.requiredNorm)
            setAdvice(null)
          }}
          className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
        >
          {templates.map((x) => (
            <option key={x.id} value={x.id}>
              {x.area}: {x.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-ink-2">{t.summary}</p>
      <BillMerits t={t} />
      <div className="text-xs text-ink-2">
        Dispositivos: {t.provisions.join('; ')}.
        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
          {t.refs.map((r) => (
            <LegalRefChip key={r} id={r} />
          ))}
        </span>
      </div>

      {t.variants && (
        <fieldset>
          <legend className="mb-1 text-sm text-ink">Redação</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {t.variants.map((v) => (
              <label
                key={v.id}
                className={`rounded-lg border p-3 text-sm ${variantId === v.id ? 'border-accent bg-surface-2' : 'border-line'}`}
              >
                <input
                  type="radio"
                  name="variant"
                  checked={variantId === v.id}
                  onChange={() => {
                    setVariantId(v.id)
                    setAdvice(null)
                  }}
                  className="mr-2"
                />
                <strong className="text-ink">{v.label}</strong>
                <span className="mt-1 block text-xs text-ink-2">{v.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block text-sm text-ink">
        Espécie normativa
        <select
          value={norm}
          onChange={(e) => {
            setNorm(e.target.value as NormType)
            setAdvice(null)
          }}
          className="mt-1 block min-h-10 w-full rounded-md border border-line bg-surface px-2"
        >
          {norms.map((n) => (
            <option key={n} value={n}>
              {normLabel(n)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">
          Lei ordinária: maioria simples. Complementar: maioria absoluta. Emenda constitucional: 3/5 em dois turnos.
          {office === 'presidente' && ' Medida provisória: vale na hora, mas precisa ser convertida em lei.'}
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" checked={urgency} onChange={(e) => setUrgency(e.target.checked)} className="mt-1" />
          <span>
            Pedir urgência (2 de capital)
            <span className="block text-xs text-muted">Vai direto ao plenário; menos tempo para o relator mudar o texto.</span>
          </span>
        </label>
        <Slider
          label="Negociação com líderes"
          value={bargaining}
          min={0}
          max={1}
          step={0.25}
          onChange={setBargaining}
          tooltip="Cargos, emendas e apoio a pautas de outros partidos em troca de votos. Cada nível custa capital político."
          digits={2}
        />
      </div>

      <div className="rounded-lg bg-surface-2 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-ink">Assessoria jurídica</span>
          <Button
            variant="ghost"
            disabled={capital < ADVICE_COST || advice !== null}
            onClick={() => {
              onSpend(ADVICE_COST)
              setAdvice(adviseVices(t, variantId, norm, office))
            }}
          >
            Consultar ({ADVICE_COST} de capital)
          </Button>
        </div>
        {advice !== null &&
          (advice.length === 0 ? (
            <p className="mt-1 text-xs text-good">Nenhum problema constitucional aparente na redação escolhida.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-bad">
              {advice.map((v) => (
                <li key={v.text}>
                  {v.text} <span className="text-muted">({legalRef(v.ref)?.ref})</span>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tnum text-sm text-ink-2">
          Custo: {cost} de {capital} de capital político
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={cost > capital}
            onClick={() => onPropose({ templateId, variantId, norm, urgency, bargaining })}
          >
            Protocolar
          </Button>
        </div>
      </div>
    </div>
  )
}
