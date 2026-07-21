import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true, // CRITICAL: Ensures public/ copies correctly
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          framework: ['react', 'react-dom', 'react-router-dom', '@radix-ui/react-dialog', '@radix-ui/react-popover', 'lucide-react', 'motion/react'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          pdf: ['jspdf', 'jspdf-autotable']
        }
      },
    },
  },
});
