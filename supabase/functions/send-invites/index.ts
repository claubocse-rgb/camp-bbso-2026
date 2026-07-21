// Edge function: send-invites — trimite emailuri cu linkul personal (prin Brevo)
// Secrete: BREVO_API_KEY, BREVO_FROM_EMAIL (expeditor validat in Brevo), optional BREVO_FROM_NAME
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') ?? ''
const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') ?? 'Camp BBSO 2026'

const admin = createClient(SUPABASE_URL, SERVICE_KEY)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function emailHtml(firstName: string, message: string, link: string) {
  const body = esc(message).replace(/\n/g, '<br>')
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#10241c">
    <div style="background:#0f3d2e;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0"><b style="letter-spacing:1px">BBSO 2026</b></div>
    <div style="border:1px solid #e4ebe6;border-top:none;border-radius:0 0 14px 14px;padding:22px">
      <p>Salut, ${esc(firstName)}!</p>
      <p style="line-height:1.5">${body}</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="background:#2a8869;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Deschide pagina ta</a>
      </p>
      <p style="font-size:12px;color:#6b7c74">Sau copiază linkul: <br>${link}</p>
    </div>
  </div>`
}

async function sendOne(toEmail: string, toName: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' },
    body: JSON.stringify({
      sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject, htmlContent: html,
    }),
  })
  if (!res.ok) { const t = await res.text(); throw new Error(`${res.status}: ${t}`) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u?.user?.id) return json({ error: 'unauthorized' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', u.user.id).maybeSingle()
    if (prof?.role !== 'admin') return json({ error: 'forbidden (doar admin)' }, 403)
    if (!BREVO_API_KEY) return json({ error: 'Lipseste BREVO_API_KEY in secretele edge function.' }, 400)
    if (!BREVO_FROM_EMAIL) return json({ error: 'Lipseste BREVO_FROM_EMAIL (expeditor validat in Brevo).' }, 400)

    const { subject, message, link_base, only_confirmed = true, test_email, single_id } = await req.json()
    if (!subject || !message || !link_base) return json({ error: 'subject, message, link_base necesare' }, 400)

    // trimitere catre o singura persoana (buton pe rand)
    if (single_id) {
      const { data: one } = await admin.from('participants').select('full_name, first_name, email, access_token').eq('id', single_id).maybeSingle()
      if (!one) return json({ error: 'Persoana nu a fost gasita.' }, 404)
      if (typeof one.email !== 'string' || !one.email.includes('@')) return json({ error: 'Persoana nu are email valid.' }, 400)
      const first = one.first_name || String(one.full_name || '').split(' ').slice(-1)[0] || 'prieten'
      try {
        await sendOne(one.email, String(one.full_name || ''), subject, emailHtml(first, message, link_base + one.access_token))
      } catch (e) { return json({ error: (e as Error).message }, 500) }
      return json({ single: true, sent_to: one.email })
    }

    let q = admin.from('participants').select('full_name, first_name, email, access_token').not('email', 'is', null)
    if (only_confirmed) q = q.eq('status', 'confirmat')
    const { data: parts } = await q
    const valid = (parts ?? []).filter((p: any) => typeof p.email === 'string' && p.email.includes('@'))

    if (test_email) {
      const sample = valid[0]
      const token = sample?.access_token ?? '00000000-0000-0000-0000-000000000000'
      await sendOne(test_email, '(test)', `[TEST] ${subject}`, emailHtml('(test)', message, link_base + token))
      return json({ test: true, sent_to: test_email })
    }

    let sent = 0; const errors: string[] = []
    for (const p of valid) {
      const first = p.first_name || String(p.full_name || '').split(' ').slice(-1)[0] || 'prieten'
      try { await sendOne(p.email, String(p.full_name || ''), subject, emailHtml(first, message, link_base + p.access_token)); sent++ }
      catch (e) { errors.push(`${p.email}: ${(e as Error).message}`) }
      await sleep(150)
    }
    return json({ sent, total: valid.length, errors: errors.slice(0, 10), more_errors: Math.max(0, errors.length - 10) })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
