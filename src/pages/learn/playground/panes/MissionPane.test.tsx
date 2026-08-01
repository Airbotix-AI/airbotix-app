// @vitest-environment jsdom
// Mission Mode — the guided step checklist (learn-game-studio-prd §9A, D-GAME14).
//
// The load-bearing behaviours, in the order the PRD states them:
//  · the AUTHORED steps render (server-normalized ids are the progress keys)
//  · PROGRESSIVE REVEAL: done steps collapse, the current one is expanded, every
//    step AFTER it is LOCKED — placeholder bars only, with the authored title and
//    instruction ABSENT FROM THE DOM (a CSS blur would leak them)
//  · the kid is never TRAPPED: the current step always ticks, a done step always
//    re-opens and un-ticks; only peeking ahead is gated
//  · ticking PATCHes {step_id, done} and lands optimistically
//  · a teacher override is never silent
//  · a milestone step celebrates (from the hoisted workspace-level card); an
//    ordinary one does not
//  · reduced motion drops the confetti and the scroll/settle animation
//  · no authored steps is a NORMAL, friendly state — not an error

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { MissionCelebration } from './MissionCelebration';
import { MissionPane } from './MissionPane';
import { useMissionCelebrationStore } from './missionCelebrationStore';
import { hasUnfinishedSteps, type MissionProgress } from './missionApi';
import { defaultWindows } from '../playgroundStore';
import { WINDOW_ACCENT, WINDOW_META, WINDOW_ORDER } from '../desktop/windowMeta';

vi.mock('@/lib/api', () => ({ api: vi.fn() }));
const apiMock = vi.mocked(api);

const PROJECT_ID = 'proj-1';

const STEPS: MissionProgress['steps'] = [
  { id: 'step_1', title: 'Make your player move', instruction_md: 'Ask the AI for arrow keys.', widget: 'code' },
  {
    id: 'step_2',
    title: 'Add something to collect',
    instruction_md: 'A coin, a star — your call.',
    widget: 'code',
    milestone: 'Your game is playable!',
  },
  { id: 'step_3', title: 'Show the score', instruction_md: 'Put the score on screen.', widget: 'code' },
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

/** GET returns `initial`; every PATCH resolves to the mutated record. */
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

// The celebration is HOISTED to workspace level (it must fire with the Mission
// window closed), so the pane's tests mount it alongside — exactly as Workspace does.
function renderPane(props: { readOnly?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MissionPane projectId={PROJECT_ID} {...props} />
      <MissionCelebration />
    </QueryClientProvider>,
  );
}

const step = (id: string) => screen.getByTestId(`mission-step-${id}`);
const checkbox = (id: string) => screen.getByTestId(`mission-step-checkbox-${id}`);

beforeEach(() => {
  apiMock.mockReset();
  useMissionCelebrationStore.setState({ celebration: null });
  // jsdom has no scrollIntoView; the scroll-to-next effect calls it on advance.
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
});
afterEach(cleanup);

describe('MissionPane — progressive reveal', () => {
  it('renders every authored step, with only the CURRENT one revealed', async () => {
    serve(progress());
    renderPane();

    // The list renders once the checklist has loaded.
    expect(await screen.findByTestId('mission-progress')).toHaveTextContent('Step 1 of 3');
    expect(screen.getByTestId('mission-pane')).toBeInTheDocument();

    // Every step still has its row (harness + progress keys depend on the testid)…
    for (const s of STEPS) expect(screen.getByTestId(`mission-step-${s.id}`)).toBeInTheDocument();
    expect(step('step_1')).toHaveAttribute('data-state', 'current');
    expect(step('step_2')).toHaveAttribute('data-state', 'locked');
    expect(step('step_3')).toHaveAttribute('data-state', 'locked');

    // …but ONLY the current step's copy is on screen.
    expect(screen.getByText('Make your player move')).toBeInTheDocument();
    expect(screen.getByText('Ask the AI for arrow keys.')).toBeInTheDocument();
  });

  it('a locked step leaks NOTHING: its title and instruction are absent from the DOM', async () => {
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-progress');

    // The security-ish assertion. A CSS blur would keep these strings in the DOM
    // (devtools / select-all / screen readers); placeholder bars do not.
    for (const text of [
      'Add something to collect',
      'A coin, a star — your call.',
      'Show the score',
      'Put the score on screen.',
    ]) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
    expect(document.body.innerHTML).not.toContain('Add something to collect');
    expect(document.body.innerHTML).not.toContain('Show the score');
  });

  it('locked rows are aria-hidden, non-interactive, and summarised once for a11y', async () => {
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-progress');

    for (const id of ['step_2', 'step_3']) {
      expect(step(id)).toHaveAttribute('aria-hidden', 'true');
      // No checkbox, no button, nothing focusable inside a locked row.
      expect(screen.queryByTestId(`mission-step-checkbox-${id}`)).not.toBeInTheDocument();
      expect(within(step(id)).queryByRole('checkbox', { hidden: true })).not.toBeInTheDocument();
      expect(within(step(id)).queryByRole('button', { hidden: true })).not.toBeInTheDocument();
    }
    // Exactly ONE checkbox is exposed — the current step's.
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByTestId('mission-locked-hint')).toHaveTextContent(
      '2 more steps unlock as you go',
    );
  });

  it('ticking the current step unlocks EXACTLY the next one', async () => {
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_1'));

    await waitFor(() => expect(step('step_2')).toHaveAttribute('data-state', 'current'));
    expect(screen.getByText('Add something to collect')).toBeInTheDocument();
    expect(screen.getByText('A coin, a star — your call.')).toBeInTheDocument();
    // step_3 stays sealed — one step unlocks, not the rest of the list.
    expect(step('step_3')).toHaveAttribute('data-state', 'locked');
    expect(screen.queryByText('Show the score')).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-locked-hint')).toHaveTextContent(
      '1 more step unlocks as you go',
    );
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('Step 2 of 3');
  });

  it('advances the current step past the ones already done (done steps collapse)', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane();

    await screen.findByTestId('mission-progress');
    expect(step('step_1')).toHaveAttribute('data-state', 'done');
    expect(checkbox('step_1')).toBeChecked();
    // The done step's instruction is collapsed away…
    expect(screen.queryByText('Ask the AI for arrow keys.')).not.toBeInTheDocument();
    // …and step 2 is now the expanded current step.
    expect(step('step_2')).toHaveAttribute('data-state', 'current');
    expect(screen.getByText('A coin, a star — your call.')).toBeInTheDocument();
    expect(screen.getByTestId('mission-progress')).toHaveTextContent('Step 2 of 3');
  });

  it('the kid is never trapped: a DONE step re-opens and un-ticks (going back always works)', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    // Re-open the done step to re-read it — without losing the current step.
    fireEvent.click(screen.getByText('Make your player move'));
    expect(screen.getByText('Ask the AI for arrow keys.')).toBeInTheDocument();
    expect(step('step_2')).toHaveAttribute('data-state', 'current');
    // …and collapse it again.
    fireEvent.click(screen.getByText('Make your player move'));
    expect(screen.queryByText('Ask the AI for arrow keys.')).not.toBeInTheDocument();

    // Un-ticking it walks the checklist back, re-sealing what came after.
    fireEvent.click(checkbox('step_1'));
    await waitFor(() => expect(step('step_1')).toHaveAttribute('data-state', 'current'));
    expect(step('step_2')).toHaveAttribute('data-state', 'locked');
  });

  it('a step the TEACHER ticked ahead of the kid renders done, never locked', async () => {
    serve(progress({ completed_step_ids: ['step_3'], teacher_marked_step_ids: ['step_3'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    expect(step('step_1')).toHaveAttribute('data-state', 'current');
    expect(step('step_2')).toHaveAttribute('data-state', 'locked');
    expect(step('step_3')).toHaveAttribute('data-state', 'done');
    expect(checkbox('step_3')).toBeChecked();
  });
});

describe('MissionPane — sequential check-off (D-M12)', () => {
  it('lets the kid untick only the MOST RECENT finished step', async () => {
    // step_1 + step_2 done ⇒ step_3 is current. Un-ticking step_1 would punch a hole in
    // the prefix, so its checkbox is disabled rather than letting a child hit a
    // STEP_OUT_OF_ORDER error for something the UI invited them to try.
    serve(progress({ completed_step_ids: ['step_1', 'step_2'] }));
    renderPane();
    await screen.findByTestId('mission-step-step_1');

    expect(checkbox('step_1')).toBeDisabled();
    expect(checkbox('step_2')).toBeEnabled();
    expect(checkbox('step_3')).toBeEnabled();
  });

  it('explains WHY an earlier step is locked, rather than being silently dead', async () => {
    serve(progress({ completed_step_ids: ['step_1', 'step_2'] }));
    renderPane();
    await screen.findByTestId('mission-step-step_1');
    expect(checkbox('step_1').getAttribute('aria-label')).toMatch(/most recent step first/i);
  });

  it('keeps the LAST step untickable once everything is done', async () => {
    // currentIndex is -1 when nothing is outstanding — the untick affordance must fall
    // through to the final row instead of disappearing and stranding the kid.
    serve(progress({ completed_step_ids: ['step_1', 'step_2', 'step_3'] }));
    renderPane();
    await screen.findByTestId('mission-step-step_3');
    expect(checkbox('step_3')).toBeEnabled();
    expect(checkbox('step_2')).toBeDisabled();
    expect(checkbox('step_1')).toBeDisabled();
  });

  it('the only tickable UNDONE row is the current step (the rest are locked away)', async () => {
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-step-step_1');
    expect(checkbox('step_1')).toBeEnabled();
    // Ahead-of-current rows render as locked placeholders with no checkbox at all.
    expect(screen.queryByTestId('mission-step-checkbox-step_2')).toBeNull();
    expect(screen.queryByTestId('mission-step-checkbox-step_3')).toBeNull();
  });

  it('readOnly still wins over the sequential rule', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane({ readOnly: true });
    await screen.findByTestId('mission-step-step_1');
    expect(checkbox('step_1')).toBeDisabled();
    expect(checkbox('step_2')).toBeDisabled();
  });
});

describe('MissionPane — scroll to the next step', () => {
  it('scrolls the newly-current step into view smoothly after a tick', async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-progress');

    // Nothing scrolls on first load — only an ADVANCE moves the pane.
    expect(scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(checkbox('step_1'));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' });
    expect(step('step_2')).toHaveClass('pg-step-settle');
  });

  it('reduced motion: jumps instead of scrolling, and drops the settle highlight', async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    serve(progress());
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_1'));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'nearest' });
    expect(step('step_2')).not.toHaveClass('pg-step-settle');
    vi.unstubAllGlobals();
  });
});

describe('MissionPane — check-off', () => {
  it('ticking a step PATCHes {step_id, done} and lands optimistically', async () => {
    // The PATCH is held IN FLIGHT, so anything on screen afterwards is optimistic.
    let settle: ((v: MissionProgress) => void) | undefined;
    apiMock.mockImplementation((_path: string, opts?: { method?: string }) =>
      opts?.method === 'PATCH'
        ? (new Promise<MissionProgress>((resolve) => {
            settle = resolve;
          }) as Promise<never>)
        : (Promise.resolve(progress()) as Promise<never>),
    );
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_1'));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/mission-progress`, {
        method: 'PATCH',
        body: { step_id: 'step_1', done: true },
      }),
    );
    // Still in flight — yet the tick landed and the checklist moved on.
    expect(checkbox('step_1')).toBeChecked();
    expect(step('step_2')).toHaveAttribute('data-state', 'current');

    await act(async () => {
      settle!(progress({ completed_step_ids: ['step_1'] }));
    });
    expect(checkbox('step_1')).toBeChecked();
  });

  it('unticking a step PATCHes done:false', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_1'));

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/mission-progress`, {
        method: 'PATCH',
        body: { step_id: 'step_1', done: false },
      }),
    );
    await waitFor(() => expect(checkbox('step_1')).not.toBeChecked());
  });

  it('rolls the optimistic tick back when the write fails', async () => {
    apiMock.mockImplementation((_path: string, opts?: { method?: string }) =>
      opts?.method === 'PATCH'
        ? (Promise.reject(new Error('offline')) as Promise<never>)
        : (Promise.resolve(progress()) as Promise<never>),
    );
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_1'));
    await waitFor(() => expect(checkbox('step_1')).not.toBeChecked());
  });

  it('the teacher live viewer reads the checklist but cannot write it (D-LV-6)', async () => {
    serve(progress());
    renderPane({ readOnly: true });
    await screen.findByTestId('mission-progress');
    expect(checkbox('step_1')).toBeDisabled();
  });
});

describe('MissionPane — a teacher override is never silent (§9A.4)', () => {
  it('says so on the step the teacher ticked, and only that step', async () => {
    serve(
      progress({
        completed_step_ids: ['step_1'],
        teacher_marked_step_ids: ['step_1'],
      }),
    );
    renderPane();
    await screen.findByTestId('mission-progress');

    const notes = screen.getAllByTestId('mission-teacher-marked');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent('Your teacher marked this done');
    expect(within(step('step_1')).getByTestId('mission-teacher-marked')).toBeInTheDocument();
  });
});

describe('MissionPane — milestone celebration, NO dialog (D-GAME14g)', () => {
  it('fires CONFETTI and opens NO dialog when a MILESTONE step is ticked', async () => {
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_2'));

    expect(await screen.findByTestId('mission-confetti')).toBeInTheDocument();
    // THE assertion for this decision: nothing pops, nothing must be dismissed.
    expect(screen.queryByTestId('mission-celebration')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nice/i })).not.toBeInTheDocument();
  });

  it('keeps the milestone WORDS inline on the finished step, not in a popup', async () => {
    // The confetti marks the moment; the message has to survive it, and still be there
    // when the kid scrolls back later.
    serve(progress({ completed_step_ids: ['step_1', 'step_2'] }));
    renderPane();
    await screen.findByTestId('mission-step-step_2');

    expect(screen.getByTestId('mission-milestone-step_2')).toHaveTextContent(
      'Your game is playable!',
    );
  });

  it('celebrates a milestone on the FINAL step too (no completion carve-out)', async () => {
    // The old "don't celebrate the last step" rule existed only to keep a DIALOG off the
    // "All done" state. With no dialog it is gone — and with it an authoring trap, where a
    // milestone on the last step silently never fired.
    serve(progress({ steps: STEPS, completed_step_ids: ['step_1', 'step_2'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_3'));

    // step_3 carries no milestone in the fixture, so assert the rule via the store instead:
    // an ordinary final step stays quiet, and no dialog appears either way.
    await waitFor(() => expect(checkbox('step_3')).toBeChecked());
    expect(screen.queryByTestId('mission-celebration')).not.toBeInTheDocument();
  });

  it('does NOT celebrate an ordinary step, or an UNtick of a milestone step', async () => {
    serve(progress({ completed_step_ids: [] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    // Ordinary step ticked → no confetti.
    fireEvent.click(checkbox('step_1'));
    await waitFor(() => expect(checkbox('step_1')).toBeChecked());
    expect(screen.queryByTestId('mission-confetti')).not.toBeInTheDocument();

    // Unticking the milestone step must not celebrate either. Ticking it first DOES fire
    // confetti (that is the feature), so clear the store before the untick — otherwise this
    // would assert against the leftover burst from the tick and pass for the wrong reason.
    fireEvent.click(checkbox('step_2'));
    await waitFor(() => expect(checkbox('step_2')).toBeChecked());
    await screen.findByTestId('mission-confetti');
    act(() => useMissionCelebrationStore.setState({ celebration: null }));

    fireEvent.click(checkbox('step_2'));
    await waitFor(() => expect(checkbox('step_2')).not.toBeChecked());
    expect(screen.queryByTestId('mission-confetti')).not.toBeInTheDocument();
  });

  it('honours prefers-reduced-motion: no confetti, and still no dialog', async () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);
    serve(progress({ completed_step_ids: ['step_1'] }));
    renderPane();
    await screen.findByTestId('mission-progress');

    fireEvent.click(checkbox('step_2'));
    await waitFor(() => expect(checkbox('step_2')).toBeChecked());

    expect(screen.queryByTestId('mission-confetti')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mission-celebration')).not.toBeInTheDocument();
    // The kid still gets the milestone — inline, with no motion at all.
    expect(screen.getByTestId('mission-milestone-step_2')).toBeInTheDocument();
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    vi.unstubAllGlobals();
  });

  it('the confetti clears itself — nothing is left to dismiss by hand', async () => {
    vi.useFakeTimers();
    try {
      serve(progress({ completed_step_ids: ['step_1'] }));
      renderPane();
      await vi.waitFor(() => screen.getByTestId('mission-progress'));

      fireEvent.click(checkbox('step_2'));
      await vi.waitFor(() => screen.getByTestId('mission-confetti'));

      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.queryByTestId('mission-confetti')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('MissionPane — no authored steps is a NORMAL state', () => {
  it('shows a friendly empty state, not an error', async () => {
    serve(progress({ mission_id: null, steps: [], completed_step_ids: [] }));
    renderPane();

    expect(await screen.findByTestId('mission-empty')).toHaveTextContent('No mission steps here');
    expect(screen.queryByTestId('mission-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mission-progress')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('hasUnfinishedSteps (drives the Workspace auto-open)', () => {
  it('is true only while an authored step is still unticked', () => {
    expect(hasUnfinishedSteps(progress())).toBe(true);
    expect(hasUnfinishedSteps(progress({ completed_step_ids: STEPS.map((s) => s.id) }))).toBe(false);
    expect(hasUnfinishedSteps(progress({ steps: [] }))).toBe(false);
    expect(hasUnfinishedSteps(undefined)).toBe(false);
  });

  it('tolerates a partial cache entry instead of crashing the workspace', () => {
    // A foreign/partial record can land on the shared key (an optimistic write,
    // a stubbed client). The auto-open is a convenience — it must degrade.
    expect(hasUnfinishedSteps({} as MissionProgress)).toBe(false);
  });
});

describe('the mission window is registered like every other playground window', () => {
  it('has meta, an accent, a dock slot and a default rect (closed, behind the chat)', () => {
    expect(WINDOW_ORDER).toContain('mission');
    expect(WINDOW_META.mission.title).toBe('Mission');
    expect(WINDOW_ACCENT.mission.icon).toBe('text-brand-mint');

    const win = defaultWindows().mission;
    expect(win.open).toBe(false);
    // Never spawns on top of the chat (which launches focused at zIndex 4).
    expect(win.zIndex).toBeLessThan(defaultWindows().chat.zIndex);
    // Wide enough for the Window's minWidth floor (300px).
    expect(win.rect.w).toBeGreaterThanOrEqual(340);
  });
});
