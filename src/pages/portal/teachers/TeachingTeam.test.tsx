// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { TeachingTeam } from './TeachingTeam';

afterEach(cleanup);

describe('TeachingTeam', () => {
  it('links only approved public team members', () => {
    render(
      <MemoryRouter>
        <TeachingTeam
          team={[{ slug: 'amy-chen', display_name: 'Amy Chen', avatar_url: null, role: 'lead' }]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Amy Chen · Lead teacher' })).toHaveAttribute(
      'href',
      '/portal/teachers/amy-chen',
    );
  });

  it('never falls back to an email when no public team member exists', () => {
    render(
      <MemoryRouter>
        <TeachingTeam team={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Teacher to be confirmed')).toBeVisible();
    expect(screen.queryByText(/@/)).toBeNull();
  });
});
