import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const publicApiHandler = require('../api/public-api.js');

function createVercelResponse(res) {
  const response = {
    status(code) {
      res.statusCode = code;
      return response;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
      return response;
    },
    end(body) {
      res.end(body);
      return response;
    },
  };
  return response;
}

function publicApiDevMiddleware() {
  return {
    name: 'public-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/public-api', (req, res) => {
        const queryStart = String(req.url || '').indexOf('?');
        const queryString = queryStart >= 0 ? req.url.slice(queryStart + 1) : '';
        req.query = Object.fromEntries(new URLSearchParams(queryString));

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          const rawBody = Buffer.concat(chunks).toString();
          if (rawBody) {
            try { req.body = JSON.parse(rawBody); } catch { req.body = rawBody; }
          }
          try {
            await publicApiHandler(req, createVercelResponse(res));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ success: false, error: { message: 'Public API request failed.' } }));
            server.config.logger.error(error);
          }
        });
      });
    },
  };
}

function resellerDevProxy(env) {
  return {
    name: 'reseller-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/reseller', (req, res) => {
          if (req.method === 'GET' && req.url === '/status') {
            const configured = Boolean(env.RESELLER_API_KEY && env.RESELLER_MASTER_KEY && env.RESELLER_ENDPOINT);
            res.statusCode = configured ? 200 : 503;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              configured,
              endpointConfigured: Boolean(env.RESELLER_ENDPOINT),
              credentialsConfigured: Boolean(env.RESELLER_API_KEY && env.RESELLER_MASTER_KEY),
              message: configured
                ? 'Reseller API is configured server-side.'
                : 'Set RESELLER_API_KEY, RESELLER_MASTER_KEY, and RESELLER_ENDPOINT in the server environment.',
            }));
            return;
          }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'Method not allowed.' }));
          return;
        }

        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          const incoming = new URLSearchParams(Buffer.concat(chunks).toString());
          // Never read reseller credentials from VITE_ variables. VITE values
          // are exposed to the browser bundle; these must stay server-side.
          const apiKey = env.RESELLER_API_KEY;
          const masterKey = env.RESELLER_MASTER_KEY;
          const endpoint = env.RESELLER_ENDPOINT;
          if (!apiKey || !masterKey || !endpoint) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ message: 'Reseller API is not configured on the server.' }));
            return;
          }

          const action = String(incoming.get('action') || '').trim().toLowerCase();
          if (!['buy', 'balance'].includes(action)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ message: 'Invalid reseller action.' }));
            return;
          }
          const params = new URLSearchParams({ api_key: apiKey, action });
          for (const name of ['product_id', 'duration', 'android_id']) {
            const value = String(incoming.get(name) || '').trim();
            if (value) params.set(name, value);
          }

          try {
            const upstream = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-master-key': masterKey,
              },
              body: params,
              signal: AbortSignal.timeout(15000),
            });
            const raw = await upstream.text();
            res.statusCode = upstream.ok ? 200 : upstream.status;
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
            res.end(raw);
          } catch (error) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              message: error?.name === 'TimeoutError'
                ? 'Reseller API timed out after 15 seconds.'
                : 'Reseller API is unavailable.',
            }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Replit Secrets are injected into process.env. Merge them after .env so
  // server-only credentials work in the Vite dev proxy without being bundled.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [react(), resellerDevProxy(env), publicApiDevMiddleware()],
    define: {
      // Keep accidental client-side access to these names impossible.
      'import.meta.env.VITE_RESELLER_API_KEY': 'undefined',
      'import.meta.env.VITE_RESELLER_MASTER_KEY': 'undefined',
    },
    server: {
      host: true,
      port: parseInt(process.env.PORT || '5173'),
      allowedHosts: true,
      proxy: {
        '/api/products': {
          target: 'https://vercel-api-seven-sepia.vercel.app',
          changeOrigin: true,
          rewrite: () => `/scrape?cookie=${encodeURIComponent(env.PRODUCTS_SCRAPE_COOKIE || '')}`,
        },
      },
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/flaticon-proxy/**',
          '**/material-design-icons-4.0.0/**',
          '**/material-design-icons-4.0.0.zip',
        ],
      },
    },
  };
});
