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

describe('DemoTourOverlay spotlight', () => {
  const SPOT_STEPS: DemoTourStep[] = [
    { title: 'Intro', body: 'Welcome', modal: true },
    { title: 'Look here', body: 'Press the button', spotlight: '#spot-target' },
    { title: 'No spot', body: 'Nothing highlighted' },
  ];

  function setupSpot(step: number, extra: { darkUi?: boolean } = {}) {
    const target = document.createElement('button');
    target.id = 'spot-target';
    target.getBoundingClientRect = () =>
      ({ left: 100, top: 50, right: 220, bottom: 90, width: 120, height: 40 }) as DOMRect;
    document.body.appendChild(target);
    render(
      <DemoTourOverlay
        steps={SPOT_STEPS}
        step={step}
        darkUi={extra.darkUi}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    return target;
  }

  afterEach(() => {
    document.getElementById('spot-target')?.remove();
  });

  it('mounts at full viewport then shrinks onto the target (rounded, scrim via shadow)', async () => {
    setupSpot(1);
    const ring = screen.getByTestId('tour-spotlight-ring');
    // mount frame = full viewport (the dim closes in from the whole screen)
    expect(ring.style.left).toBe('0px');
    expect(ring.className).toContain('rounded-');
    expect(ring.className).toContain('shadow-spotlight-scrim');
    // after the first RAF measure: the padded target rect
    await screen.findByTestId('tour-spotlight');
    await vi.waitFor(() => expect(ring.style.left).toBe('92px')); // 100 - 8 pad
    expect(ring.style.top).toBe('42px');
    expect(ring.style.width).toBe('136px'); // 120 + 2*8
    expect(ring.style.height).toBe('56px');
  });

  it('is purely visual — every spotlight layer is pointer-events-none', () => {
    setupSpot(1);
    expect(screen.getByTestId('tour-spotlight').className).toContain('pointer-events-none');
    expect(screen.getByTestId('tour-spotlight-ring').className).toContain('pointer-events-none');
  });

  it('renders no mask on steps without a spotlight or on modal steps', () => {
    setupSpot(2);
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
    cleanup();
    setupSpot(0);
    expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
  });

  it('removes the mask when the selector matches nothing', async () => {
    document.getElementById('spot-target')?.remove();
    render(
      <DemoTourOverlay steps={SPOT_STEPS} step={1} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    await vi.waitFor(() =>
      expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument(),
    );
  });

  it('dark UIs get the DE-EMPHASIS mask (grayscale+dim+blur outside a rounded hole)', async () => {
    setupSpot(1, { darkUi: true });
    const dim = await screen.findByTestId('tour-spotlight-dim');
    expect(dim.className).toContain('backdrop-grayscale');
    expect(dim.className).toContain('backdrop-brightness');
    expect(dim.className).toContain('backdrop-blur');
    expect(dim.style.clipPath).toContain('evenodd'); // the rounded cut-out
    // the ring carries no scrim shadow in dark — the dim layer does the work
    expect(screen.getByTestId('tour-spotlight-ring').className).not.toContain('shadow-spotlight-scrim');
  });

  it('light UIs keep the ink scrim shadow and no dim layer', () => {
    setupSpot(1);
    expect(screen.getByTestId('tour-spotlight-ring').className).toContain('shadow-spotlight-scrim');
    expect(screen.queryByTestId('tour-spotlight-dim')).not.toBeInTheDocument();
  });

  it('the modal backdrop follows the studio theme too', () => {
    const steps: DemoTourStep[] = [{ title: 'Intro', body: 'Welcome', modal: true }];
    const { rerender } = render(
      <DemoTourOverlay steps={steps} step={0} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('demo-tour-backdrop').className).toContain('bg-ink/60');
    rerender(
      <DemoTourOverlay steps={steps} step={0} darkUi onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('demo-tour-backdrop').className).toContain('bg-black/70');
  });
});

describe('DemoTourOverlay spotlight override (in-flight chat focus)', () => {
  const STEPS_NO_SPOT: DemoTourStep[] = [
    { title: 'Intro', body: 'Welcome', modal: true },
    { title: 'Game card', body: 'Look at the game', spotlight: '#game-target' },
  ];

  function addTarget(id: string) {
    const el = document.createElement('div');
    el.id = id;
    el.getBoundingClientRect = () =>
      ({ left: 10, top: 10, right: 110, bottom: 60, width: 100, height: 50 }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }

  afterEach(() => {
    document.getElementById('game-target')?.remove();
    document.getElementById('chat-target')?.remove();
  });

  it('the override wins over the card spotlight while set, and releases cleanly', async () => {
    addTarget('game-target');
    addTarget('chat-target');
    const { rerender } = render(
      <DemoTourOverlay steps={STEPS_NO_SPOT} step={1} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    // engine sets the override the moment a chat-bound Next fires
    rerender(
      <DemoTourOverlay
        steps={STEPS_NO_SPOT}
        step={1}
        spotlightOverride="#chat-target"
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    await vi.waitFor(() => {
      // chat-target rect (left 10 - pad 8 = 2px would equal game's… use width)
      expect(screen.getByTestId('tour-spotlight-ring').style.width).toBe('116px');
    });
    // released (next card lands) → back to the card's own spotlight
    rerender(
      <DemoTourOverlay
        steps={STEPS_NO_SPOT}
        step={1}
        spotlightOverride={null}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    expect(screen.getByTestId('tour-spotlight')).toBeInTheDocument();
  });

  it('shows a spotlight even on a card without one while the override is set', async () => {
    addTarget('chat-target');
    render(
      <DemoTourOverlay
        steps={[{ title: 'No spot', body: 'plain' }]}
        step={0}
        spotlightOverride="#chat-target"
        onNext={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
      />,
    );
    await screen.findByTestId('tour-spotlight');
  });
});

describe('split-layout placement remap', () => {
  const CARD: DemoTourStep[] = [{ title: 'Chat card', body: 'b', placement: 'bottom-left' }];

  it('bottom-left cards move to top-left in split (never on the chat tail)', () => {
    render(
      <DemoTourOverlay steps={CARD} step={0} splitLayout onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-card').getAttribute('data-placement')).toBe('top-left');
  });

  it('window mode keeps bottom-left', () => {
    render(
      <DemoTourOverlay steps={CARD} step={0} onNext={vi.fn()} onBack={vi.fn()} onSkip={vi.fn()} />,
    );
    expect(screen.getByTestId('tour-card').getAttribute('data-placement')).toBe('bottom-left');
  });
});
