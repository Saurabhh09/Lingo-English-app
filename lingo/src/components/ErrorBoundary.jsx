import React from 'react';
import { Leaf, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected display error occurred.'
    };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[Lingo ErrorBoundary]', error, info?.componentStack || '');
    }
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch {
      this.setState({ hasError: false, errorMessage: '' });
    }
  };

  handleResetView = () => {
    try {
      this.props.onResetView?.();
    } catch { }
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#faf8f5',
            color: '#1f2937',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '28px 24px',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '999px', background: '#ecfccb', color: '#4d7c0f', marginBottom: '12px' }}>
              <Leaf size={28} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: '0 0 20px', lineHeight: 1.5 }}>
              Lingo ran into an unexpected display issue. Your learning progress is saved on the server.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button primary"
                onClick={this.handleReload}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer' }}
              >
                <RotateCcw size={16} />
                Reload Lingo
              </button>
              <button
                type="button"
                className="button ghost"
                onClick={this.handleResetView}
                style={{ padding: '10px 18px', borderRadius: '12px', cursor: 'pointer' }}
              >
                Try recovering
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
