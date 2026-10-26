import type { LucideIcon } from 'lucide-react'
import { BookOpen, Coins, FlaskConical, ScrollText, Settings, Users, LogIn, LogOut, Moon, Play, Plus, Sparkles, Sun, SunMoon, Trophy, CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrazilMap } from '../components/BrazilMap'
import { useAuth } from '../lib/auth'
import { firebaseEnabled } from '../lib/firebase'
import { applyTheme, storedTheme, type ThemeChoice } from '../lib/theme'
import { DEFAULT_BASELINE } from '../model/baseline'
import { dailyMission } from '../model/game'
import { ORIGINAL_PARTITION } from '../model/partition'
import { OFFICE_ICONS, ROLES } from '../model/roles'
import type { UF } from '../model/states'
import { useGame } from '../state/game'

const VERSION = '0.3.0'

// Cores próprias da tela de título (verde e amarelo da bandeira), iguais nos temas claro e escuro.
const GREEN_DARK = '#063d1d'
const YELLOW = '#ffd23f'
const BLUE = '#0a2f73'

/** PIB per capita relativo de cada UF (0 a 1), para colorir o emblema. */
const PC = (() => {
  const v = Object.fromEntries(Object.values(DEFAULT_BASELINE.states).map((d) => [d.uf, Math.log(d.gdpShare / d.pop)])) as Record<UF, number>
  const xs = Object.values(v)
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  return (u: UF) => (v[u] - lo) / (hi - lo)
})()

interface Item {
  icon: LucideIcon
  title: string
  text: string
  to: string
  highlight?: boolean
}

export function Home() {
  const navigate = useNavigate()
  const { career, results } = useGame()
  const { user, isAnonymous, signInWithGoogle, signOut } = useAuth()
  const [theme, setTheme] = useState<ThemeChoice>(storedTheme)
  const daily = dailyMission()

  const left: Item[] = [
    career
      ? {
          icon: Play,
          title: 'Continuar',
          text: `${OFFICE_ICONS[career.office ?? career.setup.office]} ${career.office ? ROLES[career.office].title : 'Sem mandato'} · ${
            career.setup.municipio ? `${career.setup.municipio.name}, ` : ''
          }${career.setup.uf} · ${results[career.t]?.year ?? ''}`,
          to: '/jogo',
          highlight: true,
        }
      : { icon: Plus, title: 'Nova partida', text: 'Escolha cargo, estado, partido e cenário', to: '/jogar', highlight: true },
    ...(career ? [{ icon: Plus, title: 'Nova partida', text: 'Comece outra carreira do zero', to: '/jogar' }] : []),
    { icon: ScrollText, title: 'Modo história', text: 'Decisões reais do Brasil desde 1990', to: '/historia' },
    { icon: CalendarDays, title: 'Desafio do dia', text: 'Mesmo sorteio para todos os jogadores hoje', to: `/jogar?missao=${daily.id}` },
    { icon: Trophy, title: 'Ranking', text: 'As melhores carreiras (só iniciais)', to: '/ranking' },
    { icon: Users, title: 'Turmas e grupos', text: 'Cenário próprio, placar e debate com um código', to: '/turmas' },
  ]
  const right: Item[] = [
    { icon: BookOpen, title: 'Como funciona o Brasil', text: 'Poderes, cargos, Constituição e glossário', to: '/instituicoes' },
    { icon: Coins, title: 'Dinheiro público', text: 'Orçamento, dívida, previdência e inflação', to: '/economia' },
    { icon: Sparkles, title: 'Assistente de IA', text: 'Crie leis próprias com a sua chave', to: '/assistente' },
    { icon: FlaskConical, title: 'Laboratório', text: 'Teste hipóteses mexendo nos parâmetros', to: '/laboratorio' },
    { icon: Settings, title: 'Configurações', text: 'Texto, contraste, leitura fácil, sons e vibração', to: '/configuracoes' },
  ]

  const cycleTheme = () => {
    const next: ThemeChoice = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
    setTheme(next)
    applyTheme(next)
  }
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon
  const signedIn = user && !isAnonymous

  return (
    <div
      className="relative flex min-h-dvh flex-col overflow-x-clip text-white"
      style={{ background: `radial-gradient(ellipse at 50% 35%, #138a43 0%, #0b6430 45%, ${GREEN_DARK} 100%)` }}
    >
      {/* textura sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 14px)' }}
      />

      <div className="relative flex items-center justify-end gap-2 px-4 pt-3">
        <button type="button" onClick={cycleTheme} className="grid size-9 place-items-center rounded-full border border-white/25 text-white/80 hover:bg-white/10" aria-label="Alternar tema">
          <ThemeIcon size={16} />
        </button>
        {firebaseEnabled && (
          <button
            type="button"
            onClick={signedIn ? signOut : signInWithGoogle}
            className="flex min-h-9 items-center gap-1.5 rounded-full border border-white/25 px-3 text-xs text-white/90 hover:bg-white/10"
          >
            {signedIn ? <LogOut size={14} /> : <LogIn size={14} />}
            {signedIn ? 'Sair' : 'Entrar com Google'}
          </button>
        )}
        <span className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/80">Versão {VERSION}</span>
      </div>

      <main className="relative mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-4 px-4 pb-4 lg:grid-cols-[1fr_minmax(320px,1.1fr)_1fr] lg:gap-8 lg:px-8">
        {/* Logo e emblema */}
        <div className="flex flex-col items-center lg:order-2">
          <h1 className="text-center leading-[0.9]" style={{ fontFamily: "'Lilita One', system-ui, sans-serif" }}>
            <span className="block text-6xl tracking-wide sm:text-7xl" style={{ color: '#fff', WebkitTextStroke: `2px ${GREEN_DARK}`, textShadow: `0 5px 0 ${GREEN_DARK}` }}>
              COMO
            </span>
            <span className="block text-6xl tracking-wide sm:text-7xl" style={{ color: YELLOW, WebkitTextStroke: `2px ${GREEN_DARK}`, textShadow: `0 5px 0 ${GREEN_DARK}` }}>
              VOTAR?
            </span>
          </h1>
          <p className="mt-2 text-center text-sm text-white/85">
            Você no poder. <strong className="text-white">Mas não sozinho.</strong>
          </p>
          <Emblem />
        </div>

        <MenuColumn items={left} className="lg:order-1" onGo={navigate} />
        <MenuColumn items={right} className="lg:order-3" onGo={navigate} />
      </main>

      <div className="sticky bottom-0 z-10 flex flex-col items-center gap-3 bg-gradient-to-t from-[#063d1d] via-[#063d1d]/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] lg:relative lg:bg-none lg:pt-0">
        <button
          type="button"
          onClick={() => navigate(career ? '/jogo' : '/jogar')}
          className="flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-full border-4 border-white text-3xl shadow-[0_6px_0_rgba(0,0,0,0.25)] transition hover:brightness-105 active:translate-y-1 active:shadow-none"
          style={{ background: `linear-gradient(180deg, #ffe680 0%, ${YELLOW} 50%, #e8b400 100%)`, color: GREEN_DARK, fontFamily: "'Lilita One', system-ui, sans-serif" }}
        >
          <Play size={28} strokeWidth={3} />
          {career ? 'Continuar' : 'Jogar'}
        </button>
        <p className="max-w-3xl text-center text-[11px] leading-snug text-white/60">
          Jogo educativo e hipotético; os resultados não são previsões. Partidos fictícios ou paródias. A Constituição
          (art. 1º) define o Brasil como união indissolúvel dos estados, municípios e Distrito Federal.
        </p>
      </div>
    </div>
  )
}

function MenuColumn({ items, className, onGo }: { items: Item[]; className?: string; onGo: (to: string) => void }) {
  return (
    <nav className={`flex flex-col gap-3 ${className ?? ''}`} aria-label="Menu">
      {items.map((it) => (
        <button
          key={it.title}
          type="button"
          onClick={() => onGo(it.to)}
          title={it.text}
          className={`group flex items-center gap-3 rounded-2xl border-2 p-3 text-left shadow-[0_3px_0_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 active:translate-y-0.5 sm:gap-4 sm:p-4 ${
            it.highlight ? 'border-white/70 bg-[#1a9a4c] hover:bg-[#1fae57]' : 'border-[#e8c547]/60 bg-[#0a4f26]/85 hover:border-[#ffd23f]'
          }`}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-black/25 sm:size-12" style={{ color: it.highlight ? '#fff' : YELLOW }}>
            <it.icon size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-lg leading-tight font-bold text-white sm:text-xl">{it.title}</span>
            <span className="block text-sm leading-snug text-white/80">{it.text}</span>
          </span>
        </button>
      ))}
    </nav>
  )
}

/** Mapa do Brasil num círculo azul sobre o losango amarelo, como na bandeira. */
function Emblem() {
  return (
    <div className="relative mt-8 aspect-square w-[min(58vw,240px)] lg:w-[min(30vw,400px)]" aria-hidden>
      <div className="absolute inset-[6%] rotate-45 rounded-[18%] shadow-2xl" style={{ background: YELLOW }} />
      <div className="absolute inset-[16%] overflow-hidden rounded-full border-4 border-white/90 shadow-inner" style={{ background: BLUE }}>
        <div className="absolute inset-[6%]">
          <BrazilMap
            ariaLabel=""
            partition={ORIGINAL_PARTITION}
            showBorder={false}
            fill={(u) => `rgba(255, 255, 255, ${0.55 + 0.45 * PC(u)})`}
            height="100%"
          />
        </div>
      </div>
    </div>
  )
}
