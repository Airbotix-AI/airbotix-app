// @vitest-environment jsdom
// Verify-OTP return-to threading (class-seat-checkout-prd.md D-CSC-8): new
// users land on /portal/register WITH the original `from` location preserved
// in state (so register can bounce them back to e.g. a pay-now deep-link);
// returning users go straight to `from`.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
vi.mock('@/auth/useAuth', () => ({ verifyOtp }));

import { VerifyOtpPage } from './VerifyOtpPage';

const FROM = { pathname: '/portal/checkout/class/class-1', search: '', hash: '' };

function RegisterProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | undefined)?.from;
  return <div>REGISTER from:{from?.pathname ?? 'none'}</div>;
}

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | undefined)?.from;
  return <div>LOGIN from:{from?.pathname ?? 'none'}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/portal/verify', state: { email: 'parent@example.com', from: FROM } },
      ]}
    >
      <Routes>
        <Route path="/portal/verify" element={<VerifyOtpPage />} />
        <Route path="/portal/login" element={<LoginProbe />} />
        <Route path="/portal/register" element={<RegisterProbe />} />
        <Route path="/portal/checkout/class/:classId" element={<div>CHECKOUT PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function submitCode() {
  fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('VerifyOtpPage return-to threading', () => {
  it('threads `from` through to /portal/register for new users', async () => {
    verifyOtp.mockResolvedValue({ user: { is_new_user: true } });
    renderPage();

    submitCode();

    expect(
      await screen.findByText('REGISTER from:/portal/checkout/class/class-1'),
    ).toBeInTheDocument();
  });

  it('sends returning users straight back to `from`', async () => {
    verifyOtp.mockResolvedValue({ user: { is_new_user: false } });
    renderPage();

    submitCode();

    expect(await screen.findByText('CHECKOUT PAGE')).toBeInTheDocument();
  });

  it('keeps `from` when the parent asks to retry the OTP flow', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));

    expect(await screen.findByText(`LOGIN from:${FROM.pathname}`)).toBeInTheDocument();
  });
});
