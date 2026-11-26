import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const apiProxyTarget = process.env.VITE_DEV_API_PROXY || 'http://127.0.0.1:3000';
const analyze = process.env.ANALYZE === '1';

export default defineConfig({
  plugins: [
    react(),
    analyze && visualizer({
      filename: process.env.ANALYZE_FILE || '../audit/bundle-treemap.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    analyze && visualizer({
      filename: process.env.ANALYZE_JSON || '../audit/bundle-stats.json',
      template: 'raw-data',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('/motion/') || id.includes('\\motion\\') || id.includes('framer-motion') || id.includes('canvas-confetti')) {
              return 'motion-vendor';
            }
          }
          if (id.includes('curriculumData.js') || id.includes('curriculumCatalog.mjs')) {
            return 'curriculum-data';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
