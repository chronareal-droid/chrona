// PostHog, loaded lazily so it never weighs on the landing page. No-op when VITE_POSTHOG_KEY is unset and in the demo.
// Never pass emails, scripts or other free text as event properties.
import type { CaptureResult } from 'posthog-js';
import { DEMO } from './demo';
import { getSrc } from './src';

export type EventName =
  | 'landing_view'
  | 'scan_started'
  | 'screenshots_added'
  | 'scan_submitted'
  | 'report_free_viewed'
  | 'unlock_clicked'
  | 'checkout_started'
  | 'purchase_completed'
  | 'pro_waitlist_joined'
  | 'share_clicked';

const KEY = DEMO ? undefined : (import.meta.env.VITE_POSTHOG_KEY as string | undefined);
type PH = typeof import('posthog-js').default;
let ready: Promise<PH | null> | null = null;

/**
 * A report link is the only key to a report (and to a paid one's re-scan), so the id never goes to analytics:
 * `/r/<id>` becomes `/r/:id`, and query strings that carry ids (`?rescan=`) or payment hints are dropped.
 */
export function scrubUrl(value: string): string {
  return value
    .replace(/\/r\/[^/?#\s]+/g, '/r/:id')
    .replace(/([?&])(rescan|paid|payment_id|subscription_id|status)=[^&#\s]*/g, '$1')
    .replace(/&{2,}/g, '&')
    .replace(/\?&/g, '?')
    .replace(/[?&]+(?=#|$|\s)/g, '');
}

function scrubProps(props: Record<string, unknown> | undefined): void {
  if (!props) return;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && (v.includes('/r/') || v.includes('rescan=') || v.includes('payment_id='))) props[k] = scrubUrl(v);
  }
}

export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  scrubProps(event.properties);
  scrubProps(event.$set);
  scrubProps(event.$set_once);
  return event;
}

function load(): Promise<PH | null> {
  if (!KEY) return Promise.resolve(null);
  ready ??= import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: true,
        disable_session_recording: true,
        persistence: 'localStorage',
        before_send: scrubEvent,
      });
      const src = getSrc();
      if (src) posthog.register({ src });
      return posthog;
    })
    .catch(() => null);
  return ready;
}

export function track(event: EventName, props?: Record<string, string | number | boolean>): void {
  void load().then((ph) => ph?.capture(event, props));
}
