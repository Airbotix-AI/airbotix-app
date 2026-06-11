// @vitest-environment jsdom
// Tour overlay (try-demo-mode-prd D-DEMO-05): step card, progress dots,
// Next/Back, always-visible Skip; modal intro dims the studio, later steps
// float so the real studio stays interactive.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DemoTourOverlay, type DemoTourStep } from './DemoTourOverlay';

afterEach(cleanup);

const STEPS: DemoTourStep[] = [
  { title: 'Intro', body: 'Welcome', nextLabel: '▶ Start', modal: true },
  { title: 'Middle', body: 'Do a thing' },
  { title: 'Last', body: 'Bye', nextLabel: 'Finish ✨' },
];

function setup(step = 0, busy = false) {
  const onNext = vi.fn();
  const onBack = vi.fn();
  const onSkip = vi.fn();
  render(
    <DemoTourOverlay steps={STEPS} step={step} busy={busy} onNext={onNext} onBack={onBack} onSkip={onSkip} />,
  );
  return { onNext, onBack, onSkip };
}

describe('DemoTourOverlay', () => {
  it('renders the step card with progress dots and the custom next label', () => {
    setup(0);
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Intro');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getAllByTestId('tour-dot')).toHaveLength(3);
    expect(screen.getByTestId('tour-next')).toHaveTextContent('▶ Start');
  });

  it('dims behind a modal step only', () => {
    setup(0);
    expect(screen.getByTestId('demo-tour-backdrop')).toBeInTheDocument();
  });

  it('floats (no backdrop) on non-modal steps so the studio stays usable', () => {
    setup(1);
    expect(screen.queryByTestId('demo-tour-backdrop')).not.toBeInTheDocument();
  });

  it('fires Next / Back / Skip; Back is hidden on the first step', () => {
    const first = setup(0);
    expect(screen.queryByTestId('tour-back')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tour-next'));
    fireEvent.click(screen.getByTestId('tour-skip'));
    expect(first.onNext).toHaveBeenCalledTimes(1);
    expect(first.onSkip).toHaveBeenCalledTimes(1);
  });

  it('Back fires from a later step', () => {
    const { onBack } = setup(1);
    fireEvent.click(screen.getByTestId('tour-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('disables Next while a scripted turn is in flight', () => {
    const { onNext } = setup(1, true);
    const next = screen.getByTestId('tour-next');
    expect(next).toBeDisabled();
    expect(next).toHaveTextContent('Airo is working…');
    fireEvent.click(next);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('renders nothing for an out-of-range step', () => {
    render(
      <DemoTourOverlay steps={STEPS} step={99} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.queryByTestId('demo-tour')).not.toBeInTheDocument();
  });

  it('places the card per the step placement hint (default: center modal / bottom-right floating)', () => {
    const steps: DemoTourStep[] = [
      { title: 'A', body: 'a', modal: true },
      { title: 'B', body: 'b' },
      { title: 'C', body: 'c', placement: 'beside-input' },
    ];
    const { rerender } = render(
      <DemoTourOverlay steps={steps} step={0} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'center');
    rerender(
      <DemoTourOverlay steps={steps} step={1} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'bottom-right');
    rerender(
      <DemoTourOverlay steps={steps} step={2} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'beside-input');
  });

  it('hides "Skip tour" on a hideSkip step (the mandatory landing step)', () => {
    const steps: DemoTourStep[] = [{ title: 'A', body: 'a', hideSkip: true }, { title: 'B', body: 'b' }];
    const { rerender } = render(
      <DemoTourOverlay steps={steps} step={0} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.queryByTestId('tour-skip')).not.toBeInTheDocument();
    rerender(
      <DemoTourOverlay steps={steps} step={1} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-skip')).toBeInTheDocument();
  });

  it('keeps the Next pill inside the card (truncates instead of overflowing)', () => {
    setup(1);
    const next = screen.getByTestId('tour-next');
    expect(next.className).toContain('max-w-full');
    expect(next.className).toContain('truncate');
    expect(next.className).not.toContain('whitespace-nowrap'); // truncate covers it
  });
});
