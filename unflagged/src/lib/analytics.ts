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

/** Query parameters analytics may see. Everything else goes: the payment provider adds its own on the way back. */
const KEEP_PARAM = /^(src|loc|utm_[a-z]+)$/;

/**
 * A report link is the only key to a report (and to a paid one's re-scan), so the id never goes to analytics:
 * `/r/<id>` becomes `/r/:id`. Query strings keep only attribution (`src`, `utm_*`) and the QA region override
 * (`loc`): `?rescan=<id>`, and whatever the checkout appends on return (`payment_id`, `status`, the buyer's
 * `email`), are dropped.
 */
export function scrubUrl(value: string): string {
  return value
    .replace(/\/r\/[^/?#\s]+/g, '/r/:id')
    .replace(/\?([^#\s]*)/, (_, query: string) => {
      const kept = query.split('&').filter((pair) => KEEP_PARAM.test(pair.split('=')[0]));
      return kept.length ? `?${kept.join('&')}` : '';
    });
}

/** Only URL-shaped strings are rewritten (a page title may well end in "?"). */
const URL_LIKE = /^(https?:\/\/|\/)/;

function scrubProps(props: Record<string, unknown> | undefined, depth = 0): void {
  if (!props || depth > 4) return;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && URL_LIKE.test(v)) props[k] = scrubUrl(v);
    else if (v && typeof v === 'object') scrubProps(v as Record<string, unknown>, depth + 1); // e.g. $initial_person_info
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
        // Only capture() passes through before_send. These features send data some other way (the /flags call
        // carries the first page's raw URL as a person property), and none of them is used here.
        advanced_disable_flags: true,
        disable_surveys: true,
        disable_web_experiments: true,
        disable_external_dependency_loading: true,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_performance: false,
        capture_exceptions: false,
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
