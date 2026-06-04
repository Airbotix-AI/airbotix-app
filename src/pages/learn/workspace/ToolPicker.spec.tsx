import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToolPicker } from './ToolPicker';

describe('ToolPicker', () => {
  it('renders every tool and reports the one that was picked', async () => {
    const onChange = vi.fn();
    render(<ToolPicker value="chat" onChange={onChange} />);

    expect(screen.getByRole('button', { name: /Chat/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Video/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Image/ }));
    expect(onChange).toHaveBeenCalledWith('image');
  });
});
