// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ChallengeOrientationVideo } from './ChallengeOrientationVideo';

const URL = 'https://app.airbotix.ai/challenge-media/creative-challenge-how-it-works-v1.mp4';
const POSTER = 'https://app.airbotix.ai/challenge-media/creative-challenge-how-it-works-v1-poster.jpg';

afterEach(() => cleanup());

describe('ChallengeOrientationVideo (entrant-onboarding-prd §13)', () => {
  it('renders nothing when the edition carries no video', () => {
    // An edition without a video is a NORMAL state, not an error. No
    // placeholder, no empty player, no "coming soon".
    const { container } = render(<ChallengeOrientationVideo url={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('plays from the edition’s url, with its poster', () => {
    render(<ChallengeOrientationVideo url={URL} poster={POSTER} />);

    const video = screen.getByTestId('challenge-orientation-video');
    expect(video).toHaveAttribute('poster', POSTER);
    expect(video.querySelector('source')).toHaveAttribute('src', URL);
    expect(video.querySelector('source')).toHaveAttribute('type', 'video/mp4');
  });

  it('never autoplays and is never muted decoration — a parent chooses to watch', () => {
    render(<ChallengeOrientationVideo url={URL} />);

    const video = screen.getByTestId('challenge-orientation-video');
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).not.toHaveAttribute('muted');
    expect(video).not.toHaveAttribute('loop');
    expect(video).toHaveAttribute('controls');
  });

  it('does not fetch ~20MB until asked: preload is metadata, never auto', () => {
    render(<ChallengeOrientationVideo url={URL} />);

    expect(screen.getByTestId('challenge-orientation-video')).toHaveAttribute(
      'preload',
      'metadata',
    );
  });

  it('plays inline on iOS rather than hijacking the screen fullscreen', () => {
    render(<ChallengeOrientationVideo url={URL} />);
    expect(screen.getByTestId('challenge-orientation-video')).toHaveAttribute('playsinline');
  });

  it('states no duration of its own — the player reports its own length', () => {
    // A hardcoded "3 min" is wrong the first time the video is recut, on a
    // surface nobody would think to re-check.
    const { container } = render(<ChallengeOrientationVideo url={URL} />);
    expect(container.textContent ?? '').not.toMatch(/\b\d+\s*(min|minute|sec|second)/i);
  });

  it('compact starts collapsed and expands to the real player on click', () => {
    render(<ChallengeOrientationVideo url={URL} poster={POSTER} variant="compact" />);

    // Collapsed: no player in the DOM at all, so nothing is fetched for a
    // family who is already building and does not need re-explaining.
    expect(screen.queryByTestId('challenge-orientation-video')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('challenge-orientation-video-expand'));

    expect(screen.getByTestId('challenge-orientation-video')).toBeInTheDocument();
  });

  it('full renders the player immediately, with its framing copy', () => {
    render(<ChallengeOrientationVideo url={URL} variant="full" />);

    expect(screen.getByTestId('challenge-orientation-video')).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video-expand')).not.toBeInTheDocument();
    expect(screen.getByText(/how the creative code challenge works/i)).toBeInTheDocument();
  });

  it('offers a direct link for a browser that cannot play the file', () => {
    render(<ChallengeOrientationVideo url={URL} />);

    const fallback = screen.getByRole('link', { name: /open it directly/i });
    expect(fallback).toHaveAttribute('href', URL);
  });
});
