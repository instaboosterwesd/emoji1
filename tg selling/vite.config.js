import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'low-page',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          // Serve low/index.html only for top-level navigation to /low or /low/
          // Do NOT intercept asset/script requests like /low/src/main.jsx
          if (req.url === '/low' || req.url === '/low/') {
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
