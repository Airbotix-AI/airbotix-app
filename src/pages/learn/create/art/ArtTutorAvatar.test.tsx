// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import { ART_TUTOR_TEMP_NAME, ArtTutorAvatar } from './ArtTutorAvatar';

describe('ArtTutorAvatar', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('uses the approved Airbotix robot-cat pose pack and keeps its name explicitly temporary', () => {
    render(<ArtTutorAvatar state="idle" />);

    expect(screen.getByTestId('art-tutor')).toHaveAttribute('data-name-is-temporary', 'true');
    expect(
      screen.getByAltText(`${ART_TUTOR_TEMP_NAME}, the Airbotix robot-cat art tutor`),
    ).toHaveAttribute('src', '/media/art-tutor/idle.webp');
    expect(screen.getByTestId('art-tutor-image-idle')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('art-tutor-image-thinking')).toHaveAttribute('data-active', 'false');
    expect(screen.getByText('Ready when you are')).toBeInTheDocument();
  });

  it('loops through visible micro-poses while the tutor is idle', () => {
    vi.useFakeTimers();
    render(<ArtTutorAvatar state="idle" />);

    expect(screen.getByTestId('art-tutor')).toHaveAttribute('data-motion', 'looping');
    expect(screen.getByTestId('art-tutor')).toHaveAttribute('data-pose', 'idle');

    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByTestId('art-tutor')).toHaveAttribute('data-pose', 'looking');
    expect(screen.getByTestId('art-tutor-image-looking')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('art-tutor-scan')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2800));
    expect(screen.getByTestId('art-tutor')).toHaveAttribute('data-pose', 'thinking');
    expect(screen.getByTestId('art-tutor-image-thinking')).toHaveAttribute('data-active', 'true');
  });

  it('cross-fades to the image assigned to each observable tutor state', () => {
    const { rerender } = render(<ArtTutorAvatar state="thinking" />);

    expect(screen.getByTestId('art-tutor-image-thinking')).toHaveAttribute('data-active', 'true');
    expect(
      screen.getByAltText(`${ART_TUTOR_TEMP_NAME}, the Airbotix robot-cat art tutor`),
    ).toHaveAttribute('src', '/media/art-tutor/thinking.webp');

    rerender(<ArtTutorAvatar state="looking" />);

    expect(screen.getByTestId('art-tutor-image-thinking')).toHaveAttribute('data-active', 'false');
    expect(screen.getByTestId('art-tutor-image-looking')).toHaveAttribute('data-active', 'true');
    expect(
      screen.getByAltText(`${ART_TUTOR_TEMP_NAME}, the Airbotix robot-cat art tutor`),
    ).toHaveAttribute('src', '/media/art-tutor/looking.webp');
    expect(screen.getByTestId('art-tutor-scan')).toBeInTheDocument();
    expect(screen.getByText('Looking closely at your canvas')).toBeInTheDocument();
  });

  it('collapses to the dedicated head avatar without duplicate tutor copy', () => {
    render(<ArtTutorAvatar state="thinking" compact />);

    expect(
      screen.getByAltText(`${ART_TUTOR_TEMP_NAME}, the Airbotix robot-cat art tutor`),
    ).toHaveAttribute('src', '/media/art-tutor/compact.webp');
    expect(screen.getByTestId('art-tutor-image-compact')).toHaveClass('art-tutor-sprite--compact');
    expect(screen.queryByText(ART_TUTOR_TEMP_NAME)).toBeNull();
    expect(screen.queryByText('Thinking about your idea')).toBeNull();
  });
});
