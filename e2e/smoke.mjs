// Teste de interface no celular: abre o jogo num navegador de verdade (tela de
// 390×844, toque), começa uma partida, decide a primeira carta e confere que
// não houve erro de página. Uso: npm run e2e (com `vite preview` rodando).
import { chromium } from 'playwright-core'

const BASE = process.env.E2E_URL ?? 'http://localhost:4173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome' })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

const step = async (name, fn) => {
  try {
    await fn()
    console.log(`✓ ${name}`)
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`)
    process.exitCode = 1
  }
}

await step('tela de título', async () => {
  await page.goto(BASE)
  await page.getByRole('heading', { name: /COMO/ }).waitFor()
})
await step('nova partida', async () => {
  await page.goto(`${BASE}/jogar?cargo=prefeito`)
  await page.getByRole('button', { name: /Começar como/ }).click()
  await page.waitForURL(/\/jogo/)
})
await step('decidir a primeira carta', async () => {
  for (let i = 0; i < 5; i++) {
    const skip = page.getByRole('button', { name: 'Pular', exact: true })
    if (await skip.isVisible()) await skip.click()
    await page.waitForTimeout(300)
  }
  const dialog = page.locator('dialog[open]')
  await dialog.waitFor({ timeout: 10000 })
  await dialog.locator('div.mt-3.grid > button:not([disabled])').first().click()
})
await step('abas do jogo', async () => {
  for (const tab of ['Agenda', 'Leis', 'Você', 'País']) await page.getByRole('button', { name: new RegExp(tab) }).last().click({ timeout: 5000 }).catch(async () => {
    await page.getByText('Ver o painel e decidir depois').click()
    await page.getByRole('button', { name: new RegExp(tab) }).last().click()
  })
})
await step('sem erros de página', async () => {
  if (errors.length) throw new Error(errors.join(' | '))
})
await browser.close()
