// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KidAvatar } from './KidAvatar';

describe('KidAvatar', () => {
  it('uses the stable robot fallback for retired ids and failed image loads', () => {
    render(<KidAvatar avatarId="retired_avatar" nickname="Mia" />);
    const image = screen.getByRole('img', { name: /Mia's avatar/ });
    expect(image.getAttribute('src')).toBe('/avatars/v1/robot-friend.webp');

    image.setAttribute('src', '/avatars/v1/missing.webp');
    fireEvent.error(image);
    expect(image.getAttribute('src')).toBe('/avatars/v1/robot-friend.webp');
  });
});
