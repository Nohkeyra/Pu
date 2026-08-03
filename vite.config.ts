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
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
    },
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
      onwarn(warning, warn) {
        // Ignore "eval" warnings from third-party packages (like eruda)
        if (warning.code === 'EVAL' && (warning.id?.includes('node_modules') || warning.id?.includes('eruda'))) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase') || id.includes('@firebase') || id.includes('webchannel-wrapper')) {
              return 'vendor-firebase';
            }
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-core';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            if (id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
          }
        },
      },
    },
  },
});
