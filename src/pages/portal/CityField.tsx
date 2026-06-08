import { useState } from 'react';

import { AU_CITIES } from './familyProfile';

const OTHER = '__other__';

/**
 * Controlled city picker: a dropdown of major AU cities, with "Other…" revealing
 * a free-text input for towns not in the list. Stores a plain city string, so it
 * drops straight into the existing `city` form field (react-hook-form Controller).
 */
export function CityField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const known = (AU_CITIES as readonly string[]).includes(value);
  // Sticky "Other" mode so the text input stays open while the parent types
  // (the typed value isn't in AU_CITIES, so we can't derive mode from value alone).
  const [otherMode, setOtherMode] = useState(value !== '' && !known);

  const selectValue = otherMode ? OTHER : known ? value : '';

  return (
    <>
      <select
        className="input-k12"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setOtherMode(true);
            onChange('');
          } else {
            setOtherMode(false);
            onChange(v);
          }
        }}
      >
        <option value="">Choose…</option>
        {AU_CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {otherMode && (
        <input
          className="input-k12 mt-2"
          placeholder="Type your city"
          autoComplete="address-level2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  );
}
