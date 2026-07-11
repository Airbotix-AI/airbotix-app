// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SessionsPane } from './SessionsPane';

describe('SessionsPane', () => {
  it('always exposes Story Blocks outside the AI chat-session flow', () => {
    render(
      <MemoryRouter>
        <SessionsPane
          sessions={[]}
          loading={false}
          activeId={null}
          onPick={vi.fn()}
          onNew={vi.fn()}
        />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('workspace-story-blocks');
    expect(link).toHaveAttribute('href', '/learn/create/blocks');
    expect(link).toHaveTextContent('Story Blocks');
    expect(link).toHaveTextContent('Ages 5–8');
  });
});
