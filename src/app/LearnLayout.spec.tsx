import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LearnLayout } from './LearnLayout';

vi.mock('./LearnTopBar', () => ({ LearnTopBar: () => <header>TOPBAR</header> }));
vi.mock('@/components/LiveAnnouncer', () => ({ LiveAnnouncer: () => null }));
vi.mock('@/lib/ws', () => ({ sendWsEvent: vi.fn() }));

describe('LearnLayout', () => {
  it('exposes the skip-link and a focusable main landmark around the outlet', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/learn']}>
        <Routes>
          <Route element={<LearnLayout />}>
            <Route path="/learn" element={<div>LEARN CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Skip to content/ })).toHaveAttribute('href', '#main-content');
    const main = container.querySelector('main#main-content');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('LEARN CONTENT')).toBeInTheDocument();
  });
});
