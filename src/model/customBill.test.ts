import { describe, expect, it } from 'vitest'
import { billArguments, findBill, registerCustomBill } from './bills'
import { customArguments, customBillId, sanitizeAnalysis, toBillTemplate, type CustomBill, type ProposalAnalysis } from './customBill'
import { startBill } from './lawmaking'
import { composeChamber } from './legislature'

const base: ProposalAnalysis = {
  title: 'Antenas de internet via satélite nas escolas cívico-militares',
  summary: 'Compra e instalação de uma antena por escola cívico-militar estadual.',
  area: 'Educação',
  competentLevel: 'estadual',
  competenceExplanation: 'Rede estadual de ensino é administrada pelo estado.',
  requiredNorm: 'lei-ordinaria',
  executiveInitiativeOnly: false,
  initiativeExplanation: '',
  constitutionalIssues: [{ kind: 'material', ref: 'inexistente', text: 'Exige indicação da fonte de recursos.' }],
  econ: -3,
  env: 0,
  popularity: 0.5,
  hurtsPragmatic: false,
  provisions: ['compra de antenas', 'instalação', 'manutenção'],
  pros: ['Conecta escolas isoladas.'],
  cons: ['Custo de manutenção.'],
  annualCostBRL: 6_000_000,
  costExplanation: '200 escolas × R$ 30 mil por ano.',
  growthEffectPp: 2,
  climateDamageChangePct: 0,
  approvalEffect: 3,
  yearsOfEffect: 50,
  partyReactions: [{ spectrum: 'centro', stance: 'apoia', reason: 'Tema consensual.' }],
}

const custom = (a: ProposalAnalysis, level: CustomBill['level'] = 'estadual'): CustomBill => ({
  id: customBillId(a.title),
  text: a.summary,
  analysis: sanitizeAnalysis(a),
  level,
  territoryGdp: 600e9,
  createdBy: 'ia',
})

describe('propostas criadas pelo jogador', () => {
  it('limita números e descarta referências inexistentes', () => {
    const a = sanitizeAnalysis(base)
    expect(a.econ).toBe(-1)
    expect(a.growthEffectPp).toBe(0.5)
    expect(a.yearsOfEffect).toBe(30)
    expect(a.constitutionalIssues[0].ref).toBe('')
  })

  it('converte custo em % do PIB do território', () => {
    const t = toBillTemplate(custom(base))
    expect(t.effect.fiscalCost).toBeCloseTo(0.001, 6)
    expect(t.level).toBe('estadual')
  })

  it('marca vício de competência quando o tema é de outro nível', () => {
    const t = toBillTemplate(custom({ ...base, competentLevel: 'federal' }, 'estadual'))
    expect(t.vices?.some((v) => v.kind === 'competencia')).toBe(true)
  })

  it('iniciativa privativa vira vício para parlamentares', () => {
    const t = toBillTemplate(custom({ ...base, executiveInitiativeOnly: true }))
    expect(t.initiative).toEqual(['governador'])
  })

  it('tramita no motor legislativo como qualquer projeto', () => {
    const c = custom(base)
    registerCustomBill(toBillTemplate(c), customArguments(c))
    expect(findBill(c.id)?.title).toBe(base.title)
    expect(billArguments(c.id).pros).toEqual(base.pros)
    const s = startBill(
      {
        level: 'estadual',
        seed: 3,
        t: 2,
        author: 'deputado-estadual',
        authorParty: 'UDC',
        chambers: [composeChamber('assembleia', 'Assembleia Legislativa', 40, 3)],
        initiatingHouse: 0,
        executiveParty: 'UDC',
        executiveCabinet: 'misto',
        executiveTitle: 'Governador(a)',
        courtName: 'Tribunal de Justiça',
        player: { author: false, executive: false, court: false },
        electionPressure: 0,
      },
      { templateId: c.id, norm: 'lei-ordinaria', urgency: true, bargaining: 0.5 },
    )
    expect(s.log.length).toBeGreaterThan(2)
    expect(['lei', 'arquivado', 'inconstitucional']).toContain(s.status)
  })
})
