'use client';

import React from 'react';

/** Minimal error boundary so one broken tab never kills the whole console. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[AdminErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 20,
            color: '#b91c1c',
            fontSize: 13,
          }}
        >
          <strong>{this.props.label || '页面'}渲染出错</strong>
          <div style={{ marginTop: 8, color: '#7f1d1d', wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: 12,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
