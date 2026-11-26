import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Filters } from './types'

const EMPTY: Filters = { q: '', category: null, province: null }

/**
 * Filters kept in the URL (?q=&c=&p=) so a search can be shared.
 * Starts empty (same as the pre-rendered HTML) and reads the URL after hydration.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setFilters({ q: params.get('q') ?? '', category: params.get('c'), province: params.get('p') })
    setReady(true)
    // only on first mount: afterwards the state drives the URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch }
      const p = new URLSearchParams()
      if (next.q.trim()) p.set('q', next.q)
      if (next.category) p.set('c', next.category)
      if (next.province) p.set('p', next.province)
      setParams(p, { replace: true, preventScrollReset: true })
      return next
    })
  }, [setParams])

  const isDefault = !filters.q.trim() && !filters.category && !filters.province
  return { filters, update, ready, isDefault }
}

/** Debounced copy of a value. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}
