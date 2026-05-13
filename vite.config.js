import { defineConfig } from 'vite'

// https://vite.dev/config/
function removeCmsRoute() {
  const handler = (req, res, next) => {
    if (req.url === '/cms' || req.url?.startsWith('/cms/')) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end('CMS page removed. Use /editor for the visual editor.')
      return
    }
    next()
  }

  return {
    name: 'remove-cms-route',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  plugins: [removeCmsRoute()],
})
