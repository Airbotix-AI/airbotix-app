import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as auth from '@/auth/useAuth';
import { ApiError } from '@/lib/api';
import { ClassCodePage } from './ClassCodePage';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));
vi.mock('@/auth/useAuth', () => ({ classCodeLogin: vi.fn() }));

const mockedClassCodeLogin = vi.mocked(auth.classCodeLogin);

beforeEach(() => {
  navigate.mockReset();
  mockedClassCodeLogin.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ClassCodePage />
    </MemoryRouter>,
  );
}

describe('ClassCodePage', () => {
  it('joins the class with an upper-cased code and navigates to /learn', async () => {
    mockedClassCodeLogin.mockResolvedValue({
      access_token: 'jwt',
      expires_in: 900,
      kid: { id: 'k1', nickname: 'Mia', class_id: 'c1', is_ephemeral: true },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText('Class code'), 'abcd');
    await userEvent.type(screen.getByLabelText(/What do you want to be called/), 'Mia');
    await userEvent.click(screen.getByRole('button', { name: /Join/ }));

    await waitFor(() => expect(mockedClassCodeLogin).toHaveBeenCalledWith('ABCD', 'Mia'));
    expect(navigate).toHaveBeenCalledWith('/learn', { replace: true });
  });

  it('surfaces an ApiError when the class code is wrong', async () => {
    mockedClassCodeLogin.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Class not found'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Class code'), 'abcd');
    await userEvent.type(screen.getByLabelText(/What do you want to be called/), 'Mia');
    await userEvent.click(screen.getByRole('button', { name: /Join/ }));
    expect(await screen.findByText('Class not found')).toBeInTheDocument();
  });

  it('blocks submit when the code is too short', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Class code'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /Join/ }));
    expect(mockedClassCodeLogin).not.toHaveBeenCalled();
  });
});
