// Inline-feedback copy button (the "Copy name" pattern): writes `text` to the
// clipboard and confirms ON the button itself ("Copied!" + a check) — no
// snackbar, no layout shift. One shared behaviour for every copy affordance in
// the Asset Viewer (reference blocks, ModelPreview's animation copy-name).

import { useEffect, useRef, useState } from 'react';

import { Check, Copy } from 'lucide-react';

/** How long the "Copied!" confirmation shows before reverting to the label. */
const COPIED_FEEDBACK_MS = 1500;

export function CopyButton({
  text,
  label = 'Copy',
  testId,
  disabled,
}: {
  /** What clicking copies to the clipboard. */
  text: string;
  /** Idle button label. */
  label?: string;
  testId?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function copy() {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={copy}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg border border-pg-border px-2 py-1 text-[11.5px] font-bold text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text disabled:opacity-60"
    >
      {copied ? <Check size={13} className="text-brand-mint" /> : <Copy size={13} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}
