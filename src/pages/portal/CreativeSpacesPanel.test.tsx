// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CreativeSpacesPanel } from './CreativeSpacesPanel';

describe('CreativeSpacesPanel', () => {
  it('explains the same four live studios to parents and tells them where kids find them', () => {
    render(
      <MemoryRouter>
        <CreativeSpacesPanel />
      </MemoryRouter>,
    );

    const expected = [
      ['story-blocks', 'Story Blocks'],
      ['creative-code', 'Creative Code Studio'],
      ['art-studio', 'Art Studio'],
      ['music-stage', 'Music Stage'],
    ];
    for (const [id, name] of expected) {
      const card = screen.getByTestId(`parent-studio-${id}`);
      expect(card).toHaveTextContent(name);
      expect(card).toHaveTextContent('Learn home →');
    }

    expect(screen.getByText(/inside your child's Learn account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open My Family →' })).toHaveAttribute(
      'href',
      '/portal/family',
    );
  });

  it('does not advertise paused studios as available', () => {
    render(
      <MemoryRouter>
        <CreativeSpacesPanel />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Voice Booth')).not.toBeInTheDocument();
    expect(screen.queryByText('Video Studio')).not.toBeInTheDocument();
  });
});
