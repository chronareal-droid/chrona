import { Link } from 'react-router-dom';
import { BRAND } from '../lib/brand';
import { useTitle } from '../lib/useTitle';

export default function NotFound() {
  useTitle(`Page not found · ${BRAND.name}`);
  return (
    <div className="space-y-3 pt-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="text-accent underline">Back to home</Link>
    </div>
  );
}
