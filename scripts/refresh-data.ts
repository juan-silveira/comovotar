// Robô de dados: pré-carrega no Firestore os dados oficiais usados pelo jogo
// (IBGE por UF, municípios de cada UF e indicadores do Banco Central). Roda
// agendado no GitHub Actions com conta de serviço; os navegadores só leem.
// Uso: npm run refresh-data   (requer conta de serviço; ver scripts/admin.ts)
import { FieldValue } from 'firebase-admin/firestore'
import { fetchBcbMacro } from '../src/model/bcb'
import { fetchIbgeDataset, fetchMunicipios, validateDataset } from '../src/model/ibge'
import { ALL_UFS } from '../src/model/states'
import { db } from './admin'

async function save(id: string, data: unknown) {
  await db.collection('datasets').doc(id).set({ data, fetchedAtTs: FieldValue.serverTimestamp() })
}

const only = process.argv[2]
if (!only || only === 'bcb') {
  await save('bcb-macro', await fetchBcbMacro())
  console.log('Banco Central: ok')
}
if (!only || only === 'ibge') {
  const uf = await fetchIbgeDataset()
  validateDataset(uf)
  await save('ibge-uf', uf)
  console.log('IBGE por UF: ok')
  for (const u of ALL_UFS) {
    if (u === 'DF') continue
    try {
      await save(`ibge-municipios-${u}`, await fetchMunicipios(u))
      console.log(`Municípios ${u}: ok`)
    } catch (e) {
      console.warn(`Municípios ${u}: ${(e as Error).message}`)
    }
  }
}
