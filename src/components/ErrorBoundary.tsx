import { Component, type ErrorInfo, type ReactNode } from 'react';
import { recordException } from '../services/crashlyticsService';
import { ErrorState } from './ui/ErrorState';

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
    recordException(error, {
      type: 'react_component_crash',
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            description={this.state.error?.message || "The application encountered an unexpected error."}
            onRetry={() => window.location.reload()}
            retryLabel="Reload Application"
            className="w-full max-w-lg"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
