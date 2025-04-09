import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    allowedHosts: [
      'ac782fd5-7032-42da-9e73-0011e3b678f8-00-170e7i1v5u9ae.riker.replit.dev',
      'localhost',
    ],
    host: true, // Allow connections from all network interfaces
  },
});
