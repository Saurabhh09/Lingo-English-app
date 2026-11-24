import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://lingo-ruby-three.vercel.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
