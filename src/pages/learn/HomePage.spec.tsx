import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';
import { mockUseMe } from '@/test/mocks';
import { HomePage } from './HomePage';

vi.mock('@/auth/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('./WelcomeModal', (): typeof import('./WelcomeModal') => ({ WelcomeModal: () => null }));

const kid: AuthPrincipal = { kind: 'kid', sub: 'k1', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

beforeEach(() => mockUseMe(kid));

describe('HomePage', () => {
  it('greets the kid and links to the main surfaces', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Hi Robo/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue where you left off/ })).toHaveAttribute(
      'href',
      '/learn/workspace',
    );
    expect(screen.getByRole('link', { name: /Guided lessons/ })).toHaveAttribute(
      'href',
      '/learn/missions',
    );
    expect(screen.getByRole('link', { name: /Your stuff/ })).toHaveAttribute('href', '/learn/projects');
  });
});
