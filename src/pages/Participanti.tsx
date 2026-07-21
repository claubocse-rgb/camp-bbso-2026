import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Participant } from '../lib/types'
import Modal from '../components/Modal'

type Filter = 'toti' | 'confirmat' | 'rezerva'
const TSHIRTS = ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

export default function Participanti() {
  const [people, setPeople] = useState<Participant[]>([])
  const [teams, setTeams] = useState<Record<string, string>>({})
  const [rooms, setRooms] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('toti')
  const [gender, setGender] = useState('toti')
  const [age, setAge] = useState('')
  const [shirt, setShirt] = useState('toti')
  const [tip, setTip] = useState('toti')
  const [housing, setHousing] = useState('toti')
  const [member, setMember] = useState('toti')
  const [addModal, setAddModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [detail, setDetail] = useState<Participant | null>(null)

  const load = useCallback(async () => {
    const [{ data: p }, { data: st }, { data: gt }, { data: rm }] = await Promise.all([
      supabase.from('participants').select('*').order('full_name'),
      supabase.from('study_teams').select('id, name'),
      supabase.from('game_teams').select('id, name'),
      supabase.from('rooms').select('id, building, name'),
    ])
    setPeople((p as Participant[]) ?? [])
    const t: Record<string, string> = {}
    ;(st ?? []).forEach((x: any) => (t['s' + x.id] = x.name))
    ;(gt ?? []).forEach((x: any) => (t['g' + x.id] = x.name))
    setTeams(t)
    const r: Record<string, string> = {}
    ;(rm ?? []).forEach((x: any) => (r[x.id] = `${x.building} · ${x.name}`))
    setRooms(r)
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
    let t: ReturnType<typeof setTimeout>
    const ch = supabase.channel('participants-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => { clearTimeout(t); t = setTimeout(load, 400) })
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [load])

  async function addOne(name: string, age: string, phone: string, status: string) {
    if (!name.trim()) return
    await supabase.from('participants').insert({
      full_name: name.trim(), age: age ? Number(age) : null, phone: phone || null, status,
    })
    setAddModal(false); load()
  }
  async function importMany(text: string, status: string) {
    const rows = text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const m = line.split(/[,;\t]/).map((s) => s.trim())
      return { full_name: m[0], status }
    }).filter((r) => r.full_name)
    if (rows.length === 0) return
    await supabase.from('participants').insert(rows)
    setImportModal(false); load()
  }
  async function setTshirt(id: string, size: string) {
    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, tshirt_size: size || null } : p))
    await supabase.from('participants').update({ tshirt_size: size || null }).eq('id', id)
  }
  async function setGenderVal(id: string, g: string) {
    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, gender: (g || null) as any } : p))
    await supabase.from('participants').update({ gender: g || null }).eq('id', id)
  }
  async function setKind(id: string, k: string) {
    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, kind: k as any } : p))
    await supabase.from('participants').update({ kind: k }).eq('id', id)
  }
  async function toggleStatus(p: Participant) {
    await supabase.from('participants').update({ status: p.status === 'rezerva' ? 'confirmat' : 'rezerva' }).eq('id', p.id); load()
  }
  async function remove(id: string) {
    if (!confirm('Ștergi participantul din bază?')) return
    await supabase.from('participants').delete().eq('id', id); load()
  }

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const confirmedCount = people.filter((p) => p.status !== 'rezerva').length
  const reserveCount = people.filter((p) => p.status === 'rezerva').length
  const withShirt = people.filter((p) => p.tshirt_size).length
  const ageNum = age ? Number(age) : null
  const filtered = people
    .filter((p) => filter === 'toti' || p.status === filter)
    .filter((p) => tip === 'toti' || (tip === 'rezerva' ? p.status === 'rezerva' : p.kind === tip))
    .filter((p) => housing === 'toti' || (housing === 'cazat' ? !!p.room_id : !p.room_id))
    .filter((p) => member === 'toti' || (member === 'membru' ? !!p.is_member : !p.is_member))
    .filter((p) => gender === 'toti' || (gender === 'none' ? !p.gender : p.gender === gender))
    .filter((p) => ageNum === null || p.age === ageNum)
    .filter((p) => shirt === 'toti' || (shirt === 'none' ? !p.tshirt_size : p.tshirt_size === shirt))
    .filter((p) => !q.trim() || norm(p.full_name).includes(norm(q)) || norm(p.city || '').includes(norm(q)))
  const boys = people.filter((p) => p.gender === 'M').length
  const girls = people.filter((p) => p.gender === 'F').length
  const leaders = people.filter((p) => p.kind === 'lider').length
  const housed = people.filter((p) => p.room_id).length

  return (
    <div className="page wide">
      <header className="page-head with-action">
        <div>
          <h1>Participanți</h1>
          <p className="muted">Baza de date. Rezervele se bagă doar dacă e loc. Mărimea tricoului se completează în tabel.</p>
        </div>
        <div className="head-actions">
          <button className="btn-secondary" onClick={() => setImportModal(true)}>Import listă</button>
          <button className="btn-primary" onClick={() => setAddModal(true)}>+ Participant</button>
        </div>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <>
          <div className="seg">
            <button className={filter === 'toti' ? 'on' : ''} onClick={() => setFilter('toti')}>Toți ({people.length})</button>
            <button className={filter === 'confirmat' ? 'on' : ''} onClick={() => setFilter('confirmat')}>Confirmați ({confirmedCount})</button>
            <button className={filter === 'rezerva' ? 'on' : ''} onClick={() => setFilter('rezerva')}>Rezerve ({reserveCount})</button>
          </div>
          <div className="p-toolbar">
            <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută nume sau oraș…" />
            <span className="muted small">{filtered.length} afișați · <b style={{ color: 'var(--green-700)' }}>{housed} cazați</b> · {withShirt} cu tricou · {boys} băieți / {girls} fete</span>
          </div>
          <div className="filters-row">
            <label>Tip
              <select value={tip} onChange={(e) => setTip(e.target.value)}>
                <option value="toti">Toți</option>
                <option value="participant">Participanți</option>
                <option value="lider">Lideri</option>
                <option value="copil_lider">Copii lideri</option>
                <option value="rezerva">Rezerve</option>
              </select>
            </label>
            <label>Gen
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="toti">Toți</option>
                <option value="M">Băieți</option>
                <option value="F">Fete</option>
                <option value="none">Fără gen</option>
              </select>
            </label>
            <label>Vârstă
              <input type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} placeholder="ex. 14" style={{ width: 90, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: '.88rem' }} />
            </label>
            <label>Cazare
              <select value={housing} onChange={(e) => setHousing(e.target.value)}>
                <option value="toti">Toți</option>
                <option value="cazat">Cazați</option>
                <option value="necazat">Necazați</option>
              </select>
            </label>
            <label>Membru
              <select value={member} onChange={(e) => setMember(e.target.value)}>
                <option value="toti">Toți</option>
                <option value="membru">Membri (1500)</option>
                <option value="nonmembru">Non-membri (1900)</option>
              </select>
            </label>
            <label>Mărime tricou
              <select value={shirt} onChange={(e) => setShirt(e.target.value)}>
                <option value="toti">Toate</option>
                {TSHIRTS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="none">Fără mărime</option>
              </select>
            </label>
            {(tip !== 'toti' || gender !== 'toti' || age || shirt !== 'toti' || housing !== 'toti' || member !== 'toti') && (
              <button className="link-btn" onClick={() => { setTip('toti'); setGender('toti'); setAge(''); setShirt('toti'); setHousing('toti'); setMember('toti') }}>Resetează filtre</button>
            )}
          </div>
          <div className="table-wrap">
            <table className="p-table">
              <thead>
                <tr><th>Cazat</th><th>Nume</th><th>Tip</th><th>Clasă</th><th>Gen</th><th>Vârstă</th><th>Oraș</th><th>Telefon</th><th>Mărime tricou</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={(p.status === 'rezerva' ? 'is-reserve ' : '') + 'kind-' + p.kind}>
                    <td className="cazat-cell">{p.room_id ? <span className="cazat-check" title="Repartizat în cameră">✓</span> : <span className="cazat-no" title="Încă fără cameră">·</span>}</td>
                    <td>
                      <button className="linklike" onClick={() => setDetail(p)}>{p.full_name}</button>
                      {p.kind === 'lider' && <span className="kind-tag lider">Lider</span>}
                      {p.kind === 'copil_lider' && <span className="kind-tag copil">Copil lider</span>}
                    </td>
                    <td>
                      <select className="tshirt kind-select" value={p.kind} onChange={(e) => setKind(p.id, e.target.value)}>
                        <option value="participant">Participant</option>
                        <option value="lider">Lider</option>
                        <option value="copil_lider">Copil lider</option>
                      </select>
                    </td>
                    <td>
                      <button className={'status-pill ' + p.status} onClick={() => toggleStatus(p)} title="Comută confirmat / rezervă">
                        {p.status === 'rezerva' ? 'Rezervă' : 'Confirmat'}
                      </button>
                    </td>
                    <td>
                      <select className="tshirt" value={p.gender ?? ''} onChange={(e) => setGenderVal(p.id, e.target.value)}>
                        <option value="">—</option><option value="M">M</option><option value="F">F</option>
                      </select>
                    </td>
                    <td>{p.age ?? '—'}</td>
                    <td className="muted small">{p.city || '—'}</td>
                    <td className="muted small">{p.phone || '—'}</td>
                    <td>
                      <select className="tshirt" value={p.tshirt_size ?? ''} onChange={(e) => setTshirt(p.id, e.target.value)}>
                        {TSHIRTS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                      </select>
                    </td>
                    <td className="nowrap">
                      {!p.email && <span className="no-email-badge sm" title="Fără adresă de email">!</span>}
                      <button className="link-btn" onClick={() => setDetail(p)}>Detalii</button>
                      <button className="link-btn danger" onClick={() => remove(p.id)}>✕</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 20 }}>Niciun participant.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {addModal && <Modal title="Participant nou" onClose={() => setAddModal(false)}><AddForm onSave={addOne} /></Modal>}
      {importModal && <Modal title="Import listă participanți" onClose={() => setImportModal(false)}><ImportForm onSave={importMany} /></Modal>}
      {detail && <DetailModal p={detail} teams={teams} rooms={rooms} onClose={() => setDetail(null)} onSaved={load} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '' || value === '-') return null
  return <div className="d-row"><span className="d-label">{label}</span><span className="d-val">{value}</span></div>
}

function DetailModal({ p, teams, rooms, onClose, onSaved }: {
  p: Participant; teams: Record<string, string>; rooms: Record<string, string>; onClose: () => void; onSaved: () => void
}) {
  const [email, setEmail] = useState(p.email ?? '')
  const [phone, setPhone] = useState(p.phone ?? '')
  const [isMember, setIsMember] = useState(!!p.is_member)
  const [paid, setPaid] = useState(String(p.paid_amount ?? 0))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const total = isMember ? 1500 : 1900
  const rest = Math.max(total - (Number(paid) || 0), 0)
  const dirty = email.trim() !== (p.email ?? '') || phone.trim() !== (p.phone ?? '')
    || isMember !== !!p.is_member || (Number(paid) || 0) !== (p.paid_amount ?? 0)
  async function saveContact() {
    setBusy(true); setMsg('')
    const { error } = await supabase.from('participants').update({
      email: email.trim() || null, phone: phone.trim() || null,
      is_member: isMember, paid_amount: Number(paid) || 0,
    }).eq('id', p.id)
    setBusy(false)
    if (error) { setMsg('Eroare: ' + error.message); return }
    setMsg('✓ Salvat'); onSaved(); setTimeout(() => setMsg(''), 2000)
  }
  return (
    <Modal title={p.full_name} onClose={onClose}>
      <div className="detail">
        <Row label="Clasă" value={p.status === 'rezerva' ? 'Rezervă' : 'Confirmat'} />
        <Row label="Vârstă" value={p.age} />
        <Row label="Data nașterii" value={p.birth_date} />
        <div className="d-edit">
          <div className="detail-sep" style={{ marginTop: 4 }}>Contact {email.trim() ? '' : '⚠️ fără email'}</div>
          <label className="sign-name">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.com" />
          </label>
          <label className="sign-name">Telefon
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" inputMode="tel" />
          </label>
          <div className="detail-sep" style={{ marginTop: 4 }}>Plată</div>
          <label className="check-row"><input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} /> Membru BBSO (tarif 1500 lei){!isMember && ' — acum: non-membru 1900 lei'}</label>
          <label className="sign-name">Avans achitat (lei)
            <input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" inputMode="numeric" />
          </label>
          <p className="small" style={{ margin: '2px 0 6px' }}>Tarif total: <b>{total} lei</b> · Rest de plată: <b>{rest} lei</b></p>
          <button className="btn-primary" onClick={saveContact} disabled={!dirty || busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
          {msg && <p className={'small ' + (msg.startsWith('✓') ? 'saved-note' : 'error-text')}>{msg}</p>}
        </div>
        <Row label="Localitate" value={p.city} />
        <Row label="Mărime tricou" value={p.tshirt_size} />
        <Row label="Botezat" value={p.baptized} />
        <Row label="A mai fost în tabără" value={p.been_before} />
        <Row label="Membru BBSO" value={p.bbso_member} />
        <Row label="Grup mic / lider" value={p.small_group} />
        <Row label="Departament" value={p.department} />
        <Row label="Plată" value={p.payment} />
        <Row label="Detalii plată" value={p.payment_method} />
        <Row label="Echipă studiu" value={p.study_team_id ? teams['s' + p.study_team_id] : null} />
        <Row label="Echipă jocuri" value={p.game_team_id ? teams['g' + p.game_team_id] : null} />
        <Row label="Cameră" value={p.room_id ? rooms[p.room_id] : null} />
        <Row label="Sugestii" value={p.suggestions} />
        <Row label="Note" value={p.notes} />
        {(p.consent_accepted || p.parent_name || p.emergency_name || p.medical_info) && (
          <>
            <div className="detail-sep">Declarație semnată</div>
            <Row label="Semnat de" value={p.consent_accepted ? (p.consent_name || p.full_name) : null} />
            <Row label="Data semnării" value={p.consent_at ? new Date(p.consent_at).toLocaleString('ro-RO') : p.sign_date} />
            <Row label="Părinte / tutore" value={p.parent_name} />
            <Row label="Telefon părinte" value={p.parent_phone} />
            <Row label="Contact urgență" value={p.emergency_name} />
            <Row label="Telefon urgență" value={p.emergency_phone} />
            <Row label="Info medicale" value={p.medical_info} />
          </>
        )}
      </div>
    </Modal>
  )
}

function AddForm({ onSave }: { onSave: (name: string, age: string, phone: string, status: string) => void }) {
  const [name, setName] = useState(''); const [age, setAge] = useState(''); const [phone, setPhone] = useState(''); const [rez, setRez] = useState(false)
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(name, age, phone, rez ? 'rezerva' : 'confirmat') }}>
      <label>Nume și prenume<input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="form-row">
        <label>Vârstă<input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></label>
        <label>Telefon<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={rez} onChange={(e) => setRez(e.target.checked)} /> Adaugă ca rezervă</label>
      <button className="btn-primary" type="submit">Adaugă</button>
    </form>
  )
}

function ImportForm({ onSave }: { onSave: (text: string, status: string) => void }) {
  const [text, setText] = useState(''); const [rez, setRez] = useState(false)
  const count = text.split('\n').map((l) => l.trim()).filter(Boolean).length
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(text, rez ? 'rezerva' : 'confirmat') }}>
      <label>Lipește lista — un nume pe fiecare rând
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder={'Popescu Ion\nIonescu Maria'} />
      </label>
      <label className="check-row"><input type="checkbox" checked={rez} onChange={(e) => setRez(e.target.checked)} /> Importă toți ca rezerve</label>
      <button className="btn-primary" type="submit" disabled={count === 0}>Importă {count > 0 ? `(${count})` : ''}</button>
    </form>
  )
}
