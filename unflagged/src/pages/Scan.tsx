import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Chips } from '../components/ui';
import { ApiError, api, rememberPayload } from '../lib/api';
import { track } from '../lib/analytics';
import { BRAND } from '../lib/brand';
import { DEMO, SAMPLE_SCRIPT, sampleScreenshot } from '../lib/demo';
import { ACCEPT, resizeToJpeg, wordCount } from '../lib/image';
import { checkRegion, type RegionState } from '../lib/region';
import { getSrc } from '../lib/src';
import type { Answers, CreateScanPayload } from '../lib/types';
import { useTitle } from '../lib/useTitle';

const MIN_SHOTS = 2;
const MAX_SHOTS = 4;
const SCRIPT_MIN = 150;
const SCRIPT_MAX = 2500;

const QUESTIONS: { key: keyof Answers; label: string; options: { value: string; label: string }[] }[] = [
  {
    key: 'monetization',
    label: 'Monetization status',
    options: [
      { value: 'not_applied', label: 'Not applied yet' },
      { value: 'applied_waiting', label: 'Applied, waiting' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'monetized', label: 'Monetized' },
      { value: 'demonetized', label: 'Demonetized' },
    ],
  },
  {
    key: 'voice',
    label: 'Voice',
    options: [
      { value: 'own', label: 'My own' },
      { value: 'ai', label: 'AI voice' },
      { value: 'mix', label: 'Mix' },
    ],
  },
  {
    key: 'visuals',
    label: 'Visuals',
    options: [
      { value: 'ai_generated', label: 'Mostly AI-generated' },
      { value: 'stock', label: 'Stock footage' },
      { value: 'others_clips', label: 'Clips from other creators/media' },
      { value: 'original', label: 'Original footage/animation' },
      { value: 'mix', label: 'Mix' },
    ],
  },
  {
    key: 'scripts',
    label: 'Scripts',
    options: [
      { value: 'self_written', label: 'I write them' },
      { value: 'ai_heavy_rewrite', label: 'AI drafts, I rewrite heavily' },
      { value: 'ai_light_edits', label: 'AI drafts, light edits' },
      { value: 'adapted', label: 'Adapted from other sources' },
    ],
  },
  {
    key: 'opinion',
    label: 'Your own opinion/analysis in videos',
    options: [
      { value: 'every_video', label: 'Every video' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'rarely', label: 'Rarely' },
    ],
  },
  {
    key: 'uploads',
    label: 'Uploads per week',
    options: [
      { value: '1-2', label: '1–2' },
      { value: '3-6', label: '3–6' },
      { value: '7-14', label: '7–14' },
      { value: '15+', label: '15+' },
    ],
  },
];

const EMPTY_ANSWERS: Answers = { monetization: '', voice: '', visuals: '', scripts: '', opinion: '', uploads: '' };

/**
 * The regex the server's zod `.email()` uses (zod 3.25), so an address the form accepts is never silently dropped
 * there. Also catches the common typos: "me@gmail", a trailing dot, double dots.
 */
const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;

const ERRORS: Record<string, string> = {
  rate_limited: 'You’ve reached the free scan limit for the last 24 hours. Try again later.',
  too_large: 'Those screenshots are too large. Try fewer or smaller ones.',
  invalid: 'Something in the form isn’t right. Check the fields and try again.',
  rescan_unavailable: 'This re-scan link has expired or isn’t valid.',
  rescan_used: 'The re-scan for this report has already been used.',
};

function ScreenshotHint() {
  // A tiny phone showing a Videos-tab grid: "this is the screen we mean".
  return (
    <svg viewBox="0 0 120 150" className="h-28 w-24 shrink-0" aria-hidden="true">
      <rect x="8" y="2" width="104" height="146" rx="14" fill="#121821" stroke="#334155" strokeWidth="2" />
      <rect x="18" y="14" width="40" height="6" rx="3" fill="#a3e635" />
      <rect x="62" y="14" width="22" height="6" rx="3" fill="#334155" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(18 ${28 + i * 29})`}>
          <rect width="40" height="23" rx="4" fill="#334155" />
          <rect x="31" y="17" width="8" height="4" rx="1" fill="#0b0f14" />
          <rect x="45" y="3" width="39" height="4" rx="2" fill="#93a1b3" />
          <rect x="45" y="11" width="28" height="3" rx="1.5" fill="#475569" />
        </g>
      ))}
    </svg>
  );
}

export default function Scan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rescanOf = params.get('rescan') ?? undefined;
  useTitle(`${rescanOf ? 'Your re-scan' : 'Free scan'} · ${BRAND.name}`);

  const [region, setRegion] = useState<RegionState>('checking');
  const [shots, setShots] = useState<string[]>([]);
  const [shotError, setShotError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scripts, setScripts] = useState(['', '', '']);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [niche, setNiche] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const started = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void checkRegion().then(setRegion);
  }, []);

  const markStarted = () => {
    if (!started.current) {
      started.current = true;
      track('scan_started');
    }
  };

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    markStarted();
    setShotError(null);
    const room = MAX_SHOTS - shots.length;
    const picked = [...files].slice(0, room);
    if (files.length > room) setShotError(`Up to ${MAX_SHOTS} screenshots.`);
    setProcessing(true);
    // Each file on its own: one unsupported file (e.g. a HEIC) mustn't throw away the ones that worked.
    const out: string[] = [];
    const failed: string[] = [];
    for (const f of picked) {
      try {
        out.push(await resizeToJpeg(f));
      } catch {
        failed.push(f.name);
      }
    }
    if (out.length) {
      setShots((s) => [...s, ...out]);
      track('screenshots_added', { count: shots.length + out.length });
    }
    if (failed.length) {
      setShotError(`${failed.join(', ')} ${failed.length === 1 ? 'isn’t' : 'aren’t'} supported. Use PNG, JPG or WEBP screenshots.`);
    }
    setProcessing(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  function fillSample() {
    markStarted();
    setShots([sampleScreenshot(0), sampleScreenshot(1)]);
    setScripts([SAMPLE_SCRIPT, '', '']);
    setAnswers({ monetization: 'rejected', voice: 'ai', visuals: 'stock', scripts: 'ai_light_edits', opinion: 'rarely', uploads: '7-14' });
    setNiche('horror lists');
    setShotError(null);
  }

  const scriptWords = scripts.map(wordCount);
  const scriptProblems = scriptWords.map((w) =>
    w === 0 || (w >= SCRIPT_MIN && w <= SCRIPT_MAX) ? null : w < SCRIPT_MIN ? `At least ${SCRIPT_MIN} words` : `At most ${SCRIPT_MAX} words`,
  );
  const unanswered = QUESTIONS.filter((q) => !answers[q.key]).map((q) => q.label);
  const emailProblem = email.trim() && !EMAIL_RE.test(email.trim()) ? 'Check your email address, or leave it empty' : null;
  const problems = [
    shots.length < MIN_SHOTS && `Add at least ${MIN_SHOTS} screenshots`,
    scriptProblems.some(Boolean) && 'Fix the script word counts',
    unanswered.length > 0 && `Answer: ${unanswered.join(', ')}`,
    emailProblem,
    !age && 'Confirm you’re 18 or older',
  ].filter((p): p is string => !!p);

  async function submit() {
    setShowErrors(true);
    if (problems.length || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload: CreateScanPayload = {
      images: shots,
      scripts: scripts.filter((s) => s.trim()),
      answers,
      niche: niche.trim() || undefined,
      email: email.trim() || undefined,
      ageConfirmed: true,
      src: getSrc(),
      rescanOf,
    };
    try {
      const { id } = await api.createScan(payload);
      rememberPayload(payload);
      track('scan_submitted', { screenshots: shots.length, scripts: payload.scripts.length, rescan: !!rescanOf });
      navigate(`/r/${id}`);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? (ERRORS[e.code] ?? 'Something went wrong. Try again in a minute.') : 'Network error. Check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (region === 'checking') {
    return <p className="pt-10 text-center text-muted">Loading…</p>;
  }
  if (region === 'blocked') {
    return (
      <Card className="mt-6 space-y-3 text-center">
        <h1 className="text-2xl font-bold">{BRAND.name} isn’t available in your region yet</h1>
        <p className="text-slate-300">
          We can’t offer scans in the EU/EEA, the UK or Switzerland yet. We’re working on it.
        </p>
        <Link to="/" className="text-accent underline">Back to home</Link>
      </Card>
    );
  }

  return (
    <form
      noValidate
      className="space-y-8 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onChange={markStarted}
    >
      <div>
        <h1 className="text-3xl font-bold">{rescanOf ? 'Your re-scan' : 'Scan your channel'}</h1>
        <p className="mt-1 text-muted">
          {rescanOf ? 'Included with your Full Report. Upload fresh screenshots after your fixes.' : 'Free risk read in about a minute.'}
        </p>
        {DEMO && (
          <Button type="button" variant="ghost" onClick={fillSample} className="mt-4 w-full">
            Fill with sample channel data
          </Button>
        )}
      </div>

      {/* Screenshots */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Screenshots <span className="text-sm font-normal text-muted">(2–4, required)</span></h2>
        <Card className="flex items-center gap-4">
          <ScreenshotHint />
          <p className="text-sm text-slate-300">
            Open your channel → <strong>Videos</strong> tab → screenshot 2–4 times while scrolling.
          </p>
        </Card>
        {shots.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {shots.map((s, i) => (
              <li key={i} className="relative">
                <img src={s} alt={`Screenshot ${i + 1}`} className="aspect-[9/16] w-full rounded-lg border border-line object-cover" />
                <button
                  type="button"
                  aria-label={`Remove screenshot ${i + 1}`}
                  onClick={() => setShots((xs) => xs.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 h-7 w-7 rounded-full bg-slate-800 text-sm ring-1 ring-line"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={fileInput}
          id="shots"
          type="file"
          accept={ACCEPT}
          multiple
          className="peer sr-only"
          onChange={(e) => void addFiles(e.target.files)}
          disabled={shots.length >= MAX_SHOTS || processing}
        />
        <label
          htmlFor="shots"
          className={`flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-line font-medium hover:border-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${shots.length >= MAX_SHOTS ? 'pointer-events-none opacity-40' : ''}`}
        >
          {processing ? 'Preparing…' : shots.length ? `Add more (${shots.length}/${MAX_SHOTS})` : 'Choose screenshots'}
        </label>
        {shotError && <p className="text-sm text-high">{shotError}</p>}
        <p className="text-xs text-muted">
          We don’t store your screenshots. They’re analyzed by Google’s Gemini API, and during our free launch Google may
          use them to improve its products. Don’t upload anything private.
        </p>
      </section>

      {/* Scripts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Scripts <span className="text-sm font-normal text-muted">(optional, up to 3)</span></h2>
        <p className="text-sm text-slate-300">Paste the narration of recent videos. This is where originality shows.</p>
        {scripts.map((s, i) => (
          <div key={i}>
            <textarea
              value={s}
              onChange={(e) => setScripts((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
              rows={i === 0 ? 6 : 3}
              placeholder={`Script ${i + 1} (${SCRIPT_MIN}–${SCRIPT_MAX.toLocaleString()} words)`}
              className="w-full rounded-xl border border-line bg-panel p-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className={`mt-1 text-right text-xs ${scriptProblems[i] ? 'text-high' : 'text-muted'}`}>
              {scriptWords[i].toLocaleString()} words{scriptProblems[i] ? ` · ${scriptProblems[i]}` : ''}
            </p>
          </div>
        ))}
      </section>

      {/* Questions */}
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">3. Quick questions</h2>
        {QUESTIONS.map((q) => (
          <Chips
            key={q.key}
            label={q.label}
            options={q.options}
            value={answers[q.key]}
            onChange={(v) => {
              markStarted();
              setAnswers((a) => ({ ...a, [q.key]: v }));
            }}
          />
        ))}
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Niche</span>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            maxLength={80}
            placeholder="e.g. history documentaries"
            className="min-h-12 w-full rounded-xl border border-line bg-panel px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium">Email <span className="font-normal text-muted">(optional) · Get Pro launch news</span></span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={showErrors && !!emailProblem}
            className={`min-h-12 w-full rounded-xl border bg-panel px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none ${showErrors && emailProblem ? 'border-high' : 'border-line'}`}
          />
          {showErrors && emailProblem && <span className="mt-1 block text-sm text-high">{emailProblem}</span>}
        </label>
      </section>

      {/* Consent + submit */}
      <section className="space-y-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} required className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
          <span>
            I’m 18 or older and agree to the <Link to="/terms" className="text-accent underline">Terms</Link>.
          </span>
        </label>
        {showErrors && problems.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-high/40 bg-high/10 p-3 text-sm text-high">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        {submitError && <p className="rounded-xl border border-high/40 bg-high/10 p-3 text-sm text-high">{submitError}</p>}
        <Button type="submit" className="w-full text-lg" disabled={submitting || processing}>
          {submitting ? 'Uploading…' : 'Get my free risk read'}
        </Button>
        <p className="text-xs text-muted">
          We don’t store your screenshots. They’re analyzed by Google’s Gemini API, and during our free launch Google may
          use them to improve its products. Don’t upload anything private.
        </p>
      </section>
    </form>
  );
}
