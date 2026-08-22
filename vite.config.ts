import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  define: {
    'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || '')
  },
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
  ],
  publicDir: 'public',
  server: {
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-switch",
      "@radix-ui/react-label",
      "@radix-ui/react-toggle",
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: true,
    chunkSizeWarningLimit: 1200,
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: 'esbuild',
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'EVAL' && (warning.id?.includes('node_modules') || warning.id?.includes('eruda'))) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
});
