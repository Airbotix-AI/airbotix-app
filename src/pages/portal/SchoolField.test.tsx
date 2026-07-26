// @vitest-environment jsdom

// The optional school picker on the create-kid form: ACARA autocomplete +
// free-text + AU state fallback.

import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as apiMod from '@/lib/api';

import { SchoolField } from './SchoolField';
import { EMPTY_SCHOOL, type SchoolValue } from './schoolValue';

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

function Harness({ onValue }: { onValue?: (v: SchoolValue) => void }) {
  const [value, setValue] = useState<SchoolValue>(EMPTY_SCHOOL);
  return (
    <SchoolField
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

describe('SchoolField', () => {
  it('autocompletes against /schools/search and fills all fields when a suggestion is picked', async () => {
    const api = vi.spyOn(apiMod, 'api').mockResolvedValue({
      schools: [{ acara_id: '40001', name: 'Fahan School', suburb: 'Sandy Bay', state: 'TAS' }],
    } as never);
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    fireEvent.change(screen.getByRole('combobox', { name: /School/ }), { target: { value: 'fahan' } });

    // Debounced search hit the right endpoint.
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/schools/search?q=fahan', expect.objectContaining({})),
    );

    const option = await screen.findByRole('button', { name: /Fahan School/ });
    fireEvent.click(option);

    expect(onValue).toHaveBeenLastCalledWith({
      name: 'Fahan School',
      suburb: 'Sandy Bay',
      state: 'TAS',
      acara_id: '40001',
    });
    // Suburb hint + directory-match note render after a pick.
    expect(screen.getByText(/Sandy Bay/)).toBeInTheDocument();
    expect(screen.getByText(/matched to the school directory/)).toBeInTheDocument();
  });

  it('keeps free-typed text with a manually chosen state and no acara_id', async () => {
    vi.spyOn(apiMod, 'api').mockResolvedValue({ schools: [] } as never);
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);

    fireEvent.change(screen.getByRole('combobox', { name: /School/ }), { target: { value: 'Tiny Homeschool Co-op' } });
    fireEvent.change(screen.getByLabelText(/State/), { target: { value: 'NSW' } });

    expect(onValue).toHaveBeenLastCalledWith({
      name: 'Tiny Homeschool Co-op',
      suburb: '',
      state: 'NSW',
      acara_id: '',
    });
  });

  it('does not search for queries shorter than 2 characters', async () => {
    const api = vi.spyOn(apiMod, 'api').mockResolvedValue({ schools: [] } as never);
    render(<Harness />);
    fireEvent.change(screen.getByRole('combobox', { name: /School/ }), { target: { value: 'a' } });
    // Give any debounce a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 320));
    expect(api).not.toHaveBeenCalled();
  });
});
