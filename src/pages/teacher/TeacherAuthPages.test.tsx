// @vitest-environment jsdom
// Teacher login for the in-app /teacher/* class surface (auth-system-prd.md
// §2.1 v0.4 account realms): the OTP flow must target the STAFF realm
// (role_hint 'teacher' on request AND verify — codes are realm-scoped), store
// the token in the 'staff' slot so a parent session under the same email
// survives, and map 403 NOT_INVITED to a human explanation (no staff signup).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code = 'ERR',
      message = 'err',
    ) {
      super(message);
    }
  }
  return { api: vi.fn(), MockApiError };
});
vi.mock('@/lib/api', () => ({ api, ApiError: MockApiError }));

import { useAuthStore } from '@/auth/authStore';
import { TeacherLoginPage } from './TeacherLoginPage';
import { TeacherVerifyOtpPage } from './TeacherVerifyOtpPage';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useAuthStore.getState().clearAll();
});

function renderVerify(state: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/teacher/verify-otp', state }]}>
      <Routes>
        <Route path="/teacher/verify-otp" element={<TeacherVerifyOtpPage />} />
        <Route path="/teacher/classes/:classId" element={<div>class dashboard</div>} />
        <Route path="/teacher" element={<div>teacher home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeacherLoginPage', () => {
  it('requests an OTP with the teacher realm hint', async () => {
    api.mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter initialEntries={['/teacher/login']}>
        <Routes>
          <Route path="/teacher/login" element={<TeacherLoginPage />} />
          <Route path="/teacher/verify-otp" element={<div>verify page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'teacher@school.edu' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send code/ }));

    await waitFor(() => expect(screen.getByText('verify page')).toBeInTheDocument());
    expect(api).toHaveBeenCalledWith(
      '/auth/request-otp',
      expect.objectContaining({
        body: { email: 'teacher@school.edu', role_hint: 'teacher' },
      }),
    );
  });
});

describe('TeacherVerifyOtpPage', () => {
  it('verifies with the teacher hint, stores the token in the STAFF slot, and lands on `from`', async () => {
    api.mockResolvedValueOnce({
      access_token: 'staff.jwt',
      expires_in: 900,
      user: { id: 'usr_t', role: 'teacher', is_new_user: false },
    });
    renderVerify({ email: 't@school.edu', from: { pathname: '/teacher/classes/c1' } });

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/ }));

    await waitFor(() => expect(screen.getByText('class dashboard')).toBeInTheDocument());
    expect(api).toHaveBeenCalledWith(
      '/auth/verify-otp',
      expect.objectContaining({
        body: { email: 't@school.edu', code: '000000', role_hint: 'teacher' },
      }),
    );
    const tokens = useAuthStore.getState().tokens;
    expect(tokens.staff).toBe('staff.jwt');
    expect(tokens.user).toBeNull(); // the parent slot is untouched
  });

  it('maps 403 NOT_INVITED to the no-staff-signup explanation', async () => {
    api.mockRejectedValueOnce(new MockApiError(403, 'NOT_INVITED', 'Forbidden'));
    renderVerify({ email: 'parent@example.com' });

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/ }));

    await waitFor(() =>
      expect(screen.getByText(/isn't a teacher account/)).toBeInTheDocument(),
    );
    expect(useAuthStore.getState().tokens.staff).toBeNull();
  });
});
