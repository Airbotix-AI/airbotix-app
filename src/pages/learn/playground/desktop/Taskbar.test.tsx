// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Taskbar } from './Taskbar';

afterEach(cleanup);

// The class-aware back target — exercised on its own elsewhere; here we just
// assert the Home control renders it (and is hidden in the teacher read-only view).
vi.mock('../../projects/useProjectBackTo', () => ({
  useProjectBackTo: () => '/learn/classroom/class-1?tab=mywork',
}));
// Heavy/irrelevant children — stub so the Taskbar renders in isolation.
vi.mock('../ShareLinkPanel', () => ({ ShareLinkPanel: () => null }));
vi.mock('@/pages/try/demoMode', () => ({ useDemoMode: () => null }));

function renderTaskbar(props: { projectId?: string; readOnly?: boolean }) {
  render(
    <MemoryRouter>
      <Taskbar {...props} />
    </MemoryRouter>,
  );
}

describe('Taskbar — Home/back (kid way out of the game playground)', () => {
  it('renders a Home link to the class "My work" back target', () => {
    renderTaskbar({ projectId: 'p1' });
    const home = screen.getByTestId('pg-home');
    expect(home).toHaveAttribute('href', '/learn/classroom/class-1?tab=mywork');
    expect(home).toHaveTextContent('Home');
  });

  it('hides the Home control in the teacher read-only viewer (D-LV-6)', () => {
    renderTaskbar({ projectId: 'p1', readOnly: true });
    expect(screen.queryByTestId('pg-home')).not.toBeInTheDocument();
  });
});
