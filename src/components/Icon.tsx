type IconName =
  | 'dashboard' | 'orar' | 'studiu-team' | 'jocuri-team' | 'camere'
  | 'studiu' | 'jocuri' | 'todo' | 'chat' | 'alerte' | 'logout' | 'participanti' | 'organizatori' | 'invitatii'

const paths: Record<IconName, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  orar: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8v9H5v-9h14z',
  'studiu-team': 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.16 13.99 17 15.09 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  'jocuri-team': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0 12c-2 0-3.8-1-4.9-2.5C7.2 14.6 9 14 12 14s4.8.6 4.9 1.5C15.8 17 14 18 12 18z',
  camere: 'M12 3 2 12h3v8h5v-6h4v6h5v-8h3L12 3z',
  studiu: 'M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-6 3 2.5 2.5L12 10 9.5 7.5 12 5zM8 13h8v2H8v-2zm0 4h8v2H8v-2z',
  jocuri: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2H6v2h2v2h2v-2h2v-2h-2V8H8zm7 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm2 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  todo: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8zM12 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  chat: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
  alerte: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z',
  participanti: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-9 2-9 5v3h18v-3c0-3-5-5-9-5z',
  organizatori: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.2 14.5L7 11.7l1.4-1.4 2.4 2.4 5-5L17.2 9l-6.4 6.5z',
  invitatii: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
}

export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
