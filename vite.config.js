import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import okx from './api/okx.js'
import { randomBytes } from 'node:crypto'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'astrobot-okx-dev',
    configureServer(server) {
      if (!process.env.OKX_DEMO_COOKIE_KEY) process.env.OKX_DEMO_COOKIE_KEY = randomBytes(32).toString('hex')
      server.middlewares.use('/api/okx', async (req, res) => {
        req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
        if (req.method === 'POST') {
          try {
            let size = 0;
            const chunks = [];
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 4096) throw new Error('Corpo excessivo');
              chunks.push(chunk);
            }
            req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch { res.statusCode = 400; res.end(JSON.stringify({ error: 'Corpo inválido' })); return; }
        }
        const reply = {
          setHeader: (...args) => res.setHeader(...args),
          status(code) { res.statusCode = code; return this },
          json(body) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); return this }
        };
        await okx(req, reply);
      });
    }
  }],
  base: './'
})
