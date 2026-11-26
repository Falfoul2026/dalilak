import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null until the Supabase keys are put in .env – the app still renders. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: typeof window !== 'undefined', detectSessionInUrl: typeof window !== 'undefined' },
      })
    : null

export const isSupabaseConfigured = supabase !== null
