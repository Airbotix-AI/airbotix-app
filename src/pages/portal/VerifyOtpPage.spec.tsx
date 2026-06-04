import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as auth from '@/auth/useAuth';
import { VerifyOtpPage } from './VerifyOtpPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ verifyOtp: vi.fn() }));

const mockedVerifyOtp = vi.mocked(auth.verifyOtp);

function verifyOtpResponse(isNew: boolean) {
  return {
    access_token: 'jwt',
    expires_in: 900,
    user: { id: 'u', email: 'p@e.com', display_name: null, role: 'parent' as const, family_id: 'f1', is_new_user: isNew },
  };
}

beforeEach(() => {
  navigate.mockReset();
  mockedVerifyOtp.mockReset();
});

function renderVerify(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/portal/verify-otp', state }]}>
      <Routes>
        <Route path="/portal/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/portal/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyOtpPage', () => {
  it('redirects to login when there is no email in navigation state', () => {
    renderVerify(null);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('verifies the code and sends a returning user to /portal', async () => {
    mockedVerifyOtp.mockResolvedValue(verifyOtpResponse(false));
    renderVerify({ email: 'p@e.com' });

    await userEvent.type(screen.getByLabelText('6-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify/ }));

    await waitFor(() => expect(mockedVerifyOtp).toHaveBeenCalledWith('p@e.com', '123456'));
    expect(navigate).toHaveBeenCalledWith('/portal', { replace: true });
  });

  it('sends a brand-new user to register first', async () => {
    mockedVerifyOtp.mockResolvedValue(verifyOtpResponse(true));
    renderVerify({ email: 'p@e.com' });

    await userEvent.type(screen.getByLabelText('6-digit code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Verify/ }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/portal/register', { replace: true }));
  });
});
