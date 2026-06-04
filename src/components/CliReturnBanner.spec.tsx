import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { CliReturnBanner } from './CliReturnBanner';

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/portal/wallet${search}`]}>
      <CliReturnBanner />
    </MemoryRouter>,
  );
}

describe('CliReturnBanner', () => {
  it('renders nothing without the ?from=cli deep-link param', () => {
    const { container } = renderAt('');
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the CLI return banner with the truncated device id', () => {
    renderAt('?from=cli&device=abcdefghijkl');
    expect(screen.getByText('You opened this from kids-opencode')).toBeInTheDocument();
    expect(screen.getByText(/abcdefgh…/)).toBeInTheDocument();
  });

  it('localises to Chinese when lang=zh-Hans', () => {
    renderAt('?from=cli&lang=zh-Hans');
    expect(screen.getByText('你从 kids-opencode 命令行过来的')).toBeInTheDocument();
  });
});
