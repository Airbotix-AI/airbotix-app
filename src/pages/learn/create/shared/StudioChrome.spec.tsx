import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StudioChrome } from './StudioChrome';
import { useKidWallet } from './useStudio';

vi.mock('./useStudio', () => ({ useKidWallet: vi.fn() }));

function mockBalance(stars_balance: number) {
  vi.mocked(useKidWallet).mockReturnValue({ data: { stars_balance } } as unknown as ReturnType<typeof useKidWallet>);
}

function renderChrome(cost: number) {
  return render(
    <MemoryRouter>
      <StudioChrome eyebrow="Image Maker" emoji="🎨" title="Image Maker" subtitle="Draw with AI." cost={cost}>
        <div>FORM</div>
      </StudioChrome>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.mocked(useKidWallet).mockReset());

describe('StudioChrome', () => {
  it('renders the studio header, balance and children when affordable', () => {
    mockBalance(10);
    renderChrome(4);
    expect(screen.getByRole('heading', { name: /Image Maker/ })).toBeInTheDocument();
    expect(screen.getByText('10★')).toBeInTheDocument();
    expect(screen.getByText('FORM')).toBeInTheDocument();
    expect(screen.queryByText(/Out of Stars/)).not.toBeInTheDocument();
  });

  it('warns when the kid cannot afford the tool', () => {
    mockBalance(1);
    renderChrome(4);
    expect(screen.getByText(/Out of Stars/)).toBeInTheDocument();
  });
});
