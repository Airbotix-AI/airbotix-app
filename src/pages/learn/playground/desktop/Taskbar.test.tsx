// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { Taskbar } from './Taskbar';
import { defaultWindows, usePlaygroundStore } from '../playgroundStore';
import type { MissionProgress } from '../panes/missionApi';

afterEach(cleanup);

// The class-aware back target — exercised on its own elsewhere; here we just
// assert the Home control renders it (and is hidden in the teacher read-only view).
vi.mock('../../projects/useProjectBackTo', () => ({
  useProjectBackTo: () => '/learn/classroom/class-1?tab=mywork',
}));
// Heavy/irrelevant children — stub so the Taskbar renders in isolation.
// Stubbed with a marker so tests can assert WHETHER Share is offered (the
// website gate below) without pulling in the real panel's queries.
vi.mock('../ShareLinkPanel', () => ({
  ShareLinkPanel: () => <div data-testid="stub-share-panel" />,
}));
vi.mock('@/pages/try/demoMode', () => ({ useDemoMode: () => null }));
// The dock's MissionStepChip reads the mission checklist through the API client.
vi.mock('@/lib/api', () => ({ api: vi.fn() }));
const apiMock = vi.mocked(api);

const MISSION: MissionProgress = {
  project_id: 'p1',
  mission_id: 'm1',
  steps: [{ id: 'step_1', title: 'Make your player move', widget: 'code' }],
  completed_step_ids: [],
  teacher_marked_step_ids: [],
  updated_at: null,
};

beforeEach(() => {
  apiMock.mockReset().mockResolvedValue(MISSION as never);
});

function renderTaskbar(props: {
  projectId?: string;
  missionId?: string | null;
  readOnly?: boolean;
  kind?: 'game' | 'website';
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Taskbar {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
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

describe('Taskbar — the current mission step is docked here (§9A)', () => {
  it('surfaces the mission step chip for a project with a checklist', async () => {
    renderTaskbar({ projectId: 'p1', missionId: 'm1' });
    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent(
        'Make your player move',
      ),
    );
    expect(screen.getByTestId('mission-taskbar-checkbox')).toBeEnabled();
  });

  it('keeps the chip read-only in the teacher live viewer (D-LV-6)', async () => {
    renderTaskbar({ projectId: 'p1', missionId: 'm1', readOnly: true });
    await waitFor(() => expect(screen.getByTestId('mission-taskbar-checkbox')).toBeDisabled());
  });

  it('shows no chip (and fires no request) for a free-play game with no mission', () => {
    renderTaskbar({ projectId: 'p1' });
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });
});

// Share is a GAME affordance until website publish lands (P3,
// creative-code-studio-website-prd §6): the public play host renders a game
// (ReadOnlyGameFrame) and the ShareLink carries no kind, so sharing a website
// today would mint a DEAD public link. Interim guard — drop it when P3 ships.
describe('Taskbar — Share is gated for website projects (interim, pre-P3)', () => {
  it('offers Share for a game project', () => {
    renderTaskbar({ projectId: 'p1' });
    expect(screen.getByTestId('stub-share-panel')).toBeInTheDocument();
  });

  it('does NOT offer Share for a website project', () => {
    renderTaskbar({ projectId: 'p1', kind: 'website' });
    expect(screen.queryByTestId('stub-share-panel')).not.toBeInTheDocument();
  });

  it('defaults to the game behaviour when no kind is passed', () => {
    renderTaskbar({ projectId: 'p1', kind: undefined });
    expect(screen.getByTestId('stub-share-panel')).toBeInTheDocument();
  });
});

// The Database window button (creative-code-studio-website-prd): Website Studio
// only — a game must never show it, even when a stale persisted layout carries
// windows.db.open=true.
describe('Taskbar — the Database window button is Website Studio only', () => {
  beforeEach(() => {
    usePlaygroundStore.setState({
      windows: defaultWindows(),
      topZ: 4,
      layoutMode: 'window',
    });
    usePlaygroundStore.getState().openOrFocus('db');
  });

  it('shows the Database button for an open db window on a WEBSITE', () => {
    renderTaskbar({ projectId: 'p1', kind: 'website' });
    expect(screen.getByRole('button', { name: /Database/ })).toBeInTheDocument();
  });

  it('never shows it on a game — even with the db window stale-open', () => {
    renderTaskbar({ projectId: 'p1' });
    expect(screen.queryByRole('button', { name: /Database/ })).not.toBeInTheDocument();
  });
});
