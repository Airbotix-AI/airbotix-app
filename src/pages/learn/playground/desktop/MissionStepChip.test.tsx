// @vitest-environment jsdom
// The taskbar's current-mission-step chip (learn-game-studio-prd §9A, D-GAME14).
//
// What it must prove:
//  · it shows the CURRENT step (title + "Step N of M") and ticks it
//  · it renders NOTHING without a project / mission / steps, while loading, or on error
//  · "All done 🎉" once every step is ticked
//  · it shares state with MissionPane (same cache entry, same mutation)
//  · a milestone ticked HERE celebrates even with the Mission window CLOSED —
//    the whole reason the celebration is hoisted out of the pane
//  · the teacher live viewer (D-LV-6) can read it but not tick it
//  · it keeps a STABLE slot: fixed width, no flex-grow, rendered BEFORE the
//    window-button group, so opening/closing a window can't move or resize it
//  · the odometer roll plays on an ADVANCE only — never on first load

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { MissionStepChip } from './MissionStepChip';
import { Taskbar } from './Taskbar';
import { MissionCelebration } from '../panes/MissionCelebration';
import { MissionPane } from '../panes/MissionPane';
import { useMissionCelebrationStore } from '../panes/missionCelebrationStore';
import { defaultWindows, usePlaygroundStore } from '../playgroundStore';
import type { MissionProgress } from '../panes/missionApi';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));
// The Taskbar's own heavy/irrelevant children — the dock renders in isolation.
vi.mock('../../projects/useProjectBackTo', () => ({ useProjectBackTo: () => '/learn' }));
vi.mock('../ShareLinkPanel', () => ({ ShareLinkPanel: () => null }));
vi.mock('@/pages/try/demoMode', () => ({ useDemoMode: () => null }));
const apiMock = vi.mocked(api);

const PROJECT_ID = 'proj-1';

const STEPS: MissionProgress['steps'] = [
  { id: 'step_1', title: 'Make your player move', instruction_md: 'Ask the AI for arrow keys.', widget: 'code' },
  {
    id: 'step_2',
    title: 'Add something to collect',
    widget: 'code',
    milestone: 'Your game is playable!',
  },
];

/**
 * A mission whose MILESTONE sits mid-run. The default `STEPS` puts it on the last step,
 * where finishing and reaching a milestone coincide — and D-GAME14g suppresses the card on
 * the tick that FINISHES a mission, so a milestone test must not sit on the final step.
 */
const STEPS_WITH_TAIL: MissionProgress['steps'] = [
  ...STEPS,
  { id: 'step_3', title: 'Show the score', widget: 'code' },
];

function progress(over: Partial<MissionProgress> = {}): MissionProgress {
  return {
    project_id: PROJECT_ID,
    mission_id: 'mission-1',
    steps: STEPS,
    completed_step_ids: [],
    teacher_marked_step_ids: [],
    updated_at: null,
    ...over,
  };
}

function serve(initial: MissionProgress) {
  let current = initial;
  apiMock.mockImplementation((path: string, opts?: { method?: string; body?: unknown }) => {
    if (!path.endsWith('/mission-progress')) throw new Error(`unexpected path ${path}`);
    if (opts?.method === 'PATCH') {
      const { step_id, done } = opts.body as { step_id: string; done: boolean };
      const ids = current.completed_step_ids.filter((id) => id !== step_id);
      current = { ...current, completed_step_ids: done ? [...ids, step_id] : ids };
    }
    return Promise.resolve(current) as Promise<never>;
  });
}

/** The chip alone — the Mission window is CLOSED, the normal taskbar case. */
function renderChip(
  props: { projectId?: string; missionId?: string | null; readOnly?: boolean } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MissionStepChip projectId={PROJECT_ID} missionId="mission-1" {...props} />
      <MissionCelebration />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  useMissionCelebrationStore.setState({ celebration: null });
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

describe('MissionStepChip — the current step in the taskbar', () => {
  it('shows the current step title and its "Step N of M" cue', async () => {
    serve(progress());
    renderChip();

    const chip = await screen.findByTestId('mission-taskbar-chip');
    expect(chip).toHaveTextContent('Make your player move');
    expect(chip).toHaveTextContent('Step 1 of 2');
    expect(chip).toHaveAttribute('data-state', 'current');
  });

  it('ticking the chip PATCHes the step and advances to the next one', async () => {
    serve(progress());
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/mission-progress`, {
        method: 'PATCH',
        body: { step_id: 'step_1', done: true },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent(
        'Add something to collect',
      ),
    );
    expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent('Step 2 of 2');
  });

  it('shows a compact "All done" state once every step is ticked', async () => {
    serve(progress({ completed_step_ids: ['step_1', 'step_2'] }));
    renderChip();

    const chip = await screen.findByTestId('mission-taskbar-chip');
    expect(chip).toHaveAttribute('data-state', 'done');
    expect(chip).toHaveTextContent('All done');
    expect(screen.queryByTestId('mission-taskbar-checkbox')).not.toBeInTheDocument();
  });

  it('renders nothing without a project', () => {
    serve(progress());
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MissionStepChip missionId="mission-1" />
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('a free-play game (no mission) shows nothing AND never fetches the checklist', () => {
    serve(progress());
    renderChip({ missionId: null });
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('renders nothing for a mission with no authored steps', async () => {
    serve(progress({ steps: [] }));
    renderChip();

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
  });

  it('renders nothing while loading, and nothing when the checklist fails', async () => {
    // Loading: the GET never settles.
    apiMock.mockImplementation(() => new Promise<never>(() => {}));
    const { unmount } = renderChip();
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
    unmount();

    // Error: the pane owns the error copy; the dock stays quiet.
    apiMock.mockReset();
    apiMock.mockRejectedValue(new Error('offline'));
    renderChip();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(screen.queryByTestId('mission-taskbar-chip')).not.toBeInTheDocument();
  });

  it('the teacher live viewer can read the chip but not tick it (D-LV-6)', async () => {
    serve(progress());
    renderChip({ readOnly: true });

    await screen.findByTestId('mission-taskbar-chip');
    expect(screen.getByTestId('mission-taskbar-checkbox')).toBeDisabled();
  });
});

describe('MissionStepChip — shared state with the pane', () => {
  it('a tick in the pane moves the chip, and a tick in the chip moves the pane', async () => {
    serve(progress());
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MissionPane projectId={PROJECT_ID} />
        <MissionStepChip projectId={PROJECT_ID} missionId="mission-1" />
      </QueryClientProvider>,
    );
    await screen.findByTestId('mission-progress');
    expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent('Make your player move');

    // Pane → chip.
    fireEvent.click(screen.getByTestId('mission-step-checkbox-step_1'));
    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent(
        'Add something to collect',
      ),
    );

    // Chip → pane (untick from the chip is not offered; tick the last step).
    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));
    await waitFor(() =>
      expect(screen.getByTestId('mission-step-checkbox-step_2')).toBeChecked(),
    );
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('All 2 steps done!');
    expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent('All done');
  });
});

describe('MissionStepChip — a STABLE slot that windows cannot move or resize', () => {
  // Measured in a real browser before the fix: opening ONE window moved the chip
  // from x:765 → x:913 and shrank it 280px → 167px, because it sat AFTER the
  // window-button group in an `ml-2 min-w-0 flex-1` wrapper. jsdom has no layout,
  // so we assert the two structural causes instead of geometry.
  it('never grows: fixed width, no flex-grow, no min-w-0 shrink-to-fit', async () => {
    serve(progress());
    renderChip();

    const chip = await screen.findByTestId('mission-taskbar-chip');
    expect(chip.className).toContain('w-[264px]');
    expect(chip.className).toContain('shrink-0');
    expect(chip.className).not.toMatch(/(^|\s)(flex-1|grow|flex-auto)(\s|$)/);
    // No ancestor may reintroduce the growth either.
    for (let el = chip.parentElement; el && el !== document.body; el = el.parentElement) {
      expect(el.className).not.toMatch(/(^|\s)(flex-1|grow|flex-auto)(\s|$)/);
    }
  });

  it('renders BEFORE the window-button group, in both layout modes, whatever is open', async () => {
    serve(progress());
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    for (const layoutMode of ['window', 'split'] as const) {
      usePlaygroundStore.setState({ layoutMode, windows: defaultWindows() });
      const { unmount, rerender } = render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <Taskbar projectId={PROJECT_ID} missionId="mission-1" />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const chip = await screen.findByTestId('mission-taskbar-chip');
      // The dock row itself — the chip is one of its direct children (its own
      // slot), NOT nested inside the window-button group.
      const dock = chip.parentElement!;
      const slotIndex = () => Array.from(dock.children).indexOf(chip);

      const before = slotIndex();
      expect(before).toBeGreaterThanOrEqual(0);

      // Open every window — in window mode this materialises the button group.
      const opened = defaultWindows();
      for (const id of Object.keys(opened) as Array<keyof typeof opened>) {
        opened[id] = { ...opened[id], open: true, minimized: false };
      }
      usePlaygroundStore.setState({ windows: opened });
      rerender(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <Taskbar projectId={PROJECT_ID} missionId="mission-1" />
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Same slot index, and still ahead of the (now rendered) button group.
      expect(slotIndex()).toBe(before);
      const group = screen.queryByTestId('pg-window-buttons');
      if (layoutMode === 'window') {
        expect(group).toBeInTheDocument();
        expect(
          chip.compareDocumentPosition(group!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      } else {
        // Split mode has no window buttons at all — the chip still shows.
        expect(group).not.toBeInTheDocument();
        expect(chip).toBeInTheDocument();
      }
      unmount();
    }
    usePlaygroundStore.setState({ layoutMode: 'window', windows: defaultWindows() });
  });
});

describe('MissionStepChip — the odometer roll', () => {
  it('does not roll on first load (that would read as a glitch)', async () => {
    serve(progress());
    renderChip();

    const label = await screen.findByTestId('mission-taskbar-label');
    expect(label).toHaveAttribute('data-rolling', 'false');
    expect(label).not.toHaveClass('pg-wheel-roll');
    // Only ONE face on the track until something advances.
    expect(label.children).toHaveLength(1);
  });

  it('rolls on an ADVANCE: a fresh keyed track carrying the outgoing face', async () => {
    serve(progress());
    renderChip();
    const first = await screen.findByTestId('mission-taskbar-label');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-label')).toHaveAttribute('data-rolling', 'true'),
    );
    const rolled = screen.getByTestId('mission-taskbar-label');
    // The keyed remount is what replays the CSS animation — a NEW element.
    expect(rolled).not.toBe(first);
    expect(rolled).toHaveClass('pg-wheel-roll');
    // Two faces on the track: the finished step rolling out, the new one in.
    expect(rolled.children).toHaveLength(2);
    expect(rolled.children[0]).toHaveTextContent('Make your player move');
    expect(rolled.children[0]).toHaveAttribute('aria-hidden', 'true');
    expect(rolled.children[1]).toHaveTextContent('Add something to collect');
  });

  it('rolls the last step away into the "All done" face too', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-chip')).toHaveAttribute('data-state', 'done'),
    );
    const rolled = screen.getByTestId('mission-taskbar-label');
    expect(rolled).toHaveClass('pg-wheel-roll');
    expect(rolled.children[0]).toHaveTextContent('Add something to collect');
    expect(rolled.children[1]).toHaveTextContent('All done');
  });

  it('reduced motion: the label just swaps, with no roll and no outgoing face', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    serve(progress());
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    await waitFor(() =>
      expect(screen.getByTestId('mission-taskbar-chip')).toHaveTextContent(
        'Add something to collect',
      ),
    );
    const label = screen.getByTestId('mission-taskbar-label');
    expect(label).toHaveAttribute('data-rolling', 'false');
    expect(label).not.toHaveClass('pg-wheel-roll');
    expect(label.children).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe('MissionStepChip — the milestone still celebrates with the window CLOSED', () => {
  it('ticking a milestone step from the taskbar fires the hoisted celebration', async () => {
    // No MissionPane in the tree at all — the Mission window is closed.
    serve(progress({ steps: STEPS_WITH_TAIL, completed_step_ids: ['step_1'] }));
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    // Confetti only — completing a step never opens a dialog (D-GAME14g).
    expect(await screen.findByTestId('mission-confetti')).toBeInTheDocument();
    expect(screen.queryByTestId('mission-celebration')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nice/i })).not.toBeInTheDocument();
  });

  it('opens NO dialog on the tick that FINISHES the mission (D-GAME14g)', async () => {
    // step_2 is BOTH a milestone and the last step here. It still celebrates — there is no
    // "last step" carve-out any more, because that only existed to keep a DIALOG off the
    // "All done" state. What must never appear is the dialog itself.
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    await screen.findByText(/All done/i);
    expect(screen.queryByTestId('mission-celebration')).toBeNull();
    expect(screen.queryByRole('button', { name: /nice/i })).toBeNull();
    // The confetti is fine — it blocks nothing and clears itself.
    expect(screen.getByTestId('mission-confetti')).toBeInTheDocument();
  });

  it('reduced motion drops the confetti, and there is still no dialog', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    serve(progress({ steps: STEPS_WITH_TAIL, completed_step_ids: ['step_1'] }));
    renderChip();
    await screen.findByTestId('mission-taskbar-chip');

    fireEvent.click(screen.getByTestId('mission-taskbar-checkbox'));

    // The chip advances, and NOTHING is rendered for the celebration: no motion (reduced
    // motion) and no dialog (D-GAME14g). The milestone's words are not lost — they live
    // inline on the finished step row in MissionPane, which is not mounted here.
    await screen.findByText('Show the score');
    expect(screen.queryByTestId('mission-confetti')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mission-celebration')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
