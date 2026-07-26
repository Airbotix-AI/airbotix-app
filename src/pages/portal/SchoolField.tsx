import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { AU_STATES } from './familyProfile';
import type { SchoolValue } from './schoolValue';

interface SchoolSuggestion {
  acara_id: string;
  name: string;
  suburb: string;
  state: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

/**
 * Optional school picker for the create-kid form: a debounced autocomplete over
 * GET /schools/search (ACARA directory) plus a free-text fallback and an AU
 * state select. Picking a suggestion fills suburb + state + acara_id; typing
 * afterwards clears the acara_id (it is no longer a canonical pick).
 */
export function SchoolField({
  value,
  onChange,
}: {
  value: SchoolValue;
  onChange: (v: SchoolValue) => void;
}) {
  const [suggestions, setSuggestions] = useState<SchoolSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = value.name.trim();
    // A concrete pick (acara_id set) or too-short query → no lookup.
    if (value.acara_id || q.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q });
      if (value.state) params.set('state', value.state);
      api<{ schools: SchoolSuggestion[] }>(`/schools/search?${params.toString()}`, {
        signal: ctrl.signal,
      })
        .then((res) => setSuggestions(res.schools))
        .catch(() => {
          /* best-effort autocomplete: abort / offline just yields no suggestions */
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value.name, value.state, value.acara_id]);

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }, []);

  const pick = (s: SchoolSuggestion) => {
    onChange({ name: s.name, suburb: s.suburb, state: s.state, acara_id: s.acara_id });
    setSuggestions([]);
    setOpen(false);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="block">
          <span className="label-k12">School (optional)</span>
          <input
            className="input-k12"
            placeholder="Start typing a school name…"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-autocomplete="list"
            value={value.name}
            onChange={(e) => {
              // Typing invalidates any prior directory pick.
              onChange({ ...value, name: e.target.value, acara_id: '' });
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay so a click on an option registers before we close.
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
          />
        </label>
        {showList && (
          <ul
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-hairline bg-canvas-pure py-1 shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s.acara_id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-[14px] text-ink hover:bg-wash-sky"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-[12px] text-slate2">
                    {s.suburb}
                    {s.suburb && s.state ? ', ' : ''}
                    {s.state}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block">
        <span className="label-k12">State (optional)</span>
        <select
          className="input-k12"
          value={value.state}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
        >
          <option value="">—</option>
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {value.suburb && (
        <p className="text-[12px] text-slate2">
          Suburb: {value.suburb}
          {value.acara_id ? ' · matched to the school directory' : ''}
        </p>
      )}
    </div>
  );
}
