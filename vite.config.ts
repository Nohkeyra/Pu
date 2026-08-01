import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
  ],
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
    // 'hidden' generates .map files for server-side error tracing (Render logs,
    // future error-reporting tools) without referencing them in the bundle —
    // browsers will not auto-fetch or expose the original source to end users.
    sourcemap: 'hidden',
    rollupOptions: {
      external: ['@firebase/webchannel-wrapper/bloom-blob'],
      onwarn(warning, warn) {
        // Ignore "eval" warnings from third-party packages (like eruda)
        if (warning.code === 'EVAL' && (warning.id?.includes('node_modules') || warning.id?.includes('eruda'))) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          'vendor-core': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', '@radix-ui/react-select', 'clsx', 'tailwind-merge'],
          'vendor-icons': ['lucide-react'],
          'vendor-motion': ['motion'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-excel': ['exceljs'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
});
