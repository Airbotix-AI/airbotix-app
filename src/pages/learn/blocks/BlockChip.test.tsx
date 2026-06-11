// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockChip } from './BlockChip';

afterEach(cleanup);

describe('BlockChip', () => {
  it('a plain tap fires onTap (edit/run) — NOT a delete, and forwards pointer handlers', () => {
    const onTap = vi.fn();
    const onDown = vi.fn();
    render(
      <BlockChip
        block={{ op: 'move_right', n: 3 }}
        inChain
        onTap={onTap}
        onPointerDown={onDown}
      />,
    );
    const btn = screen.getByTestId('block-move_right');
    fireEvent.click(btn);
    expect(onTap).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(btn);
    expect(onDown).toHaveBeenCalledTimes(1);
  });

  it('tapping the number tile cycles the param and does not bubble to onTap', () => {
    const onTap = vi.fn();
    const onTapNum = vi.fn();
    render(
      <BlockChip block={{ op: 'wait', n: 5 }} inChain onTap={onTap} onTapNum={onTapNum} />,
    );
    fireEvent.click(screen.getByTestId('block-num'));
    expect(onTapNum).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled(); // stopPropagation — the block tap never fires
  });

  it('reflects the dragging / removing states as classes', () => {
    render(<BlockChip block={{ op: 'hop', n: 2 }} inChain dragging removing />);
    const btn = screen.getByTestId('block-hop');
    expect(btn.className).toContain('dragging');
    expect(btn.className).toContain('removing');
  });
});
