import { useEffect, type ReactNode } from 'react';

interface StudioDrawerProps {
  title: string;
  emoji: string;
  color: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Right-side slide-in panel for inline studio use from ProjectDetailPage.
 * Traps focus via Escape key; scrollable internally.
 */
export function StudioDrawer({ title, emoji, color, onClose, children }: StudioDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg h-full bg-canvas overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`bg-wash-${color} border-b border-hairline px-6 py-4 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <span className="text-[24px]">{emoji}</span>
            <span className="text-[16px] font-bold text-ink">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full w-8 h-8 flex items-center justify-center text-slate2 hover:bg-surface hover:text-ink transition-colors text-[18px]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 px-6 py-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
