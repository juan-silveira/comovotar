import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { firebaseEnabled } from '../lib/firebase'
import { applyTheme, storedTheme, type ThemeChoice } from '../lib/theme'
import { Disclaimer } from './ui'

interface Section {
  id: string
  icon: string
  label: string
  to: string
  /** Rotas que pertencem à seção; a primeira é a entrada padrão */
  paths: string[]
  /** Subabas exibidas dentro da seção */
  tabs?: { to: string; label: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'turmas',
    icon: '🏫',
    label: 'Turmas e grupos',
    to: '/turmas',
    paths: ['/turmas', '/roteiros'],
    tabs: [
      { to: '/turmas', label: 'Turmas e grupos' },
      { to: '/roteiros', label: 'Roteiros de aula' },
    ],
  },
  { id: 'config', icon: '⚙️', label: 'Configurações', to: '/configuracoes', paths: ['/configuracoes'] },
  { id: 'jogar', icon: '🎮', label: 'Jogar', to: '/jogo', paths: ['/jogo', '/jogar'] },
  { id: 'ranking', icon: '🏆', label: 'Ranking', to: '/ranking', paths: ['/ranking'] },
  {
    id: 'aprender',
    icon: '📚',
    label: 'Aprender',
    to: '/instituicoes',
    paths: ['/instituicoes', '/economia', '/dados', '/assistente'],
    tabs: [
      { to: '/instituicoes', label: 'Poderes e cargos' },
      { to: '/economia', label: 'Dinheiro público' },
      { to: '/assistente', label: 'Assistente de IA' },
      { to: '/dados', label: 'Dados e método' },
    ],
  },
  {
    id: 'lab',
    icon: '🧪',
    label: 'Laboratório',
    to: '/laboratorio',
    paths: ['/laboratorio', '/simulacao', '/relatorio', '/comparar'],
    tabs: [
      { to: '/laboratorio', label: 'Montar cenário' },
      { to: '/simulacao', label: 'Rodar' },
      { to: '/relatorio', label: 'Relatório' },
      { to: '/comparar', label: 'Comparar' },
    ],
  },
]

export function Layout() {
  const [theme, setTheme] = useState<ThemeChoice>(storedTheme)
  const { user, isAnonymous, signInWithGoogle, signOut, error } = useAuth()
  const path = useLocation().pathname
  const wide = path === '/jogo'
  const section = SECTIONS.find((sec) => sec.paths.includes(path))
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  const cycleTheme = () => {
    const next: ThemeChoice = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
    setTheme(next)
    applyTheme(next)
  }

  // A tela de título ocupa a tela inteira, sem cabeçalho.
  if (path === '/') return <Outlet />

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label="Como votar?, menu inicial">
            <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-accent text-base text-accent-ink">
              🏛
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-extrabold tracking-tight text-ink">Como votar?</span>
              <span className="block text-[10px] text-muted">simulador político</span>
            </span>
          </NavLink>
          <div className="min-w-0 flex-1">
            {section && path !== '/' && (
              <NavLink to="/" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-ink-2 hover:bg-surface-2">
                <span aria-hidden>←</span> Menu
                <span className="hidden text-muted sm:inline">
                  {' '}
                  / {section.icon} {section.label}
                </span>
              </NavLink>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={cycleTheme}
              className="min-h-9 rounded-md px-2 text-sm text-ink-2 hover:bg-surface-2"
              aria-label={`Alternar tema (atual: ${theme === 'auto' ? 'automático' : theme === 'light' ? 'claro' : 'escuro'})`}
              title="Tema"
            >
              <span aria-hidden>{theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐'}</span>
            </button>
            {firebaseEnabled &&
              (user && !isAnonymous ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="hidden min-h-9 rounded-md px-2 text-xs text-ink-2 hover:bg-surface-2 md:block"
                >
                  Sair
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="min-h-9 rounded-md border border-line px-2 text-xs text-ink hover:bg-surface-2"
                  title="Entrar com Google para salvar o progresso e aparecer no ranking"
                >
                  Entrar
                </button>
              ))}
          </div>
        </div>
        {section?.tabs && (
          <div className="border-t border-line">
            <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-1.5 sm:px-4" aria-label={section.label}>
              {section.tabs.map((t) => (
                <li key={t.to} className="shrink-0">
                  <NavLink
                    to={t.to}
                    className={({ isActive }) =>
                      `block rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${
                        isActive ? 'bg-accent font-semibold text-accent-ink' : 'text-ink-2 hover:bg-surface-2'
                      }`
                    }
                  >
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <main className={`mx-auto w-full flex-1 px-4 ${wide ? 'max-w-[1600px] py-3' : 'max-w-7xl py-6'}`}>
        <Outlet />
      </main>

      <footer className={`border-t border-line ${wide ? 'hidden' : ''}`}>
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-5 text-xs text-muted">
          <Disclaimer compact />
          {error && <p className="text-warn-ink">{error}</p>}
          <p>
            Dados: IBGE (Contas Nacionais, Contas Regionais 2023, Censo 2022), FGV e Banco Central. Coeficientes do
            modelo são hipóteses editáveis.{' '}
            {firebaseEnabled ? 'Dados salvos na nuvem (Firebase).' : 'Modo local: dados salvos apenas neste navegador.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
