/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { Buffer } from 'buffer';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
// Expose Buffer as global for browser environment
// Buffer polyfill is handled by vite-plugin-node-polyfills

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@emotion/react', '@mui/material', '@tremor/react'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@emotion/react', '@mui/material', '@tremor/react'],
        },
      },
    },
  },
  define: {
    // Provide polyfills for Node.js globals
    'global': 'globalThis',
    'process.env': {}
  },
  server: {
    allowedHosts: [
      'ac782fd5-7032-42da-9e73-0011e3b678f8-00-170e7i1v5u9ae.riker.replit.dev',
      'localhost',
    ],
    host: true, // Allow connections from all network interfaces
  },
});
