import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, firebaseEnabled } from './firebase'

interface AuthState {
  user: User | null
  /** Identificador usado para salvar dados: uid do Firebase ou id local. */
  uid: string | null
  ready: boolean
  isAnonymous: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthState | null>(null)

const LOCAL_UID_KEY = 'sdr.localUid'

function localUid(): string {
  try {
    let id = localStorage.getItem(LOCAL_UID_KEY)
    if (!id) {
      id = `local-${crypto.randomUUID()}`
      localStorage.setItem(LOCAL_UID_KEY, id)
    }
    return id
  } catch {
    return 'local-sessao'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!firebaseEnabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    const a = auth
    return onAuthStateChanged(a, (u) => {
      if (u) {
        setUser(u)
        setReady(true)
      } else {
        // Login anônimo automático: permite salvar cenários e entrar no ranking.
        signInAnonymously(a).catch((e: { code?: string; message: string }) => {
          setError(
            e.code === 'auth/configuration-not-found' || e.code === 'auth/operation-not-allowed'
              ? 'Login indisponível no momento: o jogo funciona normalmente, mas salvar cenários e o ranking online ficam desativados.'
              : `Login indisponível (${e.code ?? e.message}). O jogo funciona normalmente; ranking e salvamento online ficam desativados.`,
          )
          setReady(true)
        })
      }
    })
  }, [])

  async function signInWithGoogle() {
    if (!auth) return
    setError(null)
    const provider = new GoogleAuthProvider()
    try {
      // Mantém os cenários do usuário anônimo vinculando a conta Google.
      if (auth.currentUser?.isAnonymous) await linkWithPopup(auth.currentUser, provider)
      else await signInWithPopup(auth, provider)
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        await signInWithPopup(auth, provider)
      } else if (code !== 'auth/popup-closed-by-user') {
        setError(`Falha no login com Google: ${(e as Error).message}`)
      }
    }
  }

  async function signOut() {
    if (auth) await fbSignOut(auth)
  }

  const value: AuthState = {
    user,
    uid: firebaseEnabled ? (user?.uid ?? null) : localUid(),
    ready,
    isAnonymous: user?.isAnonymous ?? true,
    signInWithGoogle,
    signOut,
    error,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
