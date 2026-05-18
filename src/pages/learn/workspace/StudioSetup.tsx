// Quick-setup form rendered between the StudioPicker and the chat itself.
// Forces the kid to make a few structured choices so the prompt has scaffolding
// — significantly higher success rate than a blank prompt, especially for 8-11.

import clsx from 'clsx';
import { useMemo, useState } from 'react';

import type { StudioMeta, SetupField } from './studios';

export function StudioSetup({
  studio,
  busy,
  onConfirm,
  onBack,
}: {
  studio: StudioMeta;
  busy: boolean;
  onConfirm: (values: Record<string, string | string[]>) => void;
  onBack: () => void;
}) {
  const initial = useMemo<Record<string, string | string[]>>(() => {
    const out: Record<string, string | string[]> = {};
    for (const f of studio.setup) {
      if (f.kind === 'pick') out[f.key] = f.options[f.defaultIndex ?? 0];
      else out[f.key] = [];
    }
    return out;
  }, [studio.setup]);
  const [values, setValues] = useState<Record<string, string | string[]>>(initial);

  return (
    <div className="flex-1 overflow-y-auto p-10">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="text-[12px] text-ink-soft hover:text-ink mb-3">
          ← Pick a different studio
        </button>
        <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold mb-2', `bg-${studio.wash}`)}>
          <span className="text-[16px]">{studio.emoji}</span>
          <span className="text-ink">{studio.label}</span>
          <span className="text-ink-soft">−{studio.cost}★ per turn</span>
        </div>
        <h2 className="text-[28px] font-extrabold text-ink mb-2">Let&apos;s set it up</h2>
        <p className="text-[15px] text-ink-soft mb-8">
          Pick a few options before you start — these go into every message so the AI knows what you like.
        </p>

        <div className="space-y-6">
          {studio.setup.map((f) => (
            <FieldRow
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
              wash={studio.wash}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button
            onClick={() => onConfirm(values)}
            disabled={busy}
            className="btn-pill-primary"
          >
            {busy ? 'Opening…' : 'Start →'}
          </button>
          <span className="text-[12px] text-ink-soft">You can change these later by starting a new chat.</span>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  wash,
}: {
  field: SetupField;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  wash: string;
}) {
  if (field.kind === 'pick') {
    const selected = (value as string) ?? '';
    return (
      <div>
        <div className="text-[13px] font-bold text-ink mb-2">{field.label}</div>
        <div className="flex flex-wrap gap-2">
          {field.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={clsx(
                'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                selected === opt
                  ? `bg-${wash} text-ink ring-2 ring-ink/30`
                  : 'bg-surface text-ink-soft hover:bg-canvas-pure hover:text-ink',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }
  // multi
  const arr = (value as string[]) ?? [];
  const max = field.max ?? 99;
  const toggle = (opt: string) => {
    if (arr.includes(opt)) onChange(arr.filter((x) => x !== opt));
    else if (arr.length < max) onChange([...arr, opt]);
  };
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[13px] font-bold text-ink">{field.label}</div>
        <div className="text-[11px] text-ink-soft">{arr.length}/{max} picked</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {field.options.map((opt) => {
          const on = arr.includes(opt);
          const atCap = !on && arr.length >= max;
          return (
            <button
              key={opt}
              disabled={atCap}
              onClick={() => toggle(opt)}
              className={clsx(
                'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                on
                  ? `bg-${wash} text-ink ring-2 ring-ink/30`
                  : atCap
                  ? 'bg-surface text-steel cursor-not-allowed'
                  : 'bg-surface text-ink-soft hover:bg-canvas-pure hover:text-ink',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
