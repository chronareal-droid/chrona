import { Link } from 'react-router-dom';
import { Prose } from '../components/ui';
import { BRAND, PRICE } from '../lib/brand';

export default function Terms() {
  return (
    <Prose>
      <h1>Terms</h1>
      <p>Last updated: October 14, 2026. By using {BRAND.name} you agree to these terms.</p>

      <h2>What {BRAND.name} is</h2>
      <p>
        An independent pre-check that compares what you upload with the risk patterns YouTube’s published monetization
        policies describe. It is not a decision by YouTube, it can’t see YouTube’s internal systems, and it can’t promise
        approval, monetization, or any outcome. {BRAND.disclaimer}
      </p>

      <h2>Who can use it</h2>
      <p>You must be 18 or older. It isn’t available in the EU/EEA, the UK or Switzerland yet.</p>

      <h2>What you upload</h2>
      <ul>
        <li>Upload only screenshots of a channel you own or manage, and scripts you have the right to share.</li>
        <li>Don’t upload anything private or anyone else’s personal information.</li>
        <li>You understand your uploads are processed by Google’s Gemini API as described in our <Link to="/privacy">Privacy</Link> page.</li>
        <li>Don’t abuse the service: no automated scanning, no attempts to get around limits.</li>
      </ul>

      <h2>Full Report</h2>
      <p>
        The Full Report is a one-time {PRICE} purchase for the scan it was bought on, and includes one re-scan within
        {' '}{BRAND.rescanDays} days. Payments are processed by Dodo Payments as merchant of record. See <Link to="/refunds">Refunds</Link>.
      </p>

      <h2>No warranty</h2>
      <p>
        Reports are generated partly by AI from limited inputs and may be incomplete or wrong. Use them as guidance, alongside
        YouTube’s own policies. The service is provided “as is”. To the extent the law allows, our total liability is limited
        to the amount you paid us.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; the date above shows the latest version.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a></p>
    </Prose>
  );
}
