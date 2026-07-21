// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JourneyC1Part1Guide } from './JourneyC1Part1Guide';

describe('JourneyC1Part1Guide', () => {
  it('requires three real clues, the classic order, and an evidence-based prediction', () => {
    const onComplete = vi.fn();
    render(
      <JourneyC1Part1Guide completed={false} saving={false} onComplete={onComplete} />,
    );

    expect(screen.getByAltText('Stone Monkey')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /look at flower-fruit mountain/i }));
    fireEvent.click(screen.getByTestId('jtw-clue-peach-tree'));
    expect(screen.getByTestId('jtw-p1-clue-count')).toHaveTextContent('0/3');

    fireEvent.click(screen.getByTestId('jtw-clue-warm-light'));
    fireEvent.click(screen.getByTestId('jtw-clue-bright-crack'));
    fireEvent.click(screen.getByTestId('jtw-clue-soft-sound'));
    fireEvent.click(screen.getByRole('button', { name: /read the classic card/i }));

    fireEvent.click(screen.getByTestId('jtw-order-sun-wukong'));
    fireEvent.click(screen.getByTestId('jtw-order-stone-monkey'));
    expect(screen.getByText(/has not received the name/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('jtw-order-stone-monkey'));
    fireEvent.click(screen.getByTestId('jtw-order-sun-wukong'));
    fireEvent.click(screen.getByRole('button', { name: /make a prediction/i }));

    fireEvent.click(screen.getByTestId('jtw-prediction-guess'));
    expect(screen.getByTestId('jtw-p1-complete-button')).toBeDisabled();
    fireEvent.click(screen.getByTestId('jtw-prediction-evidence'));
    fireEvent.click(screen.getByTestId('jtw-p1-complete-button'));

    expect(onComplete).toHaveBeenCalledWith({
      clues: ['warm-light', 'bright-crack', 'soft-sound'],
      classicOrder: ['stone-monkey', 'sun-wukong'],
      prediction: 'stone-monkey-because-clues',
    });
  });

  it('shows the saved story continuation without a chapter celebration', () => {
    render(<JourneyC1Part1Guide completed saving={false} onComplete={vi.fn()} />);

    expect(screen.getByTestId('jtw-p1-saved-proof')).toHaveTextContent('Saved on the server');
    expect(screen.getByText(/soft thump comes from inside the stone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /part 2 unlocked/i })).toBeDisabled();
  });
});
