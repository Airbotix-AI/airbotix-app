// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JourneyWestC2Part3Page } from './JourneyWestC2Part3Page';
import {
  C2_P3_ROUTE_CARD_ORDER,
  C2_P3_STORY_BEFORE,
  C2_P3_TARGET_CHAIN,
  C2_P3_TARGET_STOP_CELLS,
  C2_P3_WRONG_VERSION_STOPS,
} from './journeyWestSeason1';
import * as storyPartsApi from './storyPartsApi';
import type { StoryLineProgress } from './storyPartsApi';

vi.mock('./storyPartsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof storyPartsApi>()),
  fetchStoryLineProgress: vi.fn(),
  completeStoryPart: vi.fn(),
}));

const fetchProgress = vi.mocked(storyPartsApi.fetchStoryLineProgress);
const completePart = vi.mocked(storyPartsApi.completeStoryPart);

const PRIOR_PART_IDS = [
  'jtw-s1-c1-p1',
  'jtw-s1-c1-p2',
  'jtw-s1-c1-p3',
  'jtw-s1-c1-p4',
  'jtw-s1-c1-p5',
  'jtw-s1-c1-p6',
  'jtw-s1-c1-p7',
  'jtw-s1-c1-p8',
  'jtw-s1-c2-p1',
  'jtw-s1-c2-p2',
];

/** C1 + C2-P1/P2 complete — C2-P3 is the unlock frontier. */
const P2_DONE: StoryLineProgress = {
  story_line_id: 'journey-to-the-west-s1',
  completed: PRIOR_PART_IDS.map((partId) => ({
    part_id: partId,
    completed_at: '2026-07-25T04:00:00.000Z',
    evidence: {},
  })),
  unlocked_part_ids: [...PRIOR_PART_IDS, 'jtw-s1-c2-p3'],
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/learn/story/journey-west/jtw-s1-c2-p3']}>
        <Routes>
          <Route
            path="/learn/story/journey-west/:partId"
            element={<JourneyWestC2Part3Page />}
          />
          <Route path="/learn/story/journey-west" element={<div data-testid="jtw-map-stub" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function pickMotive() {
  fireEvent.click(screen.getByRole('button', { name: /他要把每一段的停点讲清楚/ }));
}

/** Tap the route cards into the exact 圆叶→尖叶→长叶 (右2→上1→右2) order. */
function orderRouteCards() {
  fireEvent.click(screen.getByRole('button', { name: /圆叶——右2/ }));
  fireEvent.click(screen.getByRole('button', { name: /尖叶——上1/ }));
  fireEvent.click(screen.getByRole('button', { name: /长叶——右2/ }));
}

/** Place the three prediction footprints on the leaf stops in visit order. */
function placeFootprints() {
  fireEvent.click(screen.getByRole('button', { name: '格子 横4 竖8' }));
  fireEvent.click(screen.getByRole('button', { name: '格子 横4 竖7' }));
  fireEvent.click(screen.getByRole('button', { name: '格子 横6 竖7' }));
}

/** Toggle the comparison and answer both comparison questions correctly. */
function compareVersions() {
  fireEvent.click(screen.getByTestId('jtw-c2p3-compare-toggle'));
  fireEvent.click(screen.getByRole('button', { name: /冲出湿石路，落在水帘入口下面的水面上/ }));
  fireEvent.click(screen.getByRole('button', { name: /第二段——应该上1跳上高台/ }));
}

beforeEach(() => {
  fetchProgress.mockResolvedValue(P2_DONE);
  completePart.mockResolvedValue({
    part_id: 'jtw-s1-c2-p3',
    completed_at: '2026-07-25T05:00:00.000Z',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JourneyWestC2Part3Page · C2-P3 三段湿石路', () => {
  it('ships the full Story Screen 3 text, the leaf-marked stage and the read-only target chain', async () => {
    // Contract: the target order is exactly 圆叶→尖叶→长叶 (右2→上1→右2) and
    // the read-only chain matches the scene spec op by op.
    expect(C2_P3_ROUTE_CARD_ORDER).toEqual(['card-round-leaf', 'card-point-leaf', 'card-long-leaf']);
    expect(C2_P3_TARGET_CHAIN.map((block) => `${block.op}${block.n ?? ''}`)).toEqual([
      'when_flag',
      'move_right2',
      'move_up1',
      'move_right2',
      'end',
    ]);
    // 两版终点不同：the wrong version halts in the water, never at the entrance.
    const wrongFinal = C2_P3_WRONG_VERSION_STOPS[C2_P3_WRONG_VERSION_STOPS.length - 1].cell;
    expect(wrongFinal).not.toBe(C2_P3_TARGET_STOP_CELLS[C2_P3_TARGET_STOP_CELLS.length - 1]);

    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p3')).toBeInTheDocument());
    for (const paragraph of C2_P3_STORY_BEFORE) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(screen.getByTestId('jtw-c2p3-story')).toHaveTextContent('Move Right 2');
    // Curtain still closed, monkey at the 2/8 start, three leaf stops unlit.
    expect(screen.getByTestId('jtw-c2p3-cave-mouth')).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('jtw-c2p3-stone-monkey')).toHaveAttribute('data-gx', '2');
    expect(screen.getByTestId('jtw-c2p3-stone-monkey')).toHaveAttribute('data-gy', '8');
    const leaves = screen.getByTestId('jtw-c2p3-leaves').querySelectorAll('[data-stop]');
    expect(Array.from(leaves).map((leaf) => leaf.getAttribute('data-stop'))).toEqual([
      '4-8',
      '4-7',
      '6-7',
    ]);
    for (const leaf of Array.from(leaves)) {
      expect(leaf).toHaveAttribute('data-lit', 'false');
    }
    // The read-only chain renders as blocks; the grid waits for the card order.
    expect(screen.getByTestId('jtw-c2p3-target-chain')).toBeInTheDocument();
    expect(screen.queryByTestId('jtw-c2p3-grid')).not.toBeInTheDocument();
  });

  it('blocks kids who have not finished C2-P2 (server unlock is the truth)', async () => {
    fetchProgress.mockResolvedValue({
      ...P2_DONE,
      completed: P2_DONE.completed.slice(0, 9),
      unlocked_part_ids: PRIOR_PART_IDS,
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p3-locked')).toBeInTheDocument());
    expect(screen.queryByTestId('jtw-part-c2-p3')).not.toBeInTheDocument();
  });

  it('opens the footprint grid ONLY for the exact 圆叶→尖叶→长叶 order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p3')).toBeInTheDocument());
    pickMotive();

    // Wrong order: 长叶 first — no grid, continue locked.
    fireEvent.click(screen.getByRole('button', { name: /长叶——右2/ }));
    fireEvent.click(screen.getByRole('button', { name: /尖叶——上1/ }));
    fireEvent.click(screen.getByRole('button', { name: /圆叶——右2/ }));
    expect(screen.queryByTestId('jtw-c2p3-grid')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p3-continue')).toBeDisabled();

    // Replayable tap-to-order: clear and re-order into the target route.
    fireEvent.click(screen.getByRole('button', { name: '重新排' }));
    orderRouteCards();
    expect(screen.getByTestId('jtw-c2p3-grid')).toBeInTheDocument();
  });

  it('hints on wrong footprints and passes only the three leaf stops in visit order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p3')).toBeInTheDocument());
    pickMotive();
    orderRouteCards();

    // Wrong prediction: second footprint dropped into the water at 6-8.
    fireEvent.click(screen.getByRole('button', { name: '格子 横4 竖8' }));
    fireEvent.click(screen.getByRole('button', { name: '格子 横6 竖8' }));
    fireEvent.click(screen.getByRole('button', { name: '格子 横6 竖7' }));
    expect(screen.getByRole('status')).toHaveTextContent('按到达顺序放三个脚印');
    expect(screen.queryByTestId('jtw-c2p3-compare')).not.toBeInTheDocument();
    expect(screen.getByTestId('jtw-c2p3-continue')).toBeDisabled();

    // Replay the footprints onto the leaf stops in order — comparison opens.
    fireEvent.click(screen.getByRole('button', { name: '重放脚印' }));
    placeFootprints();
    expect(screen.getByTestId('jtw-c2p3-compare')).toBeInTheDocument();
  });

  it('shows the wrong version stopping in the water (different end) and gates on the deviation', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-part-c2-p3')).toBeInTheDocument());
    pickMotive();
    orderRouteCards();
    placeFootprints();

    // Target version: three stops ending at the entrance 6-7.
    const track = screen.getByTestId('jtw-c2p3-compare-track');
    expect(track).toHaveAttribute('data-version', 'target');
    expect(
      Array.from(track.querySelectorAll('[data-stop]')).map((s) => s.getAttribute('data-stop')),
    ).toEqual(['4-8', '4-7', '6-7']);

    // 上1 moved last: the second segment leaves the stones and halts at 6-8.
    fireEvent.click(screen.getByTestId('jtw-c2p3-compare-toggle'));
    expect(screen.getByTestId('jtw-c2p3-compare-track')).toHaveAttribute('data-version', 'wrong');
    expect(
      Array.from(
        screen.getByTestId('jtw-c2p3-compare-track').querySelectorAll('[data-stop]'),
      ).map((s) => s.getAttribute('data-stop')),
    ).toEqual(['4-8', '6-8']);
    expect(screen.getByTestId('jtw-c2p3-compare-track')).toHaveTextContent('到不了水帘入口');

    // Wrong deviation pick → retry hint, continue stays locked.
    fireEvent.click(screen.getByRole('button', { name: /冲出湿石路，落在水帘入口下面的水面上/ }));
    fireEvent.click(screen.getByRole('button', { name: /第一段——两版从第一步就不一样/ }));
    expect(screen.getByRole('status')).toHaveTextContent('最早不一样的是哪一段');
    expect(screen.getByTestId('jtw-c2p3-continue')).toBeDisabled();
    expect(screen.queryByTestId('jtw-c2p3-resolved')).not.toBeInTheDocument();

    // The grounded second-segment answer resolves the part.
    fireEvent.click(screen.getByRole('button', { name: /第二段——应该上1跳上高台/ }));
    expect(screen.getByTestId('jtw-c2p3-resolved')).toHaveTextContent('水帘仍然合着');
    const litLeaves = screen.getByTestId('jtw-c2p3-leaves').querySelectorAll('[data-lit="true"]');
    expect(litLeaves).toHaveLength(3);
    expect(screen.getByTestId('jtw-c2p3-continue')).toBeEnabled();
  });

  it('persists order + wrong-version stop + deviation on continue and unlocks only C2-P4', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('jtw-c2p3-continue')).toBeInTheDocument());
    pickMotive();
    orderRouteCards();
    placeFootprints();
    compareVersions();
    fireEvent.click(screen.getByTestId('jtw-c2p3-continue'));

    await waitFor(() => expect(completePart).toHaveBeenCalledTimes(1));
    // Planning-only evidence: no build_project and no real project marker.
    expect(completePart).toHaveBeenCalledWith('journey-to-the-west-s1', 'jtw-s1-c2-p3', {
      schema_version: 1,
      selections: {
        motive: ['explain-each-stop'],
        route_card_order: ['card-round-leaf', 'card-point-leaf', 'card-long-leaf'],
        footprint_stops: ['4-8', '4-7', '6-7'],
        wrong_version_stop: ['wrong-second-into-water'],
        first_deviation: ['deviation-second-segment'],
      },
    });
    await waitFor(() => expect(screen.getByTestId('jtw-map-stub')).toBeInTheDocument());
  });

  it('restores the saved route evidence after a refresh', async () => {
    fetchProgress.mockResolvedValue({
      ...P2_DONE,
      completed: [
        ...P2_DONE.completed,
        {
          part_id: 'jtw-s1-c2-p3',
          completed_at: '2026-07-25T05:00:00.000Z',
          evidence: {
            schema_version: 1,
            selections: {
              motive: ['explain-each-stop'],
              route_card_order: ['card-round-leaf', 'card-point-leaf', 'card-long-leaf'],
              footprint_stops: ['4-8', '4-7', '6-7'],
              wrong_version_stop: ['wrong-second-into-water'],
              first_deviation: ['deviation-second-segment'],
            },
          },
        },
      ],
      unlocked_part_ids: [...P2_DONE.unlocked_part_ids, 'jtw-s1-c2-p4'],
    });
    renderPage();

    await waitFor(() => expect(screen.getByTestId('jtw-c2p3-resolved')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /他要把每一段的停点讲清楚/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The saved order re-renders with position badges; footprints restore too.
    expect(screen.getByRole('button', { name: /1.*圆叶——右2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3.*长叶——右2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '格子 横4 竖8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '格子 横6 竖7' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('jtw-c2p3-continue')).toBeEnabled();
  });
});
