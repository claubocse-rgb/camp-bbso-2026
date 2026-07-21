import { useState, useRef, useEffect } from 'react'
import type { Participant } from '../lib/types'

export default function NameAutocomplete({
  participants,
  onPick,
  onCreate,
  allowCreate = true,
  placeholder = 'Scrie un nume…',
  autoFocus = false,
}: {
  participants: Participant[]
  onPick: (p: Participant) => void
  onCreate?: (name: string) => void
  allowCreate?: boolean
  placeholder?: string
  autoFocus?: boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const matches = q.trim()
    ? participants.filter((p) => norm(p.full_name).includes(norm(q.trim()))).slice(0, 8)
    : []
  const exact = participants.some((p) => norm(p.full_name) === norm(q.trim()))

  function pick(p: Participant) { onPick(p); setQ(''); setOpen(false) }
  function create() { if (allowCreate && onCreate && q.trim()) { onCreate(q.trim()); setQ(''); setOpen(false) } }

  function onKey(e: React.KeyboardEvent) {
    if (!open) return
    const items = matches.length + (allowCreate && q.trim() && !exact ? 1 : 0)
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, items - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (hi < matches.length) pick(matches[hi])
      else create()
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="ac" ref={ref}>
      <input
        autoFocus={autoFocus}
        value={q}
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {open && (matches.length > 0 || (allowCreate && q.trim() && !exact)) && (
        <div className="ac-list">
          {matches.map((p, i) => (
            <button key={p.id} type="button" className={'ac-item' + (i === hi ? ' hi' : '')}
              onMouseEnter={() => setHi(i)} onClick={() => pick(p)}>
              {p.full_name}{p.gender ? ` (${p.gender})` : ''}
            </button>
          ))}
          {allowCreate && q.trim() && !exact && (
            <button type="button" className={'ac-item ac-new' + (hi === matches.length ? ' hi' : '')}
              onMouseEnter={() => setHi(matches.length)} onClick={create}>
              + Adaugă „{q.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
