import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WelcomeModal } from './WelcomeModal';

const STORAGE_KEY = 'airbotix.learn.welcomed';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function renderModal(nickname = 'Robo') {
  return render(
    <MemoryRouter>
      <WelcomeModal nickname={nickname} />
    </MemoryRouter>,
  );
}

describe('WelcomeModal', () => {
  it('greets a first-time kid by nickname', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Hi Robo!' })).toBeInTheDocument();
  });

  it('advances through the onboarding steps with Next', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByRole('heading', { name: /Stars are your fuel/ })).toBeInTheDocument();
  });

  it('does not show once the kid has been welcomed before', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { container } = renderModal();
    expect(container).toBeEmptyDOMElement();
  });
});
