import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { writeSitemap } from './scripts/sitemap'
import { writeSpaShell } from './scripts/spaShell'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'دليلك – دليل العرب في بلجيكا',
        short_name: 'دليلك',
        description: 'كل شي عربي في بلجيكا: مطاعم، ملاحم حلال، أطباء، محامون، مساجد وأكثر.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b5d5b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell; the ~1000 listing pages are cached when visited.
        globPatterns: ['**/*.{js,css,svg,png}', 'assets/*{arabic,latin}-{400,500,700}-normal*.woff2', '*.html', '{fr,nl,en}/*.html'],
        globIgnores: ['**/l/**', 'static-loader-data/**'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 80 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/static-loader-data'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'page-data', expiration: { maxEntries: 120 } },
          },
        ],
      },
    }),
  ],
  ssgOptions: {
    script: 'async',
    formatting: 'none',
    dirStyle: 'flat',
    concurrency: 8,
    onFinished: async (dir: string) => {
      await writeSpaShell(dir)
      await writeSitemap(dir, loadEnv(mode, process.cwd(), 'VITE_'))
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
}) as never)
