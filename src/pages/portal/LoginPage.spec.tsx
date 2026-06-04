import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as auth from '@/auth/useAuth';
import { ApiError } from '@/lib/api';
import { LoginPage } from './LoginPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ requestOtp: vi.fn() }));

const mockedRequestOtp = vi.mocked(auth.requestOtp);

beforeEach(() => {
  navigate.mockReset();
  mockedRequestOtp.mockReset();
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('requests an OTP and forwards to verify on submit', async () => {
    mockedRequestOtp.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'p@e.com');
    await userEvent.click(screen.getByRole('button', { name: /Send code/ }));

    await waitFor(() => expect(mockedRequestOtp).toHaveBeenCalledWith('p@e.com'));
    expect(navigate).toHaveBeenCalledWith(
      '/portal/verify-otp',
      expect.objectContaining({ state: expect.objectContaining({ email: 'p@e.com' }) }),
    );
  });

  it('surfaces an ApiError message when sending the code fails', async () => {
    mockedRequestOtp.mockRejectedValue(new ApiError(429, 'RATE_LIMIT', 'Too many requests'));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email'), 'p@e.com');
    await userEvent.click(screen.getByRole('button', { name: /Send code/ }));

    expect(await screen.findByText('Too many requests')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('blocks submit when the email is invalid (zod)', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /Send code/ }));
    expect(mockedRequestOtp).not.toHaveBeenCalled();
  });
});
