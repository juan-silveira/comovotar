// Atualiza o snapshot embutido dos dados do IBGE por UF.
// Uso: npm run update-ibge
import { writeFileSync } from 'node:fs'
import { fetchIbgeDataset } from '../src/model/ibge.ts'

const data = await fetchIbgeDataset()
const path = new URL('../src/model/ibge-snapshot.json', import.meta.url)
writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
console.log(`Snapshot salvo: ${data.states.length} UFs, PIB ${data.gdpStartYear}–${data.gdpEndYear}, consultado em ${data.fetchedAt}`)

// Malha das UFs (TopoJSON, qualidade intermediária) para o mapa.
const malha = await fetch(
  'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/json&intrarregiao=UF&qualidade=intermediaria',
)
if (!malha.ok) throw new Error(`Malha do IBGE: ${malha.status}`)
writeFileSync(new URL('../src/model/br-uf.topo.json', import.meta.url), await malha.text())
console.log('Malha das UFs atualizada.')
