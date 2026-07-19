/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Precache assets generate de build
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

// Primire push -> notificare
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; link?: string } = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  const title = data.title || 'Camp BBSO 2026'
  const options: NotificationOptions = {
    body: data.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    data: { link: data.link || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Click pe notificare -> deschide/aduce in fata aplicatia
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { (c as WindowClient).navigate(link); return (c as WindowClient).focus() }
      }
      return self.clients.openWindow(link)
    })
  )
})
