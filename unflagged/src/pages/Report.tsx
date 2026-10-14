import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Disclaimer } from '../components/Layout';
import { Button, Card, LevelBadge } from '../components/ui';
import { ApiError, api, rememberPayload, takeLastPayload } from '../lib/api';
import { track } from '../lib/analytics';
import { BRAND, PRICE } from '../lib/brand';
import { DEMO } from '../lib/demo';
import { CATEGORY_LABELS, type Finding, type FreeReport, type LockedCounts, type PublicScan, type Report } from '../lib/types';

const POLL_MS = 2_500;
const PROCESSING_TIMEOUT_MS = 3 * 60_000;
const PAYMENT_CONFIRM_TIMEOUT_MS = 90_000;

const STEPS = ['Reading your uploads…', 'Comparing titles…', 'Comparing thumbnails…', 'Reading your scripts…', 'Writing your report…'];
/** Which steps are in progress at each server stage (the judge call reads scripts and writes in one go). */
const ACTIVE_STEPS: Record<string, number[]> = { extract: [0], signals: [1, 2], judge: [3, 4] };

type Phase = 'loading' | 'processing' | 'slow' | 'done' | 'error' | 'not_found' | 'network';

function useScan(id: string, waitForPayment: boolean) {
  const [scan, setScan] = useState<PublicScan | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const start = Date.now();
    let failures = 0;

    const tick = async () => {
      try {
        const s = await api.getScan(id);
        if (cancelled) return;
        failures = 0;
        setScan(s);
        const elapsed = Date.now() - start;
        if (s.status === 'processing') {
          if (elapsed > PROCESSING_TIMEOUT_MS) return setPhase('slow');
          setPhase('processing');
        } else if (s.status === 'error') {
          return setPhase('error');
        } else {
          setPhase('done');
          // Back from checkout: the webhook can land a few seconds after the redirect.
          const awaitingWebhook = waitForPayment && !s.paid && elapsed < PAYMENT_CONFIRM_TIMEOUT_MS;
          setConfirming(awaitingWebhook);
          if (!awaitingWebhook) return;
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) return setPhase('not_found');
        if (++failures >= 4) return setPhase('network');
      }
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, waitForPayment]);

  return { scan, phase, confirming };
}

export default function ReportPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const paidParam = params.get('paid') === '1';
  const { scan, phase, confirming } = useScan(id, paidParam);
  const tracked = useRef(false);

  useEffect(() => {
    if (phase !== 'done' || !scan || tracked.current) return;
    tracked.current = true;
    if (!scan.paid) track('report_free_viewed', { overall: scan.free?.overall ?? 'unknown' });
  }, [phase, scan]);

  useEffect(() => {
    if (!scan?.paid || !paidParam) return;
    const key = `unflagged_purchase_${scan.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      /* storage blocked: may double count, acceptable (the paid rows are the source of truth) */
    }
    track('purchase_completed');
  }, [scan?.paid, scan?.id, paidParam]);

  if (phase === 'loading') return <p className="pt-10 text-center text-muted">Loading…</p>;
  if (phase === 'not_found') return <Problem title="Report not found" body="Check the link, or start a new scan." />;
  if (phase === 'network') return <Problem title="Can’t reach the server" body="Check your connection and reload this page." />;
  if (phase === 'processing' || phase === 'slow') return <Progress stage={scan?.stage ?? null} slow={phase === 'slow'} />;
  if (phase === 'error') return <ScanError code={scan?.error_code ?? 'internal'} />;
  if (!scan) return null;

  return (
    <div className="space-y-6 pt-2">
      {confirming && (
        <Card className="no-print border-accent/40 text-center text-sm">Confirming your payment… this page will update by itself.</Card>
      )}
      {scan.paid && scan.report ? <FullReport scan={scan} report={scan.report} /> : scan.free && scan.locked && (
        <FreeView scan={scan} free={scan.free} locked={scan.locked} />
      )}
    </div>
  );
}

// ---------- states ----------

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <Card className="mt-6 space-y-3 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-slate-300">{body}</p>
      <Link to="/scan" className="text-accent underline">Start a new scan</Link>
    </Card>
  );
}

function Progress({ stage, slow }: { stage: string | null; slow: boolean }) {
  const active = ACTIVE_STEPS[stage ?? 'extract'] ?? [0];
  const first = Math.min(...active);
  return (
    <div className="space-y-6 pt-6">
      <h1 className="text-2xl font-bold">Checking your channel</h1>
      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const done = i < first;
          const now = active.includes(i);
          return (
            <li key={s} className={`flex items-center gap-3 ${done ? 'text-slate-300' : now ? 'text-white' : 'text-muted'}`}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${done ? 'bg-accent text-accent-ink' : now ? 'animate-pulse ring-2 ring-accent' : 'ring-1 ring-line'}`}
                aria-hidden="true"
              >
                {done ? '✓' : ''}
              </span>
              {s}
            </li>
          );
        })}
      </ol>
      {slow ? (
        <Card className="space-y-2">
          <p>This is taking longer than usual.</p>
          <Button variant="ghost" onClick={() => location.reload()}>Check again</Button>
        </Card>
      ) : (
        <p className="text-sm text-muted">Usually about a minute. Keep this page open.</p>
      )}
    </div>
  );
}

function ScanError({ code }: { code: string }) {
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const last = takeLastPayload();

  if (code === 'no_videos') {
    return (
      <Problem
        title="We couldn’t read any videos"
        body="Make sure your screenshots show your channel’s Videos tab with titles visible, then try again."
      />
    );
  }

  async function retry() {
    if (!last) return navigate('/scan');
    setRetrying(true);
    setMsg(null);
    try {
      const { id } = await api.createScan(last);
      rememberPayload(last);
      navigate(`/r/${id}`);
    } catch (e) {
      setMsg(e instanceof ApiError && e.code === 'rate_limited' ? 'You’ve hit today’s scan limit. Try again tomorrow.' : 'Still busy. Give it another minute.');
      setRetrying(false);
    }
  }

  return (
    <Card className="mt-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">We’re at capacity right now</h1>
      <p className="text-slate-300">Try again in a minute.</p>
      <Button onClick={() => void retry()} disabled={retrying} className="w-full">
        {retrying ? 'Retrying…' : last ? 'Try again' : 'Start again'}
      </Button>
      {msg && <p className="text-sm text-high">{msg}</p>}
    </Card>
  );
}

// ---------- report pieces ----------

function Header({ overall, headline, videosRead }: { overall: FreeReport['overall']; headline: string; videosRead: number | null }) {
  return (
    <section className="print-plain space-y-3 rounded-2xl border border-line bg-panel p-5">
      <p className="text-sm text-muted">Your risk read{videosRead ? ` · ${videosRead} videos read` : ''}</p>
      <LevelBadge level={overall} big />
      <h1 className="text-2xl font-bold leading-snug">{headline}</h1>
    </section>
  );
}

function FindingCard({ f, n }: { f: Finding; n: number }) {
  return (
    <Card className="space-y-2">
      <h3 className="font-semibold"><span className="text-accent">{n}.</span> {f.title}</h3>
      <p className="text-sm text-slate-300"><strong className="text-white">Evidence:</strong> {f.evidence}</p>
      <p className="text-sm text-slate-300"><strong className="text-white">Why it matters:</strong> {f.why_it_matters}</p>
      <p className="text-sm text-slate-300"><strong className="text-white">Fix:</strong> {f.fix}</p>
    </Card>
  );
}

function ConfidenceNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Card className="text-sm text-slate-300">
      <strong className="text-white">What we couldn’t see:</strong> {text}
    </Card>
  );
}

function DisclaimerBlock() {
  return (
    <section className="print-plain space-y-1 rounded-2xl border border-line p-4 text-xs text-muted">
      <p>
        This is an independent pre-check of risk patterns, based only on what you uploaded. It matches your uploads against
        what YouTube’s published policy describes; it is not a decision by YouTube and can’t promise approval or monetization.
      </p>
      <Disclaimer />
    </section>
  );
}

function FreeView({ scan, free, locked }: { scan: PublicScan; free: FreeReport; locked: LockedCounts }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function unlock() {
    track('unlock_clicked');
    setBusy(true);
    setErr(null);
    try {
      const { url } = await api.createCheckout(scan.id);
      track('checkout_started');
      if (url.startsWith('/')) navigate(url);
      else location.href = url;
    } catch {
      setErr('Checkout couldn’t start. Try again in a moment.');
      setBusy(false);
    }
  }

  return (
    <>
      <Header overall={free.overall} headline={free.headline} videosRead={scan.videos_read} />
      <section className="grid gap-3 sm:grid-cols-2">
        {free.categories.map((c) => (
          <Card key={c.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{CATEGORY_LABELS[c.key]}</h2>
              <LevelBadge level={c.level} />
            </div>
            <p className="text-sm text-slate-300">{c.summary}</p>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Top findings</h2>
        {free.top_findings.map((f, i) => <FindingCard key={i} f={f} n={i + 1} />)}
      </section>

      <section className="space-y-4 rounded-2xl border border-accent/50 bg-gradient-to-b from-accent/10 to-transparent p-5">
        <div className="flex items-center gap-2 text-sm text-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" /></svg>
          Full Report
        </div>
        <p className="text-lg font-semibold">
          {locked.more_findings > 0 ? `${locked.more_findings} more finding${locked.more_findings === 1 ? '' : 's'}` : 'Every fix in detail'},
          your {locked.plan_days}-day fix plan
          {locked.videos_to_review > 0 ? `, ${locked.videos_to_review} video${locked.videos_to_review === 1 ? '' : 's'} to fix first` : ''}, and the
          before-you-apply checklist.
        </p>
        <ul className="space-y-1 text-sm text-slate-300">
          <li>✓ Evidence and fixes for every category</li>
          <li>✓ One re-scan within {BRAND.rescanDays} days</li>
          <li>✓ {BRAND.refundDays}-day no-questions refund</li>
        </ul>
        <Button onClick={() => void unlock()} disabled={busy} className="w-full text-lg">
          {busy ? 'Opening checkout…' : `Unlock full report — ${PRICE}`}
        </Button>
        {err && <p className="text-sm text-high">{err}</p>}
        {DEMO && <p className="text-center text-xs text-muted">Demo: no charge. It unlocks the sample report straight away.</p>}
      </section>

      <ConfidenceNote text={free.confidence_note} />
      <DisclaimerBlock />
    </>
  );
}

function FullReport({ scan, report }: { scan: PublicScan; report: Report }) {
  const [copied, setCopied] = useState(false);
  const [demoNote, setDemoNote] = useState(false);
  const link = `${location.origin}/r/${scan.id}`;

  async function copy() {
    track('share_clicked');
    if (DEMO) return setDemoNote(true);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy this link', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="no-print space-y-3">
        <Card className="text-sm">Bookmark this page. It’s your report.</Card>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => void copy()}>{copied ? 'Copied ✓' : 'Copy link'}</Button>
          <Button variant="ghost" onClick={() => (DEMO ? setDemoNote(true) : window.print())}>Save as PDF</Button>
        </div>
        {demoNote && <p className="text-center text-xs text-muted">Copy link and Save as PDF work on the live site, not in this demo.</p>}
      </div>

      <Header overall={report.overall} headline={report.headline} videosRead={scan.videos_read} />

      <section className="space-y-3">
        <h2 className="text-xl font-bold">By category</h2>
        {report.categories.map((c) => (
          <Card key={c.key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{CATEGORY_LABELS[c.key]}</h3>
              <LevelBadge level={c.level} />
            </div>
            <p className="text-sm text-slate-300">{c.summary}</p>
            {c.evidence.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-white">Evidence</p>
                <ul className="mt-1 space-y-1 text-slate-300">{c.evidence.map((e, i) => <li key={i} className="ml-5 list-disc">{e}</li>)}</ul>
              </div>
            )}
            {c.fixes.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-white">Fixes</p>
                <ul className="mt-1 space-y-1 text-slate-300">{c.fixes.map((e, i) => <li key={i} className="ml-5 list-disc">{e}</li>)}</ul>
              </div>
            )}
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">All findings</h2>
        {report.top_findings.map((f, i) => <FindingCard key={i} f={f} n={i + 1} />)}
      </section>

      {report.videos_to_review.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Videos to fix or unlist first</h2>
          <Card>
            <ol className="space-y-3">
              {report.videos_to_review.map((v, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium text-white">{i + 1}. {v.title}</p>
                  <p className="text-slate-300">{v.reason}</p>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Your 7-day fix plan</h2>
        <Card>
          <ol className="space-y-2 text-sm text-slate-300">{report.action_plan_7_days.map((d, i) => <li key={i}>{d}</li>)}</ol>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Before you apply</h2>
        <Card>
          <ul className="space-y-2 text-sm text-slate-300">
            {report.before_you_apply_checklist.map((c, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden="true">☐</span>{c}</li>
            ))}
          </ul>
        </Card>
      </section>

      <ConfidenceNote text={report.confidence_note} />

      {scan.rescan?.available && (
        <Card className="no-print space-y-2">
          <p className="font-semibold">Your re-scan is included</p>
          <p className="text-sm text-slate-300">
            After your fixes, re-scan once before {new Date(scan.rescan.until!).toLocaleDateString()}.
          </p>
          <Link to={`/scan?rescan=${scan.id}`} className="inline-block text-accent underline">Start my re-scan</Link>
        </Card>
      )}

      <ProUpsell scanId={scan.id} />
      <DisclaimerBlock />
    </>
  );
}

function ProUpsell({ scanId }: { scanId: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function join(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('busy');
    try {
      await api.joinWaitlist(email.trim(), scanId, 'report');
      track('pro_waitlist_joined');
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <Card className="no-print space-y-3">
      <p className="text-sm font-medium text-accent">Coming soon</p>
      <p className="font-semibold">
        {BRAND.name} Pro: check every new title, thumbnail and script <em>before</em> you publish — ${BRAND.proPriceUsd}/mo
      </p>
      {state === 'done' ? (
        <p className="text-sm text-low">You’re on the list. We’ll email you at launch.</p>
      ) : (
        <form onSubmit={join} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-12 flex-1 rounded-xl border border-line bg-ink px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <Button type="submit" variant="ghost" disabled={state === 'busy'}>Join the waitlist</Button>
        </form>
      )}
      {state === 'error' && <p className="text-sm text-high">Couldn’t join right now. Try again.</p>}
    </Card>
  );
}
