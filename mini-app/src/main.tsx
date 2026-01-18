import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#020c1b', color: 'white', padding: 16, fontFamily: 'system-ui' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>SurfSol Mini App Error</h1>
          <div style={{ opacity: 0.8, marginBottom: 12 }}>A runtime error occurred. This screen replaces a blank page so we can debug.</div>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 12 }}>
            {this.state.error}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: '#0077be', color: 'white', fontWeight: 800 }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
