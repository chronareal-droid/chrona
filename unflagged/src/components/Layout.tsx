import { Link, Outlet } from 'react-router-dom';
import { BRAND } from '../lib/brand';
import { DEMO } from '../lib/demo';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#a3e635" />
        <path d="M9 17l5 5 9-12" fill="none" stroke="#0b0f14" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {BRAND.name}
    </Link>
  );
}

export function Disclaimer({ className = '' }: { className?: string }) {
  return <p className={`text-xs text-muted ${className}`}>{BRAND.disclaimer}</p>;
}

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {DEMO && (
        <div className="no-print border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-accent">
          Demo with sample data. Nothing you enter leaves this page, and no payment is taken.
        </div>
      )}
      <header className="no-print mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
        <Logo />
        <Link to="/scan" className="rounded-full border border-line px-3 py-1.5 text-sm text-slate-200 hover:border-accent">
          Free scan
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">
        <Outlet />
      </main>
      <footer className="no-print border-t border-line">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-8 text-sm text-muted">
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/methodology">Methodology</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/refunds">Refunds</Link>
          </nav>
          <Disclaimer />
          <p className="text-xs">© {new Date().getFullYear()} {BRAND.name}. An independent pre-check, not an official review.</p>
        </div>
      </footer>
    </div>
  );
}
