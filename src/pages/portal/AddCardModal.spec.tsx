import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from '@/lib/api';
import { AddCardModal } from './AddCardModal';

vi.mock('@/lib/api', async (orig) => ({
  ...(await orig<typeof import('@/lib/api')>()),
  api: vi.fn(),
}));
// The Airwallex SDK loader is never reached on the failure path; stub it so the
// module import is inert under jsdom.
vi.mock('./airwallex', () => ({ loadAirwallex: vi.fn() }));

const mockedApi = vi.mocked(api);

beforeEach(() => mockedApi.mockReset());

describe('AddCardModal', () => {
  it('renders the secure-card header and a graceful guard when setup is off', async () => {
    mockedApi.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    render(<AddCardModal familyId="f1" onClose={() => {}} onAdded={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Add a card' })).toBeInTheDocument();
    // awaiting the guard lets the async setup-intent effect settle inside act()
    expect(await screen.findByText(/switched on yet/)).toBeInTheDocument();
  });
});
