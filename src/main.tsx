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
  // Check if window.fetch descriptor allows write/configuration before loading eruda to prevent TypeError in sandboxed iframes
  const fetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
  const isFetchWritable = !fetchDesc || fetchDesc.writable || Boolean(fetchDesc.set);

  if (isFetchWritable) {
    import('eruda').then((eruda) => {
      if (!(window as any).eruda) {
        try {
          eruda.default.init();
        } catch {
          // In sandboxed environments where window properties cannot be modified, silently fall back
        }
      }
    }).catch(() => {
      // Ignore in restricted sandbox environments
    });
  }
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
