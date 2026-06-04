import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PagePlaceholder } from './PagePlaceholder';

describe('PagePlaceholder', () => {
  it('renders the title, description and the PRD reference', () => {
    render(<PagePlaceholder title="Wallet" prdRef="parent-portal-prd §4.2" description="Top up Stars." />);
    expect(screen.getByRole('heading', { name: 'Wallet' })).toBeInTheDocument();
    expect(screen.getByText('Top up Stars.')).toBeInTheDocument();
    expect(screen.getByText('Not yet implemented')).toBeInTheDocument();
    expect(screen.getByText(/parent-portal-prd §4\.2/)).toBeInTheDocument();
  });
});
