interface PagePlaceholderProps {
  title: string;
  prdRef: string;
  description?: string;
}

// Marker for routes whose UI hasn't been built yet. The PRD section is the
// authoritative source for what should go here when implementation begins.
export function PagePlaceholder({ title, prdRef, description }: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="text-sm font-medium text-slate-700">Not yet implemented</div>
        <div className="mt-1 font-mono text-xs text-slate-500">spec → {prdRef}</div>
      </div>
    </div>
  );
}
