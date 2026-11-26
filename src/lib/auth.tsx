import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  /** false until the browser has checked for a saved session (always false on the server) */
  ready: boolean
  session: Session | null
}

const AuthContext = createContext<AuthState>({ ready: false, session: null })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ready: false, session: null })
  useEffect(() => {
    if (!supabase) {
      setState({ ready: true, session: null })
      return
    }
    supabase.auth.getSession().then(({ data }) => setState({ ready: true, session: data.session }))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setState({ ready: true, session }))
    return () => sub.subscription.unsubscribe()
  }, [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
