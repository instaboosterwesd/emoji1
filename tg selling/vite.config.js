import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'low-page',
      configureServer(server) {
        server.middlewares.use('/low/', (req, _res, next) => {
          req.url = '/low/index.html';
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
