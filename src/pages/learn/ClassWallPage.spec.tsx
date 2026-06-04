import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ClassWallPage } from './ClassWallPage';

describe('ClassWallPage', () => {
  it('renders the coming-soon placeholder with a missions link', () => {
    render(
      <MemoryRouter>
        <ClassWallPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your friends made/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse missions/ })).toHaveAttribute('href', '/learn/missions');
  });
});
