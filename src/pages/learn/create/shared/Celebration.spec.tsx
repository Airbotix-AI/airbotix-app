import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Celebration } from './Celebration';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Celebration', () => {
  it('renders nothing when not shown', () => {
    const { container } = render(<Celebration show={false} message="Done!" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the message and calls onDone after the duration', () => {
    const onDone = vi.fn();
    render(<Celebration show message="Your image is ready!" duration={2500} onDone={onDone} />);
    expect(screen.getByText('Your image is ready!')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onDone).toHaveBeenCalled();
  });
});
