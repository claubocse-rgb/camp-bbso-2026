// Edge function: activity-reminders
// Rulata periodic (pg_cron, la fiecare minut). Trimite push inainte de fiecare activitate.
// Protejata prin header x-cron-secret == CRON_SECRET (verify_jwt e dezactivat pt aceasta functie).
// Secrete necesare: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:clau.bocse@gmail.com'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
const admin = createClient(SUPABASE_URL, SERVICE_KEY)

// data + minutele curente in fusul Europe/Bucharest
function nowInBucharest() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const date = `${g('year')}-${g('month')}-${g('day')}`
  const minutes = parseInt(g('hour')) * 60 + parseInt(g('minute'))
  return { date, minutes }
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('forbidden', { status: 403 })
  }
  const { date, minutes } = nowInBucharest()

  const { data: acts } = await admin.from('activities')
    .select('id, title, start_time, location, notify_minutes_before')
    .eq('day', date).eq('reminder_sent', false).not('start_time', 'is', null)

  const due = (acts ?? []).filter((a) => {
    const [h, m] = String(a.start_time).split(':').map(Number)
    const startMin = h * 60 + m
    const remindMin = startMin - (a.notify_minutes_before ?? 15)
    return minutes >= remindMin && minutes <= startMin + 30
  })
  if (due.length === 0) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })

  const { data: profs } = await admin.from('profiles').select('id').in('role', ['admin', 'organizer'])
  const targetIds = (profs ?? []).map((p: { id: string }) => p.id)
  const { data: subs } = await admin.from('push_subscriptions').select('*').in('profile_id', targetIds)

  let sent = 0
  for (const a of due) {
    const [h, m] = String(a.start_time).split(':').map(Number)
    const payload = JSON.stringify({
      title: `🔔 Urmează: ${a.title}`,
      body: `La ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${a.location ? ' · ' + a.location : ''}`,
      link: '/orar',
    })
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
    await admin.from('activities').update({ reminder_sent: true }).eq('id', a.id)
  }
  return new Response(JSON.stringify({ due: due.length, sent }), { headers: { 'Content-Type': 'application/json' } })
})
