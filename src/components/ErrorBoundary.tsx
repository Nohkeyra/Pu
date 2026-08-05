import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-background pattern-dots p-6 text-center">
          <div className="w-16 h-16 bg-[var(--color-sunshine-cta)]/10 dark:bg-[var(--color-sunshine-cta)]/20 rounded-2xl flex items-center justify-center mb-6 border border-[var(--color-sunshine-cta)]/20 animate-pulse">
            <AlertTriangle className="w-8 h-8 text-[var(--color-sunshine-cta)]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-deep-forest dark:text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-stone dark:text-stone/80 mb-8 max-w-md leading-relaxed">
            The application encountered an unexpected error. 
            {this.state.error?.message && (
              <span className="block mt-3 text-xs text-deep-forest/80 dark:text-white/80 bg-white/80 dark:bg-card/80 border border-border p-3 rounded-2xl font-mono break-all text-left">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3.5 bg-[var(--color-sunshine-cta)] text-white rounded-2xl font-semibold shadow-sunshine-glow hover:brightness-105 active:scale-[0.98] transition-all duration-300"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
