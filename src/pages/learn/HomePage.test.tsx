// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', nickname: 'Mia' } }),
}));

vi.mock('./WelcomeModal', () => ({ WelcomeModal: () => null }));

import { HomePage } from './HomePage';
import { CREATE_TOOLS } from './create/createTools';

describe('Learn home', () => {
  it('puts Story Blocks, courses, and all studios directly on the first screen', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('home-story-blocks')).toHaveAttribute('href', '/learn/create/blocks');
    expect(screen.getByTestId('home-story-blocks')).toHaveTextContent('Story Blocks');
    expect(screen.getByTestId('home-story-blocks')).toHaveTextContent('Ages 5–8');
    expect(screen.getByTestId('home-courses')).toHaveAttribute('href', '/learn/missions');
    expect(screen.getByTestId('home-studios')).toHaveAttribute('href', '/learn/create');
  });

  it('uses the canonical Story Blocks name in the studio catalogue', () => {
    const blocks = CREATE_TOOLS.find((tool) => tool.to === '/learn/create/blocks');
    expect(blocks?.title).toBe('Story Blocks');
  });
});
