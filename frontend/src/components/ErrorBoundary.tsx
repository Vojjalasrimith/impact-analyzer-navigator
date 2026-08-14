import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="canvas-placeholder card" style={{ minHeight: '100vh', borderRadius: 0 }}>
          <span className="placeholder-icon">⚠️</span>
          <h3>Something went wrong</h3>
          <p>{this.state.error.message || 'An unexpected error occurred while rendering the app.'}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
