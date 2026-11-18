import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

/** Shows a readable message instead of a blank screen if something unexpected breaks. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="wrap centered">
        <h1 className="h1">Something went wrong</h1>
        <p className="lede">{this.state.error.message}</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
