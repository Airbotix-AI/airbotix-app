import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StudioSetup } from './StudioSetup';
import type { StudioMeta } from './studios';

const studio = {
  id: 'image',
  label: 'Image Maker',
  emoji: '🎨',
  wash: 'bubblegum',
  cost: 4,
  placeholder: 'Draw…',
  setup: [{ key: 'style', kind: 'pick', label: 'Style', options: ['cartoon', 'photo'], defaultIndex: 0 }],
} as unknown as StudioMeta;

describe('StudioSetup', () => {
  it('renders the studio + its setup options and confirms the picked defaults', async () => {
    const onConfirm = vi.fn();
    render(<StudioSetup studio={studio} busy={false} onConfirm={onConfirm} onBack={() => {}} />);

    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cartoon' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Start/ }));
    expect(onConfirm).toHaveBeenCalledWith({ style: 'cartoon' });
  });

  it('calls onBack to pick a different studio', async () => {
    const onBack = vi.fn();
    render(<StudioSetup studio={studio} busy={false} onConfirm={() => {}} onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: /Pick a different studio/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
