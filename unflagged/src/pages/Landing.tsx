import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../lib/analytics';
import { BRAND, PRICE } from '../lib/brand';

const PROOF = [
  'July 16, 2026: YouTube spelled out 3 “inauthentic content” categories that can’t be monetized.',
  'Rejected? You wait 30 days before you can reapply.',
  'Free risk read in about a minute. No login, no channel access.',
];

const STEPS = [
  ['Screenshot your Videos tab', '2–4 screenshots while you scroll. No login, no channel access.'],
  ['Paste a script', 'The narration of a recent video. This is where originality shows.'],
  ['Get your risk read', 'Overall level, a level per category, and your top findings with fixes.'],
];

const TABLE: [string, boolean, boolean][] = [
  ['Overall risk level + headline', true, true],
  ['Level for each policy category', true, true],
  [`Top ${BRAND.freeFindings} findings with evidence`, true, true],
  ['Every finding, with evidence and fixes', false, true],
  ['Prioritized 7-day fix plan', false, true],
  ['Videos to fix or unlist first', false, true],
  ['Before-you-apply checklist', false, true],
  [`One re-scan within ${BRAND.rescanDays} days`, false, true],
];

const FAQ: [string, string][] = [
  ['Is this official?', 'No, it’s independent. We’re not affiliated with YouTube or Google.'],
  [
    'Will this get me approved?',
    'No one can honestly promise that. We show you the patterns the published policy describes, and how to fix them.',
  ],
  ['Do you need my login?', 'Never. You upload screenshots of your own channel and paste your own scripts.'],
  [
    'Where do my screenshots go?',
    'Google’s Gemini API analyzes them and we never store them. During our free launch, Google may use them to improve its products, so don’t upload anything private.',
  ],
  ['Refunds?', `${BRAND.refundDays} days, no questions asked.`],
];

function Cta({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/scan"
      className={`inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-accent px-6 text-lg font-semibold text-accent-ink hover:brightness-110 sm:w-auto ${className}`}
    >
      Scan my channel — free
    </Link>
  );
}

export default function Landing() {
  useEffect(() => track('landing_view'), []);

  return (
    <div className="space-y-16 pt-6">
      <section className="space-y-6">
        <p className="text-sm font-medium uppercase tracking-wider text-accent">For faceless creators</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Would your channel survive a monetization review?
        </h1>
        <p className="text-lg text-slate-300">
          {BRAND.name} checks your uploads against the 3 kinds of content YouTube says it won’t pay for, then tells you
          exactly what to fix. Built for faceless creators.
        </p>
        <Cta />
        <ul className="space-y-3 pt-2">
          {PROOF.map((p) => (
            <li key={p} className="flex gap-3 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-line bg-panel p-4">
              <span className="text-sm font-semibold text-accent">Step {i + 1}</span>
              <h3 className="mt-1 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">Free vs Full Report</h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel">
              <tr>
                <th className="p-3 font-medium text-muted">What you get</th>
                <th className="w-16 p-3 text-center font-semibold">Free</th>
                <th className="w-20 p-3 text-center font-semibold text-accent">{PRICE}</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map(([label, free, full]) => (
                <tr key={label} className="border-t border-line">
                  <td className="p-3">{label}</td>
                  <td className="p-3 text-center">{free ? '✓' : <span className="text-muted">—</span>}</td>
                  <td className="p-3 text-center text-accent">{full ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">
          Full Report: {PRICE} one-time. {BRAND.refundDays}-day no-questions refund.
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}
                <span className="text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-2 text-slate-300">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">See your risk read in about a minute</h2>
        <Cta />
      </section>
    </div>
  );
}
