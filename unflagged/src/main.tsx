import { lazy, StrictMode, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
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
    </BrowserRouter>
  </StrictMode>,
);
