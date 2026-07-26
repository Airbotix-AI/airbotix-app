// @vitest-environment jsdom

// The kid settings page (`/portal/family/:kidId/settings`) — focus on the
// optional school editor added on top of the profile edit form.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as apiMod from '@/lib/api';

import { FamilyDetailPage } from './FamilyDetailPage';

const KID = {
  id: 'kid_1',
  nickname: 'Mia',
  age: 10,
  real_name: null,
  daily_star_cap: null,
  is_active: true,
  family_id: 'fam_1',
  school_name: 'Fahan School',
  school_suburb: 'Sandy Bay',
  school_state: 'TAS',
  school_acara_id: '40001',
};

function mockApi() {
  const patches: unknown[] = [];
  vi.spyOn(apiMod, 'api').mockImplementation((path: string, opts?: { method?: string; body?: unknown }) => {
    if (path === '/kids/kid_1' && opts?.method === 'PATCH') {
      patches.push(opts.body);
      return Promise.resolve({}) as Promise<never>;
    }
    if (path === '/kids/kid_1') return Promise.resolve({ ...KID }) as Promise<never>;
    if (path.startsWith('/schools/search')) return Promise.resolve({ schools: [] }) as Promise<never>;
    return Promise.resolve({}) as Promise<never>;
  });
  return patches;
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/portal/family/kid_1/settings']}>
        <Routes>
          <Route path="/portal/family/:kidId/settings" element={<FamilyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('FamilyDetailPage — kid school editor', () => {
  it('prefills the school from the kid and sends it on save', async () => {
    const patches = mockApi();
    mount();

    const schoolInput = await screen.findByRole('combobox', { name: /School/ });
    expect(schoolInput).toHaveValue('Fahan School');

    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(patches.length).toBe(1));
    expect(patches[0]).toMatchObject({
      nickname: 'Mia',
      school_name: 'Fahan School',
      school_suburb: 'Sandy Bay',
      school_state: 'TAS',
      school_acara_id: '40001',
    });
  });

  it('clears the school (sends null) when the name is emptied', async () => {
    const patches = mockApi();
    mount();

    const schoolInput = await screen.findByRole('combobox', { name: /School/ });
    fireEvent.change(schoolInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/ }));

    await waitFor(() => expect(patches.length).toBe(1));
    expect(patches[0]).toMatchObject({
      school_name: null,
      school_acara_id: null,
    });
  });
});
