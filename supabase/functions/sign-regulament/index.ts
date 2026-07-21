// Edge function: sign-regulament
// Genereaza un PDF cu regulamentul + o pagina de declaratie completata/semnata si il trimite pe email (Brevo).
// Apelabila de portal (anon) validata prin token. Secrete: BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { encodeBase64 } from 'jsr:@std/encoding/base64'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL') ?? ''
const BREVO_FROM_NAME = Deno.env.get('BREVO_FROM_NAME') ?? 'Camp BBSO 2026'

const admin = createClient(SUPABASE_URL, SERVICE_KEY)
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// transliterare pt fontul standard (fara diacritice ce nu-s in WinAnsi)
function tr(s: unknown): string {
  if (s === null || s === undefined) return ''
  let x = String(s)
    .replace(/[șşȘŞ]/g, (c) => (c === c.toUpperCase() ? 'S' : 's'))
    .replace(/[țţȚŢ]/g, (c) => (c === c.toUpperCase() ? 'T' : 't'))
  x = x.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return x.replace(/[^\x00-\xFF]/g, '?')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) return json({ error: 'Email neconfigurat (BREVO).' }, 400)
    const { token } = await req.json()
    if (!token) return json({ error: 'token necesar' }, 400)

    const { data: p } = await admin.from('participants').select('*').eq('access_token', token).maybeSingle()
    if (!p) return json({ error: 'token invalid' }, 404)

    const { data: settingsRows } = await admin.from('camp_settings').select('key,value')
    const settings: Record<string, string> = {}
    ;(settingsRows ?? []).forEach((r: any) => (settings[r.key] = r.value))
    const regUrl = settings.regulament_url
    const signedTo = settings.signed_to || BREVO_FROM_EMAIL

    // incarca regulamentul si adauga pagina de declaratie
    let pdfDoc: PDFDocument
    if (regUrl) {
      const res = await fetch(regUrl)
      const bytes = new Uint8Array(await res.arrayBuffer())
      pdfDoc = await PDFDocument.load(bytes)
    } else {
      pdfDoc = await PDFDocument.create()
    }
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const page = pdfDoc.addPage([595, 842])
    const green = rgb(0.12, 0.43, 0.33)
    let y = 800
    const line = (label: string, value: string, size = 11) => {
      page.drawText(tr(label), { x: 40, y, size, font: bold, color: green }); y -= 15
      const val = tr(value || '—')
      // wrap la ~85 caractere
      const chunks = val.match(/.{1,85}(\s|$)/g) || [val]
      for (const c of chunks) { page.drawText(c.trim(), { x: 40, y, size, font }); y -= 15 }
      y -= 6
    }
    page.drawText('DECLARATIE COMPLETATA SI SEMNATA', { x: 40, y, size: 15, font: bold, color: green }); y -= 12
    page.drawText(tr('Regulament Tabara BBSO - Voronet 2026'), { x: 40, y, size: 10, font }); y -= 28

    line('Nume participant:', p.full_name)
    if (p.age != null) line('Varsta:', String(p.age))
    line('Marime tricou:', p.tshirt_size)
    line('Data:', p.sign_date)
    line('Nume parinte / tutore legal (minori):', p.parent_name)
    line('Telefon parinte (WhatsApp):', p.parent_phone)
    line('Contact urgenta - nume:', p.emergency_name)
    line('Contact urgenta - telefon:', p.emergency_phone)
    line('Alergii / afectiuni / info medicale:', p.medical_info)

    y -= 10
    const decl = 'Prin semnatura de mai jos declar ca am citit integral, am inteles si sunt de acord cu prevederile regulamentului taberei, si (in cazul minorilor) imi exprim acordul pentru participare, foto/video si comunicarea informatiilor medicale.'
    for (const c of (tr(decl).match(/.{1,90}(\s|$)/g) || [decl])) { page.drawText(c.trim(), { x: 40, y, size: 10, font }); y -= 14 }
    y -= 16
    page.drawText('Semnatura (electronic):', { x: 40, y, size: 11, font: bold, color: green })
    page.drawText(tr(p.consent_name || p.full_name), { x: 200, y, size: 12, font: bold }); y -= 20
    const when = p.consent_at ? new Date(p.consent_at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : ''
    page.drawText(tr('Confirmat electronic la: ' + when), { x: 40, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) })

    const outBytes = await pdfDoc.save()
    const b64 = encodeBase64(outBytes)
    const fname = 'Regulament_semnat_' + tr(p.full_name).replace(/[^\w]+/g, '_') + '.pdf'

    // email cu atasament (organizator + copie participant)
    const to = [{ email: signedTo, name: 'Organizatori BBSO' }]
    const cc = (typeof p.email === 'string' && p.email.includes('@')) ? [{ email: p.email }] : undefined
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({
        sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
        to, cc,
        subject: `Regulament semnat — ${p.full_name}`,
        htmlContent: `<p>Regulament completat si semnat electronic de <b>${p.full_name}</b>.</p><p>Documentul complet este atasat.</p>`,
        attachment: [{ content: b64, name: fname }],
      }),
    })
    if (!res.ok) { const t = await res.text(); return json({ error: 'Email: ' + t }, 500) }
    return json({ ok: true, sent_to: signedTo })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
