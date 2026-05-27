import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '墨属 - 个人图书管理',
        short_name: '墨属',
        description: '个人图书管理系统',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          { src: 'favicon.svg', sizes: '48x48', type: 'image/svg+xml' },
          { src: 'favicon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ctjhprrzcjjukocwnblo\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
