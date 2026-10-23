import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const backendPort =
    process.env.BACKEND_PORT ||
    (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : '3001');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@client': path.resolve(__dirname, 'client/src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
