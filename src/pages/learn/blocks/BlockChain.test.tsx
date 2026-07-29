// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockChain, type ChainContext } from './BlockChain';
import type { DropHit } from './blockDropZones';
import type { Block } from './blocksModel';

afterEach(cleanup);

const PROGRAM: Block[] = [
  { op: 'when_flag' },
  { op: 'move_right', n: 2 },
  { op: 'if_touching', text: 'star', body: [{ op: 'hop', n: 2 }] },
];

function ctxFor(dropTarget: DropHit | null): ChainContext {
  return {
    scriptId: 's1',
    activeKeys: new Set<string>(),
    dragging: null,
    dropTarget,
    ifBodyTarget: null,
    setIfBodyTarget: vi.fn(),
    onBlockDown: vi.fn(),
    onBlockMove: vi.fn(),
    onBlockUp: vi.fn(),
    onBlockCancel: vi.fn(),
    onBlockTap: vi.fn(),
    isA2DirectionDebug: false,
    missionWrongRunObserved: false,
  };
}

function renderChain(dropTarget: DropHit | null) {
  return render(
    <div data-drop-zone="s1" data-zone-path="" data-testid="track">
      <BlockChain blocks={PROGRAM} zonePath={[]} ctx={ctxFor(dropTarget)} />
    </div>,
  );
}

describe('BlockChain', () => {
  it('publishes a tree path on every block so the drag layer can find slots', () => {
    renderChain(null);
    expect(screen.getByTestId('block-move_right').getAttribute('data-block-path')).toBe('1');
    expect(screen.getByTestId('if-container').getAttribute('data-block-path')).toBe('2');
    expect(screen.getByTestId('block-hop').getAttribute('data-block-path')).toBe('2.0');
  });

  it('registers the If body as its own nested drop zone', () => {
    const { container } = renderChain(null);
    const bodyZone = container.querySelector('.bsx-if-body-chain');
    expect(bodyZone?.getAttribute('data-drop-zone')).toBe('s1');
    expect(bodyZone?.getAttribute('data-zone-path')).toBe('2');
  });

  it('opens a gap at the landing slot on the track, not a hairline', () => {
    const { container } = renderChain({ scriptId: 's1', path: [1] });
    const slot = screen.getByTestId('drop-slot');
    expect(slot.classList.contains('bsx-dropslot')).toBe(true);
    // the gap sits between the trigger and the block it will push along
    const kids = [...container.querySelector('[data-testid="track"]')!.children];
    expect(kids.indexOf(slot)).toBe(1);
    expect(container.querySelector('.bsx-if-body')!.classList.contains('is-target')).toBe(false);
  });

  it('opens the gap INSIDE the If body and lights the body up', () => {
    const { container } = renderChain({ scriptId: 's1', path: [2, 0] });
    const bodyZone = container.querySelector('.bsx-if-body-chain')!;
    expect(bodyZone.contains(screen.getByTestId('drop-slot'))).toBe(true);
    expect(container.querySelector('.bsx-if-body')!.classList.contains('is-target')).toBe(true);
  });

  it('shows an empty If body as a droppable place rather than a blank gap', () => {
    render(
      <div data-drop-zone="s1" data-zone-path="">
        <BlockChain
          blocks={[{ op: 'when_flag' }, { op: 'if_touching', body: [] }]}
          zonePath={[]}
          ctx={ctxFor(null)}
        />
      </div>,
    );
    expect(screen.getByTestId('if-body-empty').textContent).toContain('Drop a block here');
  });

  it('keeps blocks inside the body tappable and draggable', () => {
    const ctx = ctxFor(null);
    render(
      <div data-drop-zone="s1" data-zone-path="">
        <BlockChain blocks={PROGRAM} zonePath={[]} ctx={ctx} />
      </div>,
    );
    screen.getByTestId('block-hop').click();
    expect(ctx.onBlockTap).toHaveBeenCalledWith(expect.anything(), 's1', [2, 0], 'hop');
  });
});
