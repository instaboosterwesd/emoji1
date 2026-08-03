import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'low-page',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Serve the low app shell for /low and its client-side routes.
          // Do NOT intercept the low app's module requests.
          if ((req.url === '/low' || req.url.startsWith('/low/')) && !req.url.startsWith('/low/src/')) {
            req.url = '/low/index.html';
          }
          next();
        });
      },
    },
  ],
  server: {
    host: true,
    port: parseInt(process.env.PORT || '5173'),
    allowedHosts: true,
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
});
