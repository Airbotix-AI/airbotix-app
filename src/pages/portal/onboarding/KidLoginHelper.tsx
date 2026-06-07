import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface KidLoginHelperProps {
  /** the family `code` from GET /families/:id; empty string while loading */
  familyCode: string;
  kidName: string;
  onClose: () => void;
}

/**
 * Plain-language "how do I get my kid in?" helper (parent-portal-onboarding-prd
 * §5.1). Written for non-technical parents: the real kid-login URL, the big
 * copyable family code, and the three things the child types. Mirrors the
 * hand-rolled modal shell used by AddCardModal.
 */
export function KidLoginHelper({ familyCode, kidName, onClose }: KidLoginHelperProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // A scan/click link that lands on the kid login with the code pre-filled, so
  // the parent never has to dictate a code and the kid never types one.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const loginUrl = familyCode
    ? `${origin}/learn/login?family_code=${encodeURIComponent(familyCode)}`
    : '';

  const copyLink = () => {
    if (!loginUrl) return;
    try {
      navigator.clipboard?.writeText(loginUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  // Escape-to-close (matches expected modal behavior for keyboard users).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = () => {
    if (!familyCode) return;
    try {
      navigator.clipboard?.writeText(familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — parent can still read & type the code
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-hero bg-canvas-pure p-7 shadow-card-soft">
        <div className="eyebrow eyebrow-mint">Get started</div>
        <h2 className="section-heading" style={{ fontSize: '24px' }}>
          Get {kidName} logged in
        </h2>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          On your child&apos;s tablet, phone, or computer:
        </p>

        <ol className="mt-5 space-y-3">
          <li className="flex gap-3 text-[15px] text-ink">
            <span className="font-bold text-brand-mint">1.</span>
            <span>
              Open <span className="font-mono font-semibold">app.airbotix.ai/learn/login</span>
            </span>
          </li>
          <li className="flex gap-3 text-[15px] text-ink">
            <span className="font-bold text-brand-mint">2.</span>
            <span>Type in your family code:</span>
          </li>
        </ol>

        {/* Big, copyable family code */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-grad-mint px-5 py-4 text-white shadow-brand-mint">
          <span
            className="font-mono font-extrabold"
            style={{ fontSize: '34px', letterSpacing: '0.18em' }}
          >
            {familyCode || '…'}
          </span>
          <button
            onClick={copy}
            disabled={!familyCode}
            aria-label="Copy family code"
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-[13px] font-bold hover:bg-white/30 disabled:opacity-50"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {/* polite announcement so screen-reader users hear the copy succeeded */}
        <span className="sr-only" aria-live="polite">
          {copied ? 'Family code copied' : ''}
        </span>

        <ol className="mt-4 space-y-3" start={3}>
          <li className="flex gap-3 text-[15px] text-ink">
            <span className="font-bold text-brand-mint">3.</span>
            <span>
              {kidName} types their nickname and their 4-digit PIN. That&apos;s it — they&apos;re
              in! 🎉
            </span>
          </li>
        </ol>

        {loginUrl && (
          <div className="mt-5 rounded-2xl border border-hairline bg-surface p-4 text-center">
            <p className="text-[13px] font-semibold text-ink">Even easier: scan on their device</p>
            <p className="mt-0.5 text-[12px] text-slate2">The family code is already filled in.</p>
            <div className="mt-3 flex justify-center">
              <div className="rounded-xl bg-canvas-pure p-3">
                <QRCodeSVG value={loginUrl} size={132} aria-label="QR code to open kid login" />
              </div>
            </div>
            <button onClick={copyLink} className="btn-pill-secondary mt-4">
              {linkCopied ? 'Link copied ✓' : 'Copy login link'}
            </button>
            <span className="sr-only" aria-live="polite">
              {linkCopied ? 'Login link copied' : ''}
            </span>
          </div>
        )}

        <p className="lead-text mt-5" style={{ fontSize: '13px' }}>
          Forgot the PIN? You can reset it any time under <strong>My Family</strong>.
        </p>

        <button onClick={onClose} className="btn-pill-primary mt-6 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
