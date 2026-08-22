// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JTW_S2_ASSETS,
  JTW_S2_C1_P4_TARGET,
  JTW_S2_C2_P4_TARGET,
  JTW_S2_C2_P5_WUKONG_TARGET,
} from '../jtwS2Builds';
import { JourneyWestS2BatchPartPage } from './JourneyWestS2BatchPartPage';
import * as blocksApi from '../blocksApi';
import * as storyPartsApi from './storyPartsApi';

vi.mock('@/auth/useAuth', () => ({ useMe: () => ({ data: { kind: 'kid', sub: 'kid-1' } }) }));
vi.mock('../blocksApi', async (importOriginal) => ({
  ...(await importOriginal<typeof blocksApi>()),
  listBlocksProjects: vi.fn(),
  loadBlocksProject: vi.fn(),
  createBlocksProject: vi.fn(),
}));
vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);
const listProjects = vi.mocked(blocksApi.listBlocksProjects);
const loadProject = vi.mocked(blocksApi.loadBlocksProject);

function renderPart(partId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/learn/story/journey-west/${partId}`]}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestS2BatchPartPage partId={partId} />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="map" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function p4Loaded(runCompleted: boolean) {
  const completed: Record<string, { completedAt: string }> = runCompleted
    ? { 'jtw-s2-c1-p4': { completedAt: 'now' } }
    : {};
  return {
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: { schemaVersion: 1 as const, completed },
    project: {
      version: 1 as const,
      name: 'Journey to the West S2 · Three Steps to the Mountain',
      lessonId: 'jtw-s2-c1-p4',
      pages: [
        {
          id: 'jtw-s2-c1-p4-page',
          background: 'jtw-s2-c1-changan-to-mountain',
          characters: [
            {
              id: 'xuanzang',
              name: 'Xuanzang',
              emoji: '🧑‍🦲',
              asset: JTW_S2_ASSETS.xuanzang,
              start: { gx: 2, gy: 9, size: 2, rot: 0 },
              scripts: [{ id: 'xuanzang-departure', blocks: JTW_S2_C1_P4_TARGET }],
            },
          ],
        },
      ],
    },
  };
}

function c2p5Loaded(runCompleted: boolean) {
  const completed: Record<string, { completedAt: string }> = runCompleted
    ? { 'jtw-s2-c2-p5': { completedAt: 'now' } }
    : {};
  return {
    version: 2,
    history: { past: [], future: [] },
    otherFiles: [],
    storyProgress: { schemaVersion: 1 as const, completed },
    project: {
      version: 1 as const,
      name: 'Journey to the West S2 · Answer After the Question',
      lessonId: 'jtw-s2-c2-p5',
      pages: [
        {
          id: 'jtw-s2-c2-p5-page',
          background: 'jtw-s2-c2-five-elements-mountain',
          characters: [
            {
              id: 'xuanzang',
              name: 'Xuanzang',
              emoji: '🧑‍🦲',
              asset: JTW_S2_ASSETS.xuanzang,
              start: { gx: 2, gy: 9, size: 2, rot: 0 },
              scripts: [{ id: 'xuanzang-approaches-mountain', blocks: JTW_S2_C2_P4_TARGET }],
            },
            {
              id: 'wukong-waiting',
              name: 'Wukong Waiting',
              emoji: '🐒',
              asset: JTW_S2_ASSETS.wukong,
              start: { gx: 12, gy: 8, size: 2, rot: 0, visible: false },
              scripts: [{ id: 'wukong-answers', blocks: JTW_S2_C2_P5_WUKONG_TARGET }],
            },
          ],
        },
      ],
    },
  };
}

function c2p6Loaded(runCompleted: boolean) {
  const loaded = c2p5Loaded(false);
  loaded.project.name = 'Journey to the West S2 · Fix the Early Answer';
  loaded.project.lessonId = 'jtw-s2-c2-p6';
  loaded.project.pages[0].id = 'jtw-s2-c2-p6-page';
  loaded.project.pages[0].characters[1].scripts[0].id = 'wukong-answers-too-early';
  loaded.storyProgress.completed = runCompleted ? { 'jtw-s2-c2-p6': { completedAt: 'now' } } : {};
  return loaded;
}

beforeEach(() => {
  fetchProgress.mockImplementation(async (_line) => ({
    story_line_id: 'journey-to-the-west-s2',
    completed: [],
    unlocked_part_ids: ['jtw-s2-c1-p3', 'jtw-s2-c1-p4'],
  }));
  completePart.mockResolvedValue({ part_id: 'done', completed_at: 'now' });
  listProjects.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestS2BatchPartPage', () => {
  it('requires both C4-P1 text evidence choices and creates no Blocks project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p1'],
    });
    renderPart('jtw-s2-c4-p1');
    await screen.findByTestId('jtw-s2-c4-p1');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Run the fastest by yourself' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: "The windmill heard it, but the White Dragon Horse who was waiting for the news didn't hear it.",
      }),
    );
    expect(screen.getByTestId('jtw-s2-c4-p1-continue')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Check carefully and send the message to' }),
    );
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p1-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c4-p1',
        expect.objectContaining({
          selections: expect.objectContaining({
            story_screens: ['jtw-s2-c4-p1-story'],
            answer: ['check-and-deliver'],
            extra_answer: ['windmill-not-horse'],
            build_project: [],
          }),
        }),
      ),
    );
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it('requires C4-P2 motive and shared-signal reasoning without creating a Blocks project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p2'],
    });
    renderPart('jtw-s2-c4-p2');
    await screen.findByTestId('jtw-s2-c4-p2');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'As long as you run the fastest, you will get the right one.',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'As long as the sender likes the color, the receiver will definitely take action',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c4-p2-continue')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Able to verify and send messages to the correct partner',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Because both parties have to recognize the same signal, they check it first before sending it.',
      }),
    );
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p2-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c4-p2',
        expect.objectContaining({
          selections: expect.objectContaining({
            story_screens: ['jtw-s2-c4-p2-story'],
            answer: ['check-and-deliver'],
            extra_answer: ['both-sides-recognise'],
            build_project: [],
          }),
        }),
      ),
    );
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it('stores the complete C4-P3 sender, receiver, matching and mismatch prediction without a project', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c4-p3'],
    });
    renderPart('jtw-s2-c4-p3');
    await screen.findByTestId('jtw-s2-c4-p3');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    for (const label of ['Wukong · Sender', 'Send · blue', 'Get · Blue', 'Bajie·Receiver']) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(
      screen.getByRole('button', { name: 'Bajie continues to wait, even if both sides are blue' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Bajie can act because any color can be connected' }),
    );
    expect(screen.getByTestId('jtw-s2-c4-p3-continue')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bajie will act because sending and receiving are both blue',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Bajie continued to wait because blue and orange did not pair up',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c4-p3-comparison')).toHaveTextContent(
      '🔵 Wukong Send blue ─── Bajie Get blue: Bajie will take action',
    );
    fireEvent.click(screen.getByTestId('jtw-s2-c4-p3-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c4-p3',
        expect.objectContaining({
          prediction: 'bajie-acts',
          selections: expect.objectContaining({
            story_screens: ['jtw-s2-c4-p3-story'],
            action_order: ['wukong-sender', 'send-blue', 'get-blue', 'bajie-receiver'],
            sender: ['wukong'],
            receiver: ['bajie'],
            matching_pair: ['blue-blue'],
            mismatch_pair: ['blue-orange'],
            matching_prediction: ['bajie-acts'],
            mismatch_prediction: ['bajie-waits'],
            checkpoint_sentence: [
              'Wukong sends blue, and Bajie receives blue, so Bajie will act; if Bajie waits for orange, he will continue to wait.',
            ],
            build_project: [],
          }),
        }),
      ),
    );
    expect(blocksApi.createBlocksProject).not.toHaveBeenCalled();
    expect(listProjects).not.toHaveBeenCalled();
  });

  it.each([
    [
      'jtw-s2-c5-p1',
      'Wukong to Bajie, Bajie to Wujing',
      'Receive the first segment first, then send the second segment',
      'two-legs',
      'receive-then-send',
    ],
    [
      'jtw-s2-c5-p2',
      'Join a team that never leaves each other behind',
      'Listen first, then repeat, and finally take action',
      'join-together',
      'listen-retell-act',
    ],
  ] as const)(
    'requires both reading evidence groups for %s without creating a project',
    async (partId, answerLabel, extraLabel, answerId, extraId) => {
      fetchProgress.mockResolvedValue({
        story_line_id: 'journey-to-the-west-s2',
        completed: [],
        unlocked_part_ids: [partId],
      });
      renderPart(partId);
      await screen.findByTestId(partId);
      fireEvent.click(
        screen.getByRole('button', { name: 'I have finished reading this story card' }),
      );
      fireEvent.click(screen.getByRole('button', { name: answerLabel }));
      fireEvent.click(screen.getByRole('button', { name: extraLabel }));
      fireEvent.click(screen.getByTestId(`${partId}-continue`));
      await waitFor(() =>
        expect(completePart).toHaveBeenCalledWith(
          'journey-to-the-west-s2',
          partId,
          expect.objectContaining({
            selections: expect.objectContaining({
              answer: [answerId],
              extra_answer: [extraId],
              build_project: [],
            }),
          }),
        ),
      );
      expect(listProjects).not.toHaveBeenCalled();
    },
  );

  it('requires the complete C5-P3 two-leg relay order and stores the missing-middle prediction', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c5-p3'],
    });
    renderPart('jtw-s2-c5-p3');
    await screen.findByTestId('jtw-s2-c5-p3');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    for (const label of [
      'Wukong · Send blue',
      'Bajie · Get ​​Blue',
      'Bajie · Send Yellow',
      'Wu Jing · Get ​​Yellow',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Stopped at Bajie because he did not continue sending after receiving blue',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wukong → Bajie → Wujing' }));
    fireEvent.click(screen.getByTestId('jtw-s2-c5-p3-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c5-p3',
        expect.objectContaining({
          prediction: 'stops-at-bajie',
          selections: expect.objectContaining({
            action_order: [
              'wukong-send-blue',
              'bajie-get-blue',
              'bajie-send-yellow',
              'wujing-get-yellow',
            ],
            answer: ['stops-at-bajie'],
            extra_answer: ['wukong-bajie-wujing'],
            build_project: [],
          }),
        }),
      ),
    );
  });

  it('requires the complete C6-P3 three-page order before unlocking Build 1', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c6-p3'],
    });
    renderPart('jtw-s2-c6-p3');
    await screen.findByTestId('jtw-s2-c6-p3');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    for (const label of [
      'First page · Collection',
      'Send · blue',
      'Page 2 · Crossing the bridge',
      'Send · Yellow',
      'Page 3 · To the West',
      'End',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(
      screen.getByRole('button', { name: 'Assemble → Cross the bridge → Head west' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'On the third page, after the team reaches the flag' }),
    );
    fireEvent.click(screen.getByTestId('jtw-s2-c6-p3-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c6-p3',
        expect.objectContaining({
          selections: expect.objectContaining({
            action_order: [
              'page-one-gather',
              'send-blue',
              'page-two-bridge',
              'send-yellow',
              'page-three-west',
              'end',
            ],
          }),
        }),
      ),
    );
  });

  it('makes P3 an off-screen order prediction and stores its own evidence', async () => {
    renderPart('jtw-s2-c1-p3');
    await screen.findByTestId('jtw-s2-c1-p3');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    for (const label of [
      'Read the directions',
      'Bring a suitcase',
      'Cross the city gate',
      'Stop at the foot of the mountain',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Already arrived in the West' }));
    expect(screen.getByTestId('jtw-s2-c1-p3-continue')).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Stop at the bottom of the first mountain' }),
    );
    fireEvent.click(screen.getByTestId('jtw-s2-c1-p3-continue'));
    await waitFor(() =>
      expect(completePart).toHaveBeenCalledWith(
        'journey-to-the-west-s2',
        'jtw-s2-c1-p3',
        expect.objectContaining({ prediction: 'mountain-stop' }),
      ),
    );
  });

  it('does not complete a matching P4 program until Studio persisted a real run', async () => {
    listProjects.mockResolvedValue([
      { id: 'project-p4', title: 'P4', kind: 'blocks', status: 'active' },
    ]);
    loadProject.mockResolvedValue(p4Loaded(false));
    const first = renderPart('jtw-s2-c1-p4');
    await screen.findByTestId('jtw-s2-c1-p4');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Stopping at the bottom of the mountain/i }));
    expect(screen.getByTestId('jtw-s2-c1-p4-build')).toHaveAttribute(
      'data-build-state',
      'in-progress',
    );
    expect(screen.getByTestId('jtw-s2-c1-p4-continue')).toBeDisabled();
    first.unmount();

    loadProject.mockResolvedValue(p4Loaded(true));
    renderPart('jtw-s2-c1-p4');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-s2-c1-p4-build')).toHaveAttribute('data-build-state', 'done'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Stopping at the bottom of the mountain/i }));
    expect(screen.getByTestId('jtw-s2-c1-p4-continue')).toBeEnabled();
  });

  it('requires the saved C2-P5 dual-event program and its completed Go-then-Tap run marker', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c2-p5'],
    });
    listProjects.mockResolvedValue([
      { id: 'project-c2p5', title: 'C2 P5', kind: 'blocks', status: 'active' },
    ]);
    loadProject.mockResolvedValue(c2p5Loaded(false));
    const first = renderPart('jtw-s2-c2-p5');
    await screen.findByTestId('jtw-s2-c2-p5');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'First Go to ask Xuanzang, then click Wukong to respond',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c2-p5-build')).toHaveAttribute(
      'data-build-state',
      'in-progress',
    );
    expect(screen.getByTestId('jtw-s2-c2-p5-continue')).toBeDisabled();
    first.unmount();

    loadProject.mockResolvedValue(c2p5Loaded(true));
    renderPart('jtw-s2-c2-p5');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-s2-c2-p5-build')).toHaveAttribute('data-build-state', 'done'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'First Go to ask Xuanzang, then click Wukong to respond',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c2-p5-continue')).toBeEnabled();
  });

  it('requires P6 answers plus the persisted wrong-run and fixed Go-then-Tap marker', async () => {
    fetchProgress.mockResolvedValue({
      story_line_id: 'journey-to-the-west-s2',
      completed: [],
      unlocked_part_ids: ['jtw-s2-c2-p6'],
    });
    listProjects.mockResolvedValue([
      { id: 'project-c2p6', title: 'C2 P6', kind: 'blocks', status: 'active' },
    ]);
    loadProject.mockResolvedValue(c2p6Loaded(false));
    const first = renderPart('jtw-s2-c2-p6');
    await screen.findByTestId('jtw-s2-c2-p6');
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wukong answered before Xuanzang asked' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'The first time you just go, watch Wukong and wait; the second time you click Wukong',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c2-p6-continue')).toBeDisabled();
    first.unmount();

    loadProject.mockResolvedValue(c2p6Loaded(true));
    renderPart('jtw-s2-c2-p6');
    await waitFor(() =>
      expect(screen.getByTestId('jtw-s2-c2-p6-build')).toHaveAttribute('data-build-state', 'done'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'I have finished reading this story card' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Wukong answered before Xuanzang asked' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'The first time you just go, watch Wukong and wait; the second time you click Wukong',
      }),
    );
    expect(screen.getByTestId('jtw-s2-c2-p6-continue')).toBeEnabled();
  });
});
