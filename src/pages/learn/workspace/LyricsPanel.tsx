import { useState } from 'react';

export type LyricsInput = {
  verse?: string;
  preChorus?: string;
  chorus?: string;
  bridge?: string;
  outro?: string;
};

const SECTIONS: Array<{ key: keyof LyricsInput; label: string }> = [
  { key: 'verse',     label: 'Verse'      },
  { key: 'preChorus', label: 'Pre-Chorus' },
  { key: 'chorus',    label: 'Chorus'     },
  { key: 'bridge',    label: 'Bridge'     },
  { key: 'outro',     label: 'Outro'      },
];

export function LyricsPanel({
  value,
  onChange,
  onGenerate,
  generating = false,
}: {
  value: LyricsInput;
  onChange: (v: LyricsInput) => void;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<keyof LyricsInput>('verse');

  const hasAny = Object.values(value).some(Boolean);

  return (
    <div className="rounded-xl border border-hairline bg-canvas-pure overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-[12px] font-semibold text-ink-soft">
            Lyrics (optional){hasAny ? ' ✓' : ''}
          </span>
          <span className="text-[11px] text-steel">{open ? '▲' : '▼'}</span>
        </button>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-wash-mint text-ink hover:brightness-95 disabled:opacity-50 transition-all"
          >
            {generating ? '…' : '✨ Generate'}
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-hairline px-4 pb-4 pt-3">
          <div className="flex gap-1 mb-3 flex-wrap">
            {SECTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={
                  activeSection === key
                    ? 'rounded-full px-3 py-1 text-[11px] font-semibold bg-brand-coral text-white'
                    : 'rounded-full px-3 py-1 text-[11px] font-semibold bg-surface text-ink-soft hover:bg-wash-coral'
                }
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={value[activeSection] ?? ''}
            onChange={(e) => onChange({ ...value, [activeSection]: e.target.value })}
            placeholder={`Write your ${SECTIONS.find(s => s.key === activeSection)?.label.toLowerCase()} lyrics here…`}
            rows={4}
            className="w-full rounded-xl border border-hairline bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-steel focus:border-brand-coral focus:outline-none resize-none"
          />
        </div>
      )}
    </div>
  );
}
