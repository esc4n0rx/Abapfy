import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-key'

// true somente quando as vars foram corretamente baked no build
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== PLACEHOLDER_URL &&
  supabaseAnonKey !== PLACEHOLDER_KEY

if (!isSupabaseConfigured) {
  console.error(
    '[Abapfy] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.\n' +
    'Verifique os secrets no ambiente DEV do GitHub Actions.'
  )
}

export const supabase = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY
)
