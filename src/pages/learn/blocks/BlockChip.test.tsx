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

  it('the number tile is display-only; tapping anywhere (incl. the tile) fires onTap to edit', () => {
    const onTap = vi.fn();
    render(<BlockChip block={{ op: 'wait', n: 5 }} inChain onTap={onTap} />);
    // the number is shown for reference…
    expect(screen.getByTestId('block-num').textContent).toBe('5');
    // …and a tap anywhere (the tile bubbles up to the block) opens the editor
    fireEvent.click(screen.getByTestId('block-num'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('reflects the dragging / removing states as classes', () => {
    render(<BlockChip block={{ op: 'hop', n: 2 }} inChain dragging removing />);
    const btn = screen.getByTestId('block-hop');
    expect(btn.className).toContain('dragging');
    expect(btn.className).toContain('removing');
  });

  it('shows the selected programmable sound as a picture and name', () => {
    const { rerender } = render(<BlockChip block={{ op: 'play_sound', n: 2 }} inChain />);
    expect(screen.getByTestId('block-play_sound').textContent).toContain('🔔Chime');

    rerender(<BlockChip block={{ op: 'play_sound', n: 6 }} inChain />);
    expect(screen.getByTestId('block-play_sound').textContent).toContain('✨Sparkle');
  });

  it('shows the selected numbered note and solfege name', () => {
    const { rerender } = render(<BlockChip block={{ op: 'play_note', n: 1 }} inChain />);
    expect(screen.getByTestId('block-play_note').textContent).toContain('1Do');

    rerender(<BlockChip block={{ op: 'play_note', n: 7 }} inChain />);
    expect(screen.getByTestId('block-play_note').textContent).toContain('7Ti');
  });
});
