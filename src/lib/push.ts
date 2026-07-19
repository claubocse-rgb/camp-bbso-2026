import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enablePush(profileId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Dispozitivul nu suportă notificări push.' }
  if (!VAPID_PUBLIC) return { ok: false, error: 'Lipsește cheia VAPID publică.' }

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, error: 'Permisiunea pentru notificări a fost refuzată.' }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
    })
  }
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    profile_id: profileId,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  }, { onConflict: 'endpoint' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

// Trimite push prin edge function (apelat de admin la alerta / la mesaj chat)
export async function sendPush(payload: {
  profile_ids?: string[]
  all?: boolean
  exclude?: string[]
  title: string
  body?: string
  link?: string
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-push', { body: payload })
  } catch {
    // push e best-effort; nu blocam UI daca esueaza
  }
}
