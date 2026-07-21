import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// Early load mobile developer tools if activated in local storage or in the workspace preview
const isWorkspace = typeof window !== 'undefined' && (
  window.location.hostname.endsWith(".run.app") ||
  window.location.hostname.includes("aistudio") ||
  (window.location.hostname === "localhost" && window.location.port === "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port === "3000")
);

if (typeof window !== 'undefined' && (localStorage.getItem('wawasan_eruda_enabled') === 'true' || isWorkspace)) {
  const erudaWin = window as unknown as { eruda?: unknown };
  import('eruda')
    .then((module) => {
      if (!document.getElementById('eruda') && !erudaWin.eruda) {
        module.default.init();
      }
    })
    .catch((err) => {
      console.warn('Failed to load mobile devtools console:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
