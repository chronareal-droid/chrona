import { lazy, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import { DEMO } from './lib/demo';
import { captureSrc } from './lib/src';
import Landing from './pages/Landing';
import './index.css';

// The landing page ships in the main bundle; everything else loads on demand.
const Scan = lazy(() => import('./pages/Scan'));
const Report = lazy(() => import('./pages/Report'));
const Methodology = lazy(() => import('./pages/Methodology'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Refunds = lazy(() => import('./pages/Refunds'));
const NotFound = lazy(() => import('./pages/NotFound'));

captureSrc();

// After a deploy, an open tab can ask for page chunks that no longer exist. Reload once to pick up the new build.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('unflagged_reloaded')) return;
    sessionStorage.setItem('unflagged_reloaded', '1');
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

// The demo runs inside a page that can't route real paths, so it keeps the route in memory.
const Router = DEMO ? MemoryRouter : BrowserRouter;

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
      <Suspense fallback={<p className="pt-10 text-center text-muted">Loading…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="scan" element={<Scan />} />
            <Route path="r/:id" element={<Report />} />
            <Route path="methodology" element={<Methodology />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="refunds" element={<Refunds />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  </StrictMode>,
);
