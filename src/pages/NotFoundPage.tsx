import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="font-mono text-sm text-slate-400">404</div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Page not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back home →
        </Link>
      </div>
    </div>
  );
}
