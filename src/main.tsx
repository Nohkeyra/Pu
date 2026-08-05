import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { SettingsProvider } from './context/SettingsContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Auto-initialize Eruda in workspace preview environment for immediate console diagnostics
// Eruda debug console: only in AI Studio preview or when manually enabled via localStorage.
// Deliberately excludes 'localhost' to avoid loading in Capacitor native WebView
// (which also resolves to localhost) and in Render production.
if (typeof window !== 'undefined' && (
  window.location.hostname.endsWith('.run.app') ||
  window.location.hostname.includes('aistudio') ||
  localStorage.getItem('wawasan_eruda_enabled') === 'true'
)) {
  import('eruda').then((eruda) => {
    if (!(window as any).eruda) {
      try {
        eruda.default.init();
      } catch (err) {
        // Some sandboxed preview environments (e.g. AI Studio iframe) expose
        // window.fetch as a read-only getter. Eruda's network monitor tries
        // to overwrite it, which throws synchronously here rather than
        // rejecting the import() promise above. Non-fatal either way.
        console.warn('Eruda init failed (sandbox likely locks window.fetch):', err);
      }
    }
  }).catch((err) => console.warn('Failed to load Eruda module:', err));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </ThemeProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
