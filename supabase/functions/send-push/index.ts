// Edge function: send-push
// Trimite notificari Web Push catre organizatori. Apelata de app (admin/organizator) via invoke.
// Secrete necesare (Supabase -> Edge Functions -> Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex: mailto:clau.bocse@gmail.com)
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:clau.bocse@gmail.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const admin = createClient(SUPABASE_URL, SERVICE_KEY)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: userData } = await admin.auth.getUser(jwt)
    const uid = userData?.user?.id
    if (!uid) return json({ error: 'unauthorized' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', uid).maybeSingle()
    if (!prof || !['admin', 'organizer'].includes(prof.role)) return json({ error: 'forbidden' }, 403)

    const { profile_ids, all, exclude = [], title, body, link } = await req.json()
    let targets: string[] = []
    if (all) {
      const { data } = await admin.from('profiles').select('id').in('role', ['admin', 'organizer'])
      targets = (data ?? []).map((r: { id: string }) => r.id)
    } else {
      targets = Array.isArray(profile_ids) ? profile_ids : []
    }
    targets = targets.filter((id) => !exclude.includes(id))
    if (targets.length === 0) return json({ sent: 0 })

    const { data: subs } = await admin.from('push_subscriptions').select('*').in('profile_id', targets)
    const payload = JSON.stringify({ title, body, link })
    let sent = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
    return json({ sent })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
