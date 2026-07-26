// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock('@/lib/api', () => ({
  api,
  ApiError: class ApiError extends Error {},
}));

import { MobileNumberEditor } from './MobileNumberEditor';

function renderEditor(current: string | null = null, onSaved = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MobileNumberEditor current={current} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { onSaved };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MobileNumberEditor', () => {
  it('validates and saves the current adult profile phone', async () => {
    api.mockResolvedValue({});
    const { onSaved } = renderEditor();

    fireEvent.change(screen.getByLabelText('Mobile number'), {
      target: { value: '0400 123 123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/auth/me', {
        method: 'PATCH',
        body: { phone: '0400 123 123' },
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('does not submit a landline as a mobile', async () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText('Mobile number'), {
      target: { value: '07 1234 5678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a valid Australian mobile number.')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('lets the parent clear a saved phone without changing identity', async () => {
    api.mockResolvedValue({});
    renderEditor('+61400123123');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/auth/me', {
        method: 'PATCH',
        body: { phone: null },
      }),
    );
  });
});
