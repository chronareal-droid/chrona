import { Component, type ReactNode } from 'react';

/**
 * Last line of defence: if a page fails to render (most often a page chunk that no longer exists after a deploy,
 * or a dropped connection while loading it), show a way out instead of a blank screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 pt-16 text-center">
        <h1 className="text-2xl font-bold">Something went wrong loading this page</h1>
        <p className="text-slate-300">Check your connection and reload. Your report link still works.</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-ink"
        >
          Reload
        </button>
      </div>
    );
  }
}
