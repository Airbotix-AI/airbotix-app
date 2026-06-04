import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  it('renders a link that targets the main landmark', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('is visually hidden until focused (sr-only by default)', () => {
    render(<SkipLink />);
    // Hidden in normal flow, revealed only on :focus via focus:not-sr-only.
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveClass('sr-only');
  });
});
