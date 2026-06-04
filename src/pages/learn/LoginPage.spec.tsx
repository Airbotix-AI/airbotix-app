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
vi.mock('@/auth/useAuth', () => ({ kidLogin: vi.fn() }));

const mockedKidLogin = vi.mocked(auth.kidLogin);

beforeEach(() => {
  navigate.mockReset();
  mockedKidLogin.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

async function fillForm(code: string, nickname: string, pin: string) {
  await userEvent.type(screen.getByLabelText('Family code'), code);
  await userEvent.type(screen.getByLabelText('My nickname'), nickname);
  await userEvent.type(screen.getByLabelText('PIN (4 digits)'), pin);
}

describe('learn LoginPage', () => {
  it('signs the kid in with family code + nickname + PIN', async () => {
    mockedKidLogin.mockResolvedValue({
      access_token: 'jwt',
      expires_in: 900,
      kid: { id: 'k1', nickname: 'Mia', age: 9, family_id: 'f1' },
    });
    renderPage();

    await fillForm('WANG', 'Mia', '1234');
    await userEvent.click(screen.getByRole('button', { name: /Let me in/ }));

    await waitFor(() => expect(mockedKidLogin).toHaveBeenCalledWith('WANG', 'Mia', '1234'));
    expect(navigate).toHaveBeenCalledWith('/learn', { replace: true });
  });

  it('surfaces an ApiError on bad credentials', async () => {
    mockedKidLogin.mockRejectedValue(new ApiError(401, 'BAD_PIN', 'Wrong PIN'));
    renderPage();
    await fillForm('WANG', 'Mia', '1234');
    await userEvent.click(screen.getByRole('button', { name: /Let me in/ }));
    expect(await screen.findByText('Wrong PIN')).toBeInTheDocument();
  });
});
