import React from 'react'

interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16, padding: 32, fontFamily: 'sans-serif',
        background: '#1b2838', color: '#c6d4df', textAlign: 'center'
      }}>
        <div style={{ fontSize: 48 }}>💥</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: '#8f98a0', maxWidth: 480 }}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '10px 24px', background: '#66c0f4', color: '#1b2838',
            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          Reload App
        </button>
      </div>
    )
  }
}
