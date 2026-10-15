import { Prose } from '../components/ui';
import { BRAND } from '../lib/brand';
import { useTitle } from '../lib/useTitle';

export default function Privacy() {
  useTitle(`Privacy · ${BRAND.name}`);
  return (
    <Prose>
      <h1>Privacy</h1>
      <p>Last updated: October 15, 2026. The short version: we don’t keep your screenshots or scripts, and we tell you exactly what we do keep.</p>

      <h2>Screenshots and scripts: never stored</h2>
      <p>
        Your screenshots and scripts are sent to our analysis function, used in memory, and dropped. We never save them to a
        database or file storage. What we keep is the list of videos read from your screenshots (titles, durations, view and
        age labels, short thumbnail descriptions), the computed numbers, and your report.
      </p>

      <h2>Google’s Gemini API (free tier)</h2>
      <p>
        The analysis is done by Google’s Gemini API. During our free launch we use Gemini’s unpaid tier. On that tier,
        <strong> Google may use what we send to improve its products, and human reviewers may read it.</strong> We send only
        what the analysis needs: your screenshots, scripts, answers and niche. We never send your email or IP address. Don’t
        upload anything private.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your quick-question answers and niche.</li>
        <li>Your email, only if you give it (for Pro launch news or the waitlist).</li>
        <li>The extracted video list, the computed signals, and your report.</li>
        <li>A salted hash of your IP address, used only to limit scans and waitlist sign-ups per day. We never store the raw IP.</li>
        <li>Which platform sent you (e.g. ?src=tt), if the link carried one.</li>
        <li>Whether the report was paid for, when, and the payment ID.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Checkout is handled by Dodo Payments, the merchant of record. Your card details go to Dodo, never to us. We receive a
        payment ID and a confirmation that the payment succeeded.
      </p>

      <h2>Analytics</h2>
      <p>
        We use PostHog to count anonymous product events (for example, “scan submitted” or “unlock clicked”) and page views.
        We don’t send your email, scripts or screenshots to analytics, and we don’t record sessions. Report links are removed
        from page addresses before anything is sent, and PostHog is set to discard IP addresses.
      </p>

      <h2>Your report link</h2>
      <p>
        Your report link works like a key: anyone who has it can open the report and, for a paid report, use its included
        re-scan. Share it only with people you trust.
      </p>

      <h2>Deletion</h2>
      <p>
        Email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> with your report link (and, for the waitlist,
        your email address) and we’ll delete the matching records within 30 days.
      </p>

      <h2>Where it’s available</h2>
      <p>
        {BRAND.name} isn’t available in the EU/EEA (including its overseas regions), the UK, the Crown Dependencies,
        Gibraltar or Switzerland yet, because the AI tier we use during launch isn’t offered there.
      </p>

      <h2>18+ only</h2>
      <p>{BRAND.name} is for people aged 18 and over. It isn’t directed at children, and we don’t knowingly collect data from minors.</p>

      <p className="text-sm">{BRAND.disclaimer}</p>
    </Prose>
  );
}
