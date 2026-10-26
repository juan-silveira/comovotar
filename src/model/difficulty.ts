// Níveis de dificuldade: o mesmo Brasil, com mais ou menos margem de erro.

export type Difficulty = 'facil' | 'realista' | 'raiz'

export interface DifficultyConfig {
  label: string
  description: string
  /** Capital político inicial somado ao padrão */
  capital: number
  /** Pontos somados nas disputas eleitorais */
  electionBonus: number
  /** Multiplicador da chance de eventos e crises */
  events: number
  /** Multiplicador da chance de propostas ilícitas */
  offers: number
  /** Pontos somados ao apoio do Legislativo ao governo do jogador */
  support: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  facil: {
    label: 'Fácil',
    description: 'Mais capital político, eleitores mais pacientes e menos crises. Bom para aprender.',
    capital: 4,
    electionBonus: 5,
    events: 0.6,
    offers: 0.6,
    support: 10,
  },
  realista: {
    label: 'Realista',
    description: 'As regras e probabilidades padrão do jogo.',
    capital: 0,
    electionBonus: 0,
    events: 1,
    offers: 1,
    support: 0,
  },
  raiz: {
    label: 'Brasília raiz',
    description: 'Tudo contra: menos capital, eleitor exigente, mais crises, mais propostas indecentes e um Legislativo hostil.',
    capital: -3,
    electionBonus: -4,
    events: 1.5,
    offers: 1.5,
    support: -10,
  },
}

export function difficultyOf(d: Difficulty | undefined): DifficultyConfig {
  return DIFFICULTIES[d ?? 'realista']
}
