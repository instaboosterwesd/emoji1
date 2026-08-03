import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: parseInt(process.env.PORT || '5173'),
    allowedHosts: true,
    proxy: {
      '/api/products': {
        target: 'https://vercel-api-seven-sepia.vercel.app',
        changeOrigin: true,
        rewrite: () => `/scrape?cookie=${encodeURIComponent(process.env.PRODUCTS_SCRAPE_COOKIE || '')}`,
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
});
