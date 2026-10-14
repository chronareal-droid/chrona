// PostHog, loaded lazily so it never weighs on the landing page. No-op when VITE_POSTHOG_KEY is unset.
// Never pass emails, scripts or other free text as event properties.
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

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
type PH = typeof import('posthog-js').default;
let ready: Promise<PH | null> | null = null;

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
