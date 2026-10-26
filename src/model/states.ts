// Metadados das 27 UFs que não vêm da API do IBGE: região, perfil de
// energia e intensidade de recursos naturais. Os dois últimos são
// estimativas qualitativas, usadas só para sugerir parâmetros quando a
// divisão muda (ver partition.ts), e estão marcados como "a calibrar".

export type UF =
  | 'RO' | 'AC' | 'AM' | 'RR' | 'PA' | 'AP' | 'TO'
  | 'MA' | 'PI' | 'CE' | 'RN' | 'PB' | 'PE' | 'AL' | 'SE' | 'BA'
  | 'MG' | 'ES' | 'RJ' | 'SP'
  | 'PR' | 'SC' | 'RS'
  | 'MS' | 'MT' | 'GO' | 'DF'

export type RegionId = 'N' | 'NE' | 'SE' | 'S' | 'CO'

export const REGION_NAMES: Record<RegionId, string> = {
  N: 'Norte',
  NE: 'Nordeste',
  SE: 'Sudeste',
  S: 'Sul',
  CO: 'Centro-Oeste',
}

export const REGION_ORDER: RegionId[] = ['N', 'NE', 'CO', 'SE', 'S']

export type EnergyProfile = 'exportador' | 'importador' | 'equilibrado'

export interface StateMeta {
  uf: UF
  region: RegionId
  /** Saldo de energia elétrica (estimativa a calibrar, com base em ONS/EPE) */
  energy: EnergyProfile
  /** Intensidade de recursos naturais exportáveis, 0 a 1 (estimativa a calibrar) */
  resources: number
  /** Latitude aproximada da capital, para divisões geográficas */
  lat: number
}

export const STATE_META: Record<UF, StateMeta> = {
  RO: { uf: 'RO', region: 'N', energy: 'exportador', resources: 0.6, lat: -8.8 },
  AC: { uf: 'AC', region: 'N', energy: 'importador', resources: 0.3, lat: -10.0 },
  AM: { uf: 'AM', region: 'N', energy: 'importador', resources: 0.4, lat: -3.1 },
  RR: { uf: 'RR', region: 'N', energy: 'importador', resources: 0.3, lat: 2.8 },
  PA: { uf: 'PA', region: 'N', energy: 'exportador', resources: 1.0, lat: -1.5 },
  AP: { uf: 'AP', region: 'N', energy: 'exportador', resources: 0.5, lat: 0.0 },
  TO: { uf: 'TO', region: 'N', energy: 'exportador', resources: 0.7, lat: -10.2 },
  MA: { uf: 'MA', region: 'NE', energy: 'exportador', resources: 0.6, lat: -2.5 },
  PI: { uf: 'PI', region: 'NE', energy: 'exportador', resources: 0.6, lat: -5.1 },
  CE: { uf: 'CE', region: 'NE', energy: 'equilibrado', resources: 0.4, lat: -3.7 },
  RN: { uf: 'RN', region: 'NE', energy: 'exportador', resources: 0.6, lat: -5.8 },
  PB: { uf: 'PB', region: 'NE', energy: 'exportador', resources: 0.3, lat: -7.1 },
  PE: { uf: 'PE', region: 'NE', energy: 'importador', resources: 0.2, lat: -8.1 },
  AL: { uf: 'AL', region: 'NE', energy: 'equilibrado', resources: 0.2, lat: -9.7 },
  SE: { uf: 'SE', region: 'NE', energy: 'equilibrado', resources: 0.4, lat: -10.9 },
  BA: { uf: 'BA', region: 'NE', energy: 'exportador', resources: 0.6, lat: -13.0 },
  MG: { uf: 'MG', region: 'SE', energy: 'equilibrado', resources: 0.7, lat: -19.9 },
  ES: { uf: 'ES', region: 'SE', energy: 'importador', resources: 0.6, lat: -20.3 },
  RJ: { uf: 'RJ', region: 'SE', energy: 'importador', resources: 0.7, lat: -22.9 },
  SP: { uf: 'SP', region: 'SE', energy: 'importador', resources: 0.1, lat: -23.5 },
  PR: { uf: 'PR', region: 'S', energy: 'exportador', resources: 0.4, lat: -25.4 },
  SC: { uf: 'SC', region: 'S', energy: 'importador', resources: 0.2, lat: -27.6 },
  RS: { uf: 'RS', region: 'S', energy: 'importador', resources: 0.3, lat: -30.0 },
  MS: { uf: 'MS', region: 'CO', energy: 'equilibrado', resources: 0.7, lat: -20.4 },
  MT: { uf: 'MT', region: 'CO', energy: 'equilibrado', resources: 0.9, lat: -15.6 },
  GO: { uf: 'GO', region: 'CO', energy: 'importador', resources: 0.6, lat: -16.7 },
  DF: { uf: 'DF', region: 'CO', energy: 'importador', resources: 0.0, lat: -15.8 },
}

export const ALL_UFS = Object.keys(STATE_META) as UF[]
