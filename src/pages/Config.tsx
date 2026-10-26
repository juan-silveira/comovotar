import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PartitionEditor } from '../components/PartitionEditor'
import { BlockTag, Button, CalibrateBadge, Card, InfoTip, Segmented, Slider } from '../components/ui'
import { fmtPct } from '../lib/format'
import { PREPAREDNESS_DESCRIPTIONS, PREPAREDNESS_LABELS, type Preparedness } from '../model/climate'
import { CABINET_DESCRIPTIONS, CABINET_LABELS, COURT_DESCRIPTIONS, COURT_LABELS, type Cabinet, type CourtNomination } from '../model/institutions'
import {
  COEF_META,
  DEFAULT_COEFFICIENTS,
  FIRM_POLICY_DESCRIPTIONS,
  FIRM_POLICY_LABELS,
  MIGRATION_POLICY_DESCRIPTIONS,
  MIGRATION_POLICY_LABELS,
  PARAM_META,
  SEPARATION_DESCRIPTIONS,
  SEPARATION_LABELS,
  type FirmPolicy,
  type MigrationPolicy,
  type Params,
  type SeparationType,
} from '../model/params'
import { TRANSPARENCY_DESCRIPTIONS, TRANSPARENCY_LABELS, type Transparency } from '../model/politics'
import { randomSeed, useScenario } from '../state/scenario'

const SEPARATIONS: SeparationType[] = ['amigavel', 'intermediaria', 'conflituosa']
type Group = 'basico' | 'avancado' | 'politica' | 'politicas'

/** Controle de uma política, um por bloco, com o mesmo destaque. */
function PolicyPair<T extends string>({
  title,
  tooltip,
  labels,
  descriptions,
  valueA,
  valueB,
  onChange,
}: {
  title: string
  tooltip: string
  labels: Record<T, string>
  descriptions: Record<T, string>
  valueA: T
  valueB: T
  onChange: (side: 'A' | 'B', v: T) => void
}) {
  const options = (Object.keys(labels) as T[]).map((k) => ({ value: k, label: labels[k] }))
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {title}
        <InfoTip text={tooltip} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['A', 'B'] as const).map((side) => {
          const v = side === 'A' ? valueA : valueB
          return (
            <div key={side}>
              <div className="mb-1 text-xs text-ink-2">
                <BlockTag block={side} />
              </div>
              <Segmented label={`${title} do Bloco ${side}`} value={v} onChange={(x) => onChange(side, x)} options={options} />
              <p className="mt-1 text-xs leading-relaxed text-muted">{descriptions[v]}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Config() {
  const navigate = useNavigate()
  const { state, dispatch, results } = useScenario()
  const [group, setGroup] = useState<Group>('basico')
  const p = state.params
  const lossB = results[1]?.detail.transferLossB ?? 0
  const set = (patch: Partial<Params>) => dispatch({ type: 'params', patch })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Laboratório: configuração</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Monte qualquer divisão do país e ajuste todas as hipóteses do modelo. Para jogar com um cargo político,
            use “Jogar”.
          </p>
          <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
            Nome do cenário
            <input
              value={state.name}
              onChange={(e) => dispatch({ type: 'meta', patch: { name: e.target.value } })}
              className="min-h-9 rounded-md border border-line bg-surface px-2 text-ink"
              maxLength={80}
            />
          </label>
        </div>
        <Button variant="primary" onClick={() => navigate('/simulacao')}>
          Ir para a simulação
        </Button>
      </div>

      <Card
        title="Divisão do país"
        subtitle="O Bloco A é sempre o de maior PIB per capita (contribuinte líquido do orçamento federal)"
      >
        <PartitionEditor
          baseline={state.baseline}
          partition={p.partition}
          onChange={(partition) => dispatch({ type: 'partition', partition })}
          notice={
            state.partitionSwapped
              ? 'Os rótulos foram trocados: o grupo escolhido tinha renda per capita menor e virou o Bloco B. Transferências, exposição comercial, energia e recursos foram recalculados para a nova divisão.'
              : 'Transferências, exposição comercial, energia, recursos e divisão da dívida são recalculados a cada mudança (hipóteses a calibrar).'
          }
        />
      </Card>

      <Card title="Tipo de separação" subtitle="Define comércio perdido, choque de transição, prêmio de risco e fronteira">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tipo de separação">
          {SEPARATIONS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={p.separation === s}
              onClick={() => dispatch({ type: 'separation', separation: s })}
              className={`rounded-lg border p-3 text-left transition ${
                p.separation === s ? 'border-accent bg-surface-2' : 'border-line hover:bg-surface-2'
              }`}
            >
              <div className="text-sm font-semibold text-ink">{SEPARATION_LABELS[s]}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{SEPARATION_DESCRIPTIONS[s]}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="Parâmetros"
        actions={
          <Segmented
            label="Grupo de parâmetros"
            value={group}
            onChange={setGroup}
            options={[
              { value: 'basico', label: 'Básico' },
              { value: 'politicas', label: 'Políticas' },
              { value: 'politica', label: 'Política' },
              { value: 'avancado', label: 'Avançado' },
            ]}
          />
        }
      >
        {group === 'politicas' ? (
          <div className="space-y-6">
            <PolicyPair<MigrationPolicy>
              title="Política migratória"
              tooltip="Entrada de trabalhadores do outro bloco. A migração vai do bloco de menor renda para o de maior renda; migrantes jovens reduzem o envelhecimento no destino."
              labels={MIGRATION_POLICY_LABELS}
              descriptions={MIGRATION_POLICY_DESCRIPTIONS}
              valueA={p.migrationPolicyA}
              valueB={p.migrationPolicyB}
              onChange={(side, v) => set(side === 'A' ? { migrationPolicyA: v } : { migrationPolicyB: v })}
            />
            <PolicyPair<FirmPolicy>
              title="Política para empresas"
              tooltip="Incentivos para atrair empresas ou restrições para afastar as do outro bloco."
              labels={FIRM_POLICY_LABELS}
              descriptions={FIRM_POLICY_DESCRIPTIONS}
              valueA={p.firmPolicyA}
              valueB={p.firmPolicyB}
              onChange={(side, v) => set(side === 'A' ? { firmPolicyA: v } : { firmPolicyB: v })}
            />
            <PolicyPair<Preparedness>
              title="Preparo para desastres climáticos"
              tooltip="Investimento em alertas, drenagem, reservatórios, brigadas e redundância elétrica."
              labels={PREPAREDNESS_LABELS}
              descriptions={PREPAREDNESS_DESCRIPTIONS}
              valueA={p.climatePrepA}
              valueB={p.climatePrepB}
              onChange={(side, v) => set(side === 'A' ? { climatePrepA: v } : { climatePrepB: v })}
            />
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={p.climateEnabled} onChange={(e) => set({ climateEnabled: e.target.checked })} className="h-4 w-4" />
              Eventos climáticos localizados (secas, enchentes, queimadas, falta de energia e de água)
            </label>
          </div>
        ) : group === 'politica' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-6 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={p.politicsEnabled} onChange={(e) => set({ politicsEnabled: e.target.checked })} className="h-4 w-4" />
                Eleições, aprovação, fundos e emendas
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={p.institutionsEnabled}
                  onChange={(e) => set({ institutionsEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
                Ministério, tribunal, Congresso e bolsa
              </label>
            </div>
            <PolicyPair<Cabinet>
              title="Perfil do ministério"
              tooltip="Eficiência das políticas contra apoio no Congresso."
              labels={CABINET_LABELS}
              descriptions={CABINET_DESCRIPTIONS}
              valueA={p.cabinetA}
              valueB={p.cabinetB}
              onChange={(side, v) => set(side === 'A' ? { cabinetA: v } : { cabinetB: v })}
            />
            <PolicyPair<CourtNomination>
              title="Critério de indicação ao tribunal"
              tooltip="O presidente indica e o Senado aprova. O critério afeta a segurança jurídica."
              labels={COURT_LABELS}
              descriptions={COURT_DESCRIPTIONS}
              valueA={p.courtA}
              valueB={p.courtB}
              onChange={(side, v) => set(side === 'A' ? { courtA: v } : { courtB: v })}
            />
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                Transparência do gasto (sigilos e emendas)
                <InfoTip text="Vale para os dois blocos no início; a carta de reforma política pode mudar em cada bloco." />
              </div>
              <Segmented<Transparency>
                label="Transparência do gasto"
                value={p.transparency}
                onChange={(v) => set({ transparency: v })}
                options={(Object.keys(TRANSPARENCY_LABELS) as Transparency[]).map((k) => ({ value: k, label: TRANSPARENCY_LABELS[k] }))}
              />
              <p className="mt-1 text-xs text-muted">{TRANSPARENCY_DESCRIPTIONS[p.transparency]}</p>
            </div>
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              {PARAM_META.filter((m) => m.group === 'politica').map((m) => (
                <Slider
                  key={m.key}
                  label={m.label}
                  value={p[m.key] as number}
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  unit={m.unit}
                  tooltip={m.tooltip}
                  onChange={(v) => set({ [m.key]: v })}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {PARAM_META.filter((m) => m.group === group).map((m) => (
              <Slider
                key={m.key}
                label={m.label}
                value={p[m.key] as number}
                min={m.min}
                max={m.max}
                step={m.step}
                unit={m.unit}
                tooltip={m.tooltip}
                badge={m.calibrate ? <CalibrateBadge /> : undefined}
                disabled={m.key === 'eventProbability' && !p.eventsEnabled}
                onChange={(v) => set({ [m.key]: v })}
              />
            ))}
            {group === 'basico' && (
              <div className="rounded-lg bg-surface-2 p-3 text-sm">
                <div className="flex items-center gap-1.5 text-ink">
                  Perda de transferências para B
                  <InfoTip text="Calculada automaticamente: a transferência de A convertida para a base do PIB de B (transferência × PIB de A ÷ PIB de B). O modelo desconta dela a arrecadação que migra para B." />
                </div>
                <div className="tnum mt-1 text-lg font-semibold text-ink">{fmtPct(lossB)} do PIB de B</div>
                <div className="text-xs text-muted">{fmtPct(p.transferAtoB)} do PIB de A × (PIB de A ÷ PIB de B)</div>
              </div>
            )}
            {group === 'avancado' && (
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2 text-ink">
                  <input type="checkbox" checked={p.eventsEnabled} onChange={(e) => set({ eventsEnabled: e.target.checked })} className="h-4 w-4" />
                  Eventos econômicos aleatórios
                  <InfoTip text="Boom de commodities, crise cambial, acordos com terceiros países e fuga de capitais (só na separação conflituosa, anos 1 a 3)." />
                </label>
                <label className="flex items-center gap-2 text-ink">
                  <input type="checkbox" checked={p.decisionsEnabled} onChange={(e) => set({ decisionsEnabled: e.target.checked })} className="h-4 w-4" />
                  Cartas de decisão
                  <InfoTip text="Decisões de tratado e de governo ao longo dos anos (ministério, dívida, prevenção, energia, tribunal, empresas, comércio, reforma política, migração). No laboratório, cada escolha vale para os dois blocos." />
                </label>
                <div className="flex flex-wrap items-center gap-2 text-ink">
                  <label htmlFor="seed">Semente</label>
                  <input
                    id="seed"
                    type="number"
                    value={state.seed}
                    onChange={(e) => dispatch({ type: 'seed', seed: Math.abs(Math.floor(Number(e.target.value) || 0)) })}
                    className="tnum min-h-9 w-36 rounded-md border border-line bg-surface px-2"
                  />
                  <Button variant="ghost" onClick={() => dispatch({ type: 'seed', seed: randomSeed() })}>
                    Sortear
                  </Button>
                  <InfoTip text="A mesma semente produz exatamente os mesmos eventos, tornando a simulação reproduzível." />
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {group === 'avancado' && (
        <Card
          title="Coeficientes avançados"
          subtitle="Parâmetros estruturais do modelo. Todos são hipóteses simplificadoras; ajuste para testar a sensibilidade dos resultados."
          actions={
            <Button variant="ghost" onClick={() => dispatch({ type: 'coef', patch: DEFAULT_COEFFICIENTS })}>
              Restaurar padrões
            </Button>
          }
        >
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {COEF_META.map((m) => (
              <div key={m.key}>
                <Slider
                  label={m.label}
                  value={state.coef[m.key]}
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  tooltip={m.doc}
                  onChange={(v) => dispatch({ type: 'coef', patch: { [m.key]: v } })}
                />
                <p className="mt-1 text-xs text-muted">{m.doc}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
