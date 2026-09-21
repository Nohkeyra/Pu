import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production' || process.env.NODE_ENV === 'production';

  return {
    base: '/',
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },
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
    hmr: process.env.DISABLE_HMR === 'true' ? false : { overlay: false },
  },
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "@capacitor-community/native-biometric": path.resolve("./node_modules/capacitor-native-biometric"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "react-router"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react-router",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-switch",
      "@radix-ui/react-label",
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
            if (id.includes('exceljs')) {
              return 'vendor-excel';
            }
            if (id.includes('jspdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('leaflet')) {
              return 'vendor-maps';
            }
            // Firebase fine-grained separation
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }
            if (id.includes('firebase') || id.includes('@capacitor-firebase')) {
              return 'vendor-firebase-core';
            }
            // Motion engine separated from auxiliary FX
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('gsap') || id.includes('canvas-confetti')) {
              return 'vendor-fx';
            }
            // Date picker & calendar engines separated from root primitives
            if (id.includes('date-fns') || id.includes('react-day-picker')) {
              return 'vendor-dates';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Native platform & Capacitor bridge plugins
            if (id.includes('@capacitor') || id.includes('capacitor-plugin')) {
              return 'vendor-capacitor';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router/') ||
              id.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
};
});
