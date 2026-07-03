// @vitest-environment jsdom
// One-shot class-code login (/learn/class-code): the display name is REQUIRED —
// submitting without it must block the request and show a validation error.
// FE-only: `@/lib/api` and `@/lib/ws` are mocked; the real useAuth/authStore runs.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, refreshAccessToken } = vi.hoisted(() => ({
  api: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
vi.mock('@/lib/api', () => ({
  api,
  refreshAccessToken,
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message = 'err',
    ) {
      super(message);
    }
  },
}));
vi.mock('@/lib/ws', () => ({ getSocket: vi.fn(), closeSocket: vi.fn() }));

import { useAuthStore } from '@/auth/authStore';
import { ClassCodePage } from './ClassCodePage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/learn/class-code']}>
      <Routes>
        <Route path="/learn/class-code" element={<ClassCodePage />} />
        <Route path="/learn" element={<div>LEARN HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClassCodePage — name is required', () => {
  beforeEach(() => {
    useAuthStore.getState().setToken('kid', null);
    api.mockReset();
    refreshAccessToken.mockReset();
  });
  afterEach(cleanup);

  it('blocks submit and shows an error when the name is empty', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('ABC-D1'), { target: { value: 'ABCDEF' } });
    fireEvent.click(screen.getByRole('button', { name: /Join/ }));

    await waitFor(() =>
      expect(screen.getByText(/Please tell us your name/)).toBeInTheDocument(),
    );
    expect(api).not.toHaveBeenCalled();
  });

  it('does not label the name field as optional', () => {
    renderPage();
    expect(screen.getByText(/What do you want to be called\?$/)).toBeInTheDocument();
    expect(screen.queryByText(/optional/i)).not.toBeInTheDocument();
  });

  it('sends the class code and typed name when both are filled', async () => {
    api.mockResolvedValue({
      access_token: 'kid.jwt',
      expires_in: 900,
      kid: { id: 'kid_1', nickname: 'Mia', age: 10, family_id: null },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('ABC-D1'), { target: { value: 'abc-d1' } });
    fireEvent.change(screen.getByPlaceholderText('Mia'), { target: { value: 'Mia' } });
    fireEvent.click(screen.getByRole('button', { name: /Join/ }));

    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/auth/class-code-login',
        expect.objectContaining({
          method: 'POST',
          body: { class_code: 'ABC-D1', display_nickname: 'Mia' },
        }),
      ),
    );
  });
});
