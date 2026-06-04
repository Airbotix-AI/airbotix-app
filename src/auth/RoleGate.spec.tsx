import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from './types';
import { RoleGate } from './RoleGate';
import { useMe } from './useAuth';

vi.mock('./useAuth', () => ({ useMe: vi.fn() }));
const mockedUseMe = vi.mocked(useMe);

function setMe(data: AuthPrincipal | undefined) {
  mockedUseMe.mockReturnValue({ data } as ReturnType<typeof useMe>);
}

const user = { kind: 'user', sub: 'u', email: 'p@e.com', display_name: null, role: 'parent', family_id: 'f1' } as AuthPrincipal;
const kid = { kind: 'kid', sub: 'k', nickname: 'Robo', family_id: 'f1' } as AuthPrincipal;

describe('RoleGate', () => {
  beforeEach(() => mockedUseMe.mockReset());

  it('renders children when the principal kind is allowed', () => {
    setMe(user);
    render(
      <RoleGate kinds={['user']}>
        <div>ALLOWED</div>
      </RoleGate>,
    );
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
  });

  it('renders the fallback when the kind is not allowed', () => {
    setMe(kid);
    render(
      <RoleGate kinds={['user']} fallback={<div>BLOCKED</div>}>
        <div>ALLOWED</div>
      </RoleGate>,
    );
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.queryByText('ALLOWED')).not.toBeInTheDocument();
  });

  it('renders nothing until the principal resolves', () => {
    setMe(undefined);
    const { container } = render(
      <RoleGate kinds={['user']}>
        <div>ALLOWED</div>
      </RoleGate>,
    );
    expect(screen.queryByText('ALLOWED')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
