// @vitest-environment jsdom

import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { useProductOpenTracking } from './productOpenAnalytics';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));

function Probe({ principal }: { principal: 'user' | 'kid' }) {
  useProductOpenTracking(principal);
  return null;
}

describe('useProductOpenTracking', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset().mockResolvedValue({ recorded: true });
  });

  it.each(['user', 'kid'] as const)(
    'reports one authenticated shell open for the %s principal without client metadata',
    async (principal) => {
      render(
        <StrictMode>
          <Probe principal={principal} />
        </StrictMode>,
      );

      await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
      expect(api).toHaveBeenCalledWith('/analytics/open', {
        method: 'POST',
        principal,
      });
    },
  );

  it('never breaks the product shell when telemetry fails', async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error('offline'));
    expect(() => render(<Probe principal="user" />)).not.toThrow();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  });
});
