// @vitest-environment jsdom
// The Game Guide's interactive diagrams (D-HELP-08): they must render in the
// captioned figure AND respond to the kid (so they actually teach, not just sit
// there). Static keys render their art; an unknown key degrades to the caption.
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HelpDiagram } from './helpDiagrams';

afterEach(cleanup);

describe('HelpDiagram', () => {
  it('renders the captioned figure with the accessible label', () => {
    render(<HelpDiagram diagram="game-loop" alt="the loop" />);
    expect(screen.getByTestId('help-diagram-game-loop')).toHaveAttribute('aria-label', 'the loop');
  });

  it('an unknown key degrades to just the caption (no crash)', () => {
    expect(() => render(<HelpDiagram diagram="does-not-exist" alt="fallback caption" />)).not.toThrow();
    expect(screen.getByText('fallback caption')).toBeTruthy();
  });

  it('coords-explorer responds: toggling 3D reveals the z control + a z readout', () => {
    render(<HelpDiagram diagram="coords-explorer" alt="coords" />);
    // 2D first: no z readout in the position line.
    expect(screen.getByText(/position = \(\d+, \d+\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '3D' }));
    // Now a 3-number position (x, y, z) is shown.
    expect(screen.getByText(/position = \(\d+, \d+, \d+\)/)).toBeTruthy();
  });

  it('game-loop-stepper advances the frame on Step', () => {
    render(<HelpDiagram diagram="game-loop-stepper" alt="loop" />);
    expect(screen.getByText(/frame 1 · Input/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Step/ }));
    expect(screen.getByText(/frame 1 · Update/)).toBeTruthy();
  });

  it('scene-tree expands/collapses a node', () => {
    render(<HelpDiagram diagram="scene-tree" alt="tree" />);
    // "Coins" is collapsed by default (depth ≥ 1) — its children are hidden.
    expect(screen.queryByRole('button', { name: /coin 1/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Coins/ }));
    expect(screen.getByRole('button', { name: /coin 1/ })).toBeTruthy();
  });
});
