import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * VITE_USE_MOCKS=true: answer /api/v1/* from src/shared/api/mocks, in the exact shape of contract 3.
 * The app keeps using its real fetch client (abort, blobs, error bodies); no mock code ships in the bundle.
 * Registered before Vite's own middlewares, so it wins over the /api proxy.
 */
function mockApi(): Plugin {
  const serve = (load: () => Promise<{ handle: (m: string, p: string, b: string) => MockResponse }>) =>
    async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (!req.url?.startsWith('/api/v1/')) return next()
      let raw = ''
      for await (const chunk of req) raw += chunk
      const { handle } = await load()
      const r = handle(req.method ?? 'GET', req.url.slice('/api/v1'.length).split('?')[0], raw)
      await new Promise((ok) => setTimeout(ok, 250)) // visible loading states in the demo
      res.statusCode = r.status
      res.setHeader('Content-Type', `${r.type}; charset=utf-8`)
      if (r.filename) res.setHeader('Content-Disposition', `attachment; filename="${r.filename}"`)
      res.end(r.body)
    }
  return {
    name: 'fire-calendar-mock-api',
    configureServer(server) {
      server.middlewares.use(serve(() => server.ssrLoadModule('/src/shared/api/mocks/server.ts') as never))
    },
  }
}
type MockResponse = { status: number; type: string; body: string; filename?: string }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react(), tailwindcss(), env.VITE_USE_MOCKS === 'true' && mockApi()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    build: {
      // The one big chunk is the lazily loaded map engine (maplibre-gl + mapbox-gl-draw, ~1.2 MB); the entry stays ~370 kB.
      chunkSizeWarningLimit: 1300,
    },
    server: {
      // Contract 3: the API lives on the same origin under /api/v1; in dev the Go backend runs on :8080.
      proxy: { '/api': 'http://localhost:8080' },
    },
  }
})
