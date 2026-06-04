import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IncidentBanner } from './IncidentBanner';

// Capture the ws handler so the test can drive an incident through it.
const captured = vi.hoisted(() => ({ handler: null as ((p: unknown) => void) | null }));
vi.mock('@/lib/useWsEvent', () => ({
  useWsEvent: (_event: string, cb: (p: unknown) => void) => {
    captured.handler = cb;
  },
}));

const incident = {
  id: 'inc1',
  kind: 'wallet_anomaly',
  severity: 'high',
  title: 'Spending spiked overnight',
  opened_at: '2026-06-01T10:00:00Z',
};

function renderBanner() {
  return render(
    <MemoryRouter>
      <IncidentBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  captured.handler = null;
});

describe('IncidentBanner', () => {
  it('renders nothing until a high-severity incident opens', () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('surfaces the incident, then dismisses it', async () => {
    renderBanner();
    act(() => captured.handler?.(incident));

    expect(screen.getByText('Unusual Stars spending')).toBeInTheDocument(); // KIND_LABEL
    expect(screen.getByText('Spending spiked overnight')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Dismiss alert/ }));
    expect(screen.queryByText('Unusual Stars spending')).not.toBeInTheDocument();
  });
});
