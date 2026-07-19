import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { ProfileLite } from './types'

// Lista organizatorilor (pentru a alege responsabili)
export function useOrganizers() {
  const [organizers, setOrganizers] = useState<ProfileLite[]>([])
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .in('role', ['admin', 'organizer'])
      .order('full_name')
      .then(({ data }) => setOrganizers((data as ProfileLite[]) ?? []))
  }, [])
  return organizers
}

export function organizerName(list: ProfileLite[], id: string | null): string {
  if (!id) return '—'
  const p = list.find((o) => o.id === id)
  return p?.full_name || p?.email || '—'
}
