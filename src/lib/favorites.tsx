// "محفوظاتي": saved listings of the logged-in user (table favorites, RLS: own rows only).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

interface FavState {
  ids: Set<number>
  loaded: boolean
  toggle: (listingId: number) => Promise<void>
}

const FavContext = createContext<FavState>({ ids: new Set(), loaded: false, toggle: async () => undefined })
export const useFavorites = () => useContext(FavContext)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [ids, setIds] = useState<Set<number>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setIds(new Set())
    setLoaded(false)
    if (!supabase || !userId) return
    let alive = true
    supabase
      .from('favorites')
      .select('listing_id')
      .then(({ data }) => {
        if (!alive) return
        setIds(new Set((data ?? []).map((r) => r.listing_id as number)))
        setLoaded(true)
      })
    return () => { alive = false }
  }, [userId])

  const toggle = useCallback(async (listingId: number) => {
    if (!supabase || !userId) return
    const has = ids.has(listingId)
    // optimistic update, rolled back on error
    setIds((prev) => {
      const next = new Set(prev)
      if (has) next.delete(listingId)
      else next.add(listingId)
      return next
    })
    const { error } = has
      ? await supabase.from('favorites').delete().eq('listing_id', listingId)
      : await supabase.from('favorites').insert({ listing_id: listingId })
    if (error) {
      setIds((prev) => {
        const next = new Set(prev)
        if (has) next.add(listingId)
        else next.delete(listingId)
        return next
      })
    }
  }, [ids, userId])

  const value = useMemo(() => ({ ids, loaded, toggle }), [ids, loaded, toggle])
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>
}
