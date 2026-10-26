import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, storedTheme } from './lib/theme'
import { applySettings } from './lib/settings'

applyTheme(storedTheme())
applySettings()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Instalável e jogável sem internet (só em produção, para não atrapalhar o desenvolvimento).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`).catch(() => {})
  })
}

// Se o site carregou bem, libera uma nova recarga automática numa próxima atualização.
setTimeout(() => {
  try {
    sessionStorage.removeItem('sdr.reloaded')
  } catch {
    // ignorado
  }
}, 15000)
