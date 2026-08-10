// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KidAvatarPicker } from './KidAvatarPicker';

describe('KidAvatarPicker', () => {
  it('shows all 26 choices and reports the selected stable id', () => {
    const onChange = vi.fn();
    render(<KidAvatarPicker value="robot_friend" onChange={onChange} />);

    expect(screen.getAllByRole('button')).toHaveLength(26);
    expect(
      screen.getByRole('button', { name: 'Choose Robot Friend' }).getAttribute('aria-pressed'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Choose Story Creator' }));
    expect(onChange).toHaveBeenCalledWith('story_creator');
  });

  it('warns without blocking when a sibling already uses the selected avatar', () => {
    render(
      <KidAvatarPicker
        value="space_cat"
        usedAvatarIds={['space_cat']}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText(/Another kid in this family/)).toBeTruthy();
    expect(
      screen
        .getAllByRole('button', { name: 'Choose Space Cat' })
        .some((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toBe(true);
  });

  it('uses the wider profile layout only when requested', () => {
    const { container } = render(
      <KidAvatarPicker value="robot_friend" wide onChange={() => undefined} />,
    );

    expect(container.querySelector('.lg\\:grid-cols-8')).toBeTruthy();
    expect(container.querySelector('.xl\\:grid-cols-10')).toBeTruthy();
  });
});
