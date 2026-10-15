import { Prose } from '../components/ui';
import { BRAND } from '../lib/brand';
import { useTitle } from '../lib/useTitle';

export default function Refunds() {
  useTitle(`Refunds · ${BRAND.name}`);
  return (
    <Prose>
      <h1>Refunds</h1>
      <p>
        <strong>{BRAND.refundDays} days, no questions asked.</strong> If the Full Report wasn’t useful, email{' '}
        <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> within {BRAND.refundDays} days of purchase with your report
        link, and we’ll refund you in full to your original payment method.
      </p>
      <p>Refunds are processed through Dodo Payments and usually show up within 5–10 business days, depending on your bank.</p>
    </Prose>
  );
}
