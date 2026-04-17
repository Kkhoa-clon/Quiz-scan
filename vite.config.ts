import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
// Không import express/quizFileApi ở top-level — tránh Rolldown dep-scan xung đột dev server.
export default defineConfig({
  optimizeDeps: {
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'QuizScan AI',
        short_name: 'QuizScan',
        description:
          'Chụp đề trắc nghiệm → AI giải ngay → Làm bài như Azota → Xem kết quả chi tiết',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'vi',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
    {
      name: 'quiz-file-api',
      async configureServer(server: ViteDevServer) {
        const { createQuizApiApp } = await import('./server/quizFileApi')
        const dataDir = path.join(__dirname, 'data', 'quizzes')
        const env = loadEnv(server.config.mode, server.config.root, '')
        server.middlewares.use(
          '/api',
          createQuizApiApp(dataDir, { ollamaHost: env.OLLAMA_HOST })
        )
      },
    },
  ],
  server: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {},
  },
})
