import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const serviceWorkerVersion = process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'version-service-worker-cache',
      apply: 'build',
      async closeBundle() {
        const serviceWorkerPath = resolve(process.cwd(), 'dist/sw.js')
        const serviceWorker = await readFile(serviceWorkerPath, 'utf8')
        if (!serviceWorker.includes('__JURISPLANNER_BUILD_VERSION__')) {
          throw new Error('Service worker build version placeholder was not found.')
        }
        await writeFile(
          serviceWorkerPath,
          serviceWorker.replace('__JURISPLANNER_BUILD_VERSION__', serviceWorkerVersion),
          'utf8',
        )
      },
    },
  ],
  assetsInclude: ['**/*.txt'],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
