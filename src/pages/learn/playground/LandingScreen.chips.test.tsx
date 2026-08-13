// @vitest-environment jsdom
// Starter-chip GROUPING on the landing (owner feedback 2026-08-13): the generic
// landing's mixed game+website hints read as one ambiguous pile — they are now
// two clearly-labelled rows ("Games" / "Websites"). A single-kind landing (the
// explicit Website Studio entry) keeps a flat row with no group label.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingScreen } from './LandingScreen';

describe('LandingScreen starter chip groups', () => {
  afterEach(() => cleanup());
  it('generic landing shows BOTH labelled groups — Games and Websites', () => {
    render(<LandingScreen onSubmit={() => {}} />);
    expect(screen.getByTestId('starter-group-label-game')).toHaveTextContent('Games');
    expect(screen.getByTestId('starter-group-label-website')).toHaveTextContent('Websites');
    // Every chip lives inside its kind's row.
    const gameRow = screen.getByTestId('starter-group-game');
    const siteRow = screen.getByTestId('starter-group-website');
    expect(gameRow).toHaveTextContent('Pong');
    expect(gameRow).toHaveTextContent('Snake');
    expect(siteRow).toHaveTextContent('Cookie shop');
    expect(siteRow).toHaveTextContent('My dog');
    // No cross-contamination: game ideas never sit in the website row.
    expect(siteRow).not.toHaveTextContent('Pong');
    expect(gameRow).not.toHaveTextContent('Cookie shop');
  });

  it('a website chip on the generic landing prefills a website-worded prompt (D-WEB-11 keeps routing)', () => {
    render(<LandingScreen onSubmit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Cookie shop/ }));
    expect(screen.getByRole('textbox', { name: /Describe a game or website/ })).toHaveValue(
      'a cookie shop website',
    );
  });

  it('explicit website landing keeps ONE flat row — no group label', () => {
    render(<LandingScreen onSubmit={() => {}} kind="website" />);
    expect(screen.getByTestId('starter-group-website')).toBeInTheDocument();
    expect(screen.queryByTestId('starter-group-label-website')).not.toBeInTheDocument();
    expect(screen.queryByTestId('starter-group-game')).not.toBeInTheDocument();
  });

  it('chips still submit through the prompt box', () => {
    const onSubmit = vi.fn();
    render(<LandingScreen onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /Pong/ }));
    fireEvent.click(screen.getByRole('button', { name: /Build it/ }));
    expect(onSubmit).toHaveBeenCalledWith('a pong game');
  });
});
