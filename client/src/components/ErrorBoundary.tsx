import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
          <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 border border-surface-200">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-surface-900 text-center">
              Oops! Terjadi Kesalahan
            </h3>
            <p className="mt-2 text-sm text-surface-500 text-center">
              {this.state.error?.message || 'Terjadi kesalahan sistem yang tidak terduga.'}
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 bg-surface-100 rounded-xl text-xs overflow-auto max-h-48 text-surface-700 font-mono">
                {this.state.error.stack}
              </pre>
            )}
            <div className="mt-8 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 btn-primary"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 btn-secondary bg-white"
              >
                Ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
