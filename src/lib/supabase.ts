import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error('Lipsesc VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY din .env')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type Role = 'admin' | 'organizer' | 'pending'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  study_team_id: string | null
  game_team_id: string | null
  created_at: string
}
