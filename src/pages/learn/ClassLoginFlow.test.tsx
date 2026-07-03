// @vitest-environment jsdom
// "At class" login (auth-system-prd §5.3): LoginPage mode toggle → request form
// → waiting screen polling until the teacher decides. FE-only: `@/lib/api` and
// `@/lib/ws` are mocked; the real useAuth/authStore wiring runs.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
import { LoginPage } from './LoginPage';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/learn/login']}>
      <Routes>
        <Route path="/learn/login" element={<LoginPage />} />
        <Route path="/learn" element={<div>LEARN HOME</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

const createResponse = {
  request_id: 'req_1',
  secret: 's3cr3t-s3cr3t-s3cr3t-s3cr3t',
  status: 'pending',
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  class_name: 'Robotics 101',
};

async function submitClassRequest() {
  fireEvent.click(screen.getByRole('tab', { name: /At class/ }));
  fireEvent.change(screen.getByPlaceholderText('ABC-D1'), { target: { value: 'ABCDEF' } });
  fireEvent.change(screen.getByPlaceholderText('Mia'), { target: { value: 'M1a!' } });
  fireEvent.click(screen.getByRole('button', { name: /Ask my teacher/ }));
  await waitFor(() => expect(screen.getByTestId('class-login-waiting')).toBeInTheDocument());
}

describe('class login with teacher approval', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.getState().setToken('kid', null);
    api.mockReset();
    refreshAccessToken.mockReset();
  });
  afterEach(cleanup);

  it('defaults to family mode and switches to the class form on the toggle', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('WANG')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /At class/ }));
    expect(screen.getByPlaceholderText('ABC-D1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask my teacher/ })).toBeInTheDocument();
  });

  it('creates a request and shows the waiting screen (request persisted for reloads)', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/class-login/requests') return createResponse;
      return { status: 'pending' }; // the waiting screen's first poll
    });
    renderLogin();
    await submitClassRequest();

    expect(api).toHaveBeenCalledWith(
      '/class-login/requests',
      expect.objectContaining({
        method: 'POST',
        body: { class_code: 'ABCDEF', typed_name: 'M1a!' },
      }),
    );
    expect(screen.getByText(/Ask your teacher to let you in/)).toBeInTheDocument();
    const stored = JSON.parse(sessionStorage.getItem('airbotix.classLoginRequest') ?? '{}');
    expect(stored.request_id).toBe('req_1');
    expect(stored.secret).toBe(createResponse.secret);
  });

  it('stores the kid token and enters /learn when the poll returns approved', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/class-login/requests') return createResponse;
      if (path === '/class-login/requests/req_1/poll') {
        return {
          status: 'approved',
          access_token: 'kid.jwt',
          expires_in: 900,
          kid: { id: 'kid_1', nickname: 'Mia', age: 10, family_id: 'fam_1', class_id: 'class_1' },
        };
      }
      throw new Error(`unexpected ${path}`);
    });
    renderLogin();
    await submitClassRequest();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/learn'));
    expect(useAuthStore.getState().tokens.kid).toBe('kid.jwt');
    expect(api).toHaveBeenCalledWith(
      '/class-login/requests/req_1/poll',
      expect.objectContaining({ method: 'POST', body: { secret: createResponse.secret } }),
    );
  });

  it('shows the denied screen when the teacher says no', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/class-login/requests') return createResponse;
      return { status: 'denied' };
    });
    renderLogin();
    await submitClassRequest();

    await waitFor(() => expect(screen.getByText(/Not right now/)).toBeInTheDocument());
    expect(useAuthStore.getState().tokens.kid).toBeNull();
  });

  it('recovers via silent refresh when the poll says consumed (tokens already released)', async () => {
    api.mockImplementation(async (path: string) => {
      if (path === '/class-login/requests') return createResponse;
      return { status: 'consumed' };
    });
    refreshAccessToken.mockResolvedValue('kid.jwt.from.refresh');
    renderLogin();
    await submitClassRequest();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/learn'));
    expect(refreshAccessToken).toHaveBeenCalledWith('kid');
  });

  it('resumes the waiting screen from sessionStorage after a reload', async () => {
    sessionStorage.setItem(
      'airbotix.classLoginRequest',
      JSON.stringify({
        request_id: 'req_1',
        secret: createResponse.secret,
        expires_at: createResponse.expires_at,
        class_name: 'Robotics 101',
      }),
    );
    api.mockResolvedValue({ status: 'pending' });
    renderLogin();

    expect(screen.getByTestId('class-login-waiting')).toBeInTheDocument();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        '/class-login/requests/req_1/poll',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('shows kid-friendly copy when it is not class time', async () => {
    const { ApiError } = await import('@/lib/api');
    api.mockRejectedValue(new ApiError(403, 'NO_CLASS_SESSION_NOW', 'forbidden'));
    renderLogin();

    fireEvent.click(screen.getByRole('tab', { name: /At class/ }));
    fireEvent.change(screen.getByPlaceholderText('ABC-D1'), { target: { value: 'ABCDEF' } });
    fireEvent.change(screen.getByPlaceholderText('Mia'), { target: { value: 'Mia' } });
    fireEvent.click(screen.getByRole('button', { name: /Ask my teacher/ }));

    await waitFor(() =>
      expect(screen.getByText(/It's not class time right now/)).toBeInTheDocument(),
    );
  });
});
