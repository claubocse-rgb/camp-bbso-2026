export type StudyTeam = { id: string; name: string; description: string | null; created_at: string }
export type GameTeam = { id: string; name: string; description: string | null; created_at: string }

export type Participant = {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  gender: 'M' | 'F' | null
  age: number | null
  birth_date: string | null
  phone: string | null
  email: string | null
  city: string | null
  baptized: string | null
  been_before: string | null
  bbso_member: string | null
  small_group: string | null
  department: string | null
  payment: string | null
  payment_method: string | null
  cazare: string | null
  suggestions: string | null
  tshirt_size: string | null
  kind: 'participant' | 'lider' | 'copil_lider'
  study_team_id: string | null
  game_team_id: string | null
  room_id: string | null
  status: 'confirmat' | 'rezerva'
  notes: string | null
  created_at: string
  access_token?: string
  consent_accepted?: boolean
  consent_name?: string | null
  consent_at?: string | null
  parent_name?: string | null
  parent_phone?: string | null
  emergency_name?: string | null
  emergency_phone?: string | null
  medical_info?: string | null
  sign_date?: string | null
  is_member?: boolean
  paid_amount?: number
}

export type Room = {
  id: string
  building: string
  name: string
  level: string | null
  capacity: number
  beds: string | null
  bathroom: string | null
  blocked: number
  sort_order: number
}

export type Activity = {
  id: string
  day: string
  start_time: string | null
  end_time: string | null
  title: string
  description: string | null
  location: string | null
  kind: string
  responsible_id: string | null
  notify_minutes_before: number
  created_by: string | null
  created_at: string
}

export type Game = {
  id: string
  title: string
  description: string | null
  responsible_id: string | null
  scheduled_at: string | null
  location: string | null
  created_by: string | null
  created_at: string
}

export type Study = {
  id: string
  title: string
  day: string | null
  storage_path: string
  file_name: string | null
  uploaded_by: string | null
  created_at: string
}

export type Task = {
  id: string
  title: string
  description: string | null
  claimed_by: string | null
  claimed_at: string | null
  assigned_to: string | null
  assigned_all: boolean
  done: boolean
  done_at: string | null
  due_at: string | null
  created_by: string | null
  created_at: string
}

export type Message = {
  id: string
  channel: string
  sender_id: string
  body: string
  created_at: string
}

export type ProfileLite = {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
}

export const ACTIVITY_KINDS: { value: string; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'masa', label: 'Masă' },
  { value: 'studiu', label: 'Studiu' },
  { value: 'joc', label: 'Joc' },
  { value: 'seara', label: 'Seară' },
  { value: 'liber', label: 'Timp liber' },
  { value: 'transport', label: 'Transport' },
  { value: 'altele', label: 'Altele' },
]
