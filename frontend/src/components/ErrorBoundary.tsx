import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level render-error boundary.
 *
 * Without this, a single thrown render anywhere in the tree blanks the whole
 * application and leaves no way back. React unmounts the entire tree on an
 * uncaught error, so this has to sit above <App /> in main.tsx to be effective.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Replace with a real reporting transport if one is added later.
    console.error('[MIRA] Unhandled render error:', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas p-6">
        <div role="alert" className="panel w-full max-w-md p-7 text-center">
          <div className="w-10 h-10 border border-danger-100 bg-danger-50 text-danger-600 rounded-[var(--radius-control)] flex items-center justify-center mx-auto mb-4">
            <AlertOctagon className="w-4 h-4" aria-hidden="true" />
          </div>
          <h1 className="text-[18px] font-semibold text-ink">This view stopped rendering</h1>
          <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">
            A render error was caught before it could take the page down. Retry, or reload to
            start clean.
          </p>

          <details className="mt-4 text-left">
            <summary className="label cursor-pointer select-none">Technical detail</summary>
            <pre className="mt-2 p-2.5 panel-sunken text-[10.5px] text-ink-2 whitespace-pre-wrap break-words overflow-x-auto">
              {error.message}
            </pre>
          </details>

          <div className="mt-5 flex items-center justify-center gap-2">
            <button type="button" onClick={this.reset} className="btn btn-primary">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-secondary"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
