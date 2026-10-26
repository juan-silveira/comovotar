import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/auth'
import { Home } from './pages/Home'
import { GameProvider } from './state/game'
import { ScenarioProvider } from './state/scenario'

/**
 * Carrega uma página sob demanda. Logo após uma atualização do site, a página
 * aberta pode pedir arquivos que não existem mais: recarrega uma vez.
 */
function page<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((e) => {
      if (!sessionStorage.getItem('sdr.reloaded')) {
        sessionStorage.setItem('sdr.reloaded', '1')
        window.location.reload()
      }
      throw e
    })
}

const Assistant = lazy(page(() => import('./pages/Assistant').then((m) => ({ default: m.Assistant }))))
const Compare = lazy(page(() => import('./pages/Compare').then((m) => ({ default: m.Compare }))))
const Config = lazy(page(() => import('./pages/Config').then((m) => ({ default: m.Config }))))
const Economy = lazy(page(() => import('./pages/Economy').then((m) => ({ default: m.Economy }))))
const Data = lazy(page(() => import('./pages/Data').then((m) => ({ default: m.Data }))))
const GameScreen = lazy(page(() => import('./pages/GameScreen').then((m) => ({ default: m.GameScreen }))))
const Institutions = lazy(page(() => import('./pages/Institutions').then((m) => ({ default: m.Institutions }))))
const NewGame = lazy(page(() => import('./pages/NewGame').then((m) => ({ default: m.NewGame }))))
const Ranking = lazy(page(() => import('./pages/Ranking').then((m) => ({ default: m.Ranking }))))
const Report = lazy(page(() => import('./pages/Report').then((m) => ({ default: m.Report }))))
const Simulation = lazy(page(() => import('./pages/Simulation').then((m) => ({ default: m.Simulation }))))

export default function App() {
  return (
    <AuthProvider>
      <ScenarioProvider>
        <GameProvider>
          <BrowserRouter>
            <Suspense fallback={<p className="p-6 text-sm text-muted">Carregando…</p>}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="jogar" element={<NewGame />} />
                <Route path="jogo" element={<GameScreen />} />
                <Route path="laboratorio" element={<Config />} />
                <Route path="simulacao" element={<Simulation />} />
                <Route path="relatorio" element={<Report />} />
                <Route path="comparar" element={<Compare />} />
                <Route path="ranking" element={<Ranking />} />
                <Route path="instituicoes" element={<Institutions />} />
                <Route path="economia" element={<Economy />} />
                <Route path="dados" element={<Data />} />
                <Route path="assistente" element={<Assistant />} />
                <Route path="configuracao" element={<Navigate to="/laboratorio" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </GameProvider>
      </ScenarioProvider>
    </AuthProvider>
  )
}
