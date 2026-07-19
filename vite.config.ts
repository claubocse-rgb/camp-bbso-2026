import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// La build pentru GitHub Pages, site-ul e servit sub /camp-bbso-2026/.
// In dev ramane pe /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/camp-bbso-2026/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Camp BBSO 2026',
        short_name: 'BBSO 2026',
        description: 'Organizare tabără BBSO 2026',
        lang: 'ro',
        theme_color: '#1f6f54',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/camp-bbso-2026/',
        scope: '/camp-bbso-2026/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
}))
