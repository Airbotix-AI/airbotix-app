// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { CreativeSpacesPanel } from './CreativeSpacesPanel';

afterEach(() => cleanup());

describe('CreativeSpacesPanel', () => {
  it('explains the same four live studios to parents and tells them where kids find them', () => {
    render(
      <MemoryRouter>
        <CreativeSpacesPanel />
      </MemoryRouter>,
    );

    const expected = [
      {
        id: 'story-blocks',
        name: 'Story Blocks',
        fit: 'Ages 5–8 who enjoy stories',
        outcome: 'A playable animated story scene',
        step: 'Put colourful blocks in order',
        skill: 'Cause and effect',
        ai: 'There is no AI chat',
        prompt: 'What did you change',
      },
      {
        id: 'creative-code',
        name: 'Creative Code Studio',
        fit: 'Ages 8–14 with ideas for games or interactive projects',
        outcome: 'A playable JavaScript creation',
        step: 'inspect the real JavaScript',
        skill: 'AI judgement',
        ai: 'your child makes the decisions',
        prompt: 'Show me one change you made',
      },
      {
        id: 'art-studio',
        name: 'Art Studio',
        fit: 'AI as a helper, not a replacement',
        outcome: 'Their own drawing plus optional AI-assisted versions',
        step: 'Start on the real canvas',
        skill: 'Creative direction',
        ai: 'Drawing is free',
        prompt: 'Which parts did you make',
      },
      {
        id: 'music-stage',
        name: 'Music Stage',
        fit: 'even if they have never learned an instrument',
        outcome: 'A playable multi-track song',
        step: 'explore the instruments and track lanes',
        skill: 'Mood and genre',
        ai: 'Composing or re-generating music uses Stars',
        prompt: 'What did you change to make the song feel different',
      },
    ];
    for (const { id, name, fit, outcome, step, skill, ai, prompt } of expected) {
      const card = screen.getByTestId(`parent-studio-${id}`);
      expect(card).toHaveTextContent(name);
      expect(card).toHaveTextContent('Learn home →');
      expect(card).toHaveTextContent(fit);
      expect(card).toHaveTextContent(outcome);

      const guideButton = within(card).getByRole('button', { name: 'See the parent guide' });
      expect(guideButton).toHaveAttribute('aria-expanded', 'false');
      expect(card).not.toHaveTextContent(step);

      fireEvent.click(guideButton);
      expect(guideButton).toHaveAttribute('aria-expanded', 'true');
      expect(card).toHaveTextContent(step);
      expect(card).toHaveTextContent(skill);
      expect(card).toHaveTextContent(ai);
      expect(card).toHaveTextContent(prompt);
    }

    expect(screen.getAllByTestId('parent-guide-content')).toHaveLength(4);
    expect(screen.getByText(/inside your child's Learn account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open My Family →' })).toHaveAttribute(
      'href',
      '/portal/family',
    );
  });

  it('does not advertise paused studios as available', () => {
    render(
      <MemoryRouter>
        <CreativeSpacesPanel />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Voice Booth')).not.toBeInTheDocument();
    expect(screen.queryByText('Video Studio')).not.toBeInTheDocument();
  });

  it('keeps parent guides read-only instead of deep-linking into kid-protected studios', () => {
    render(
      <MemoryRouter>
        <CreativeSpacesPanel />
      </MemoryRouter>,
    );

    for (const href of [
      '/learn/create/blocks',
      '/learn/playground/new',
      '/learn/create/image',
      '/learn/music',
    ]) {
      expect(document.querySelector(`a[href="${href}"]`)).not.toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Open My Family →' })).toHaveAttribute(
      'href',
      '/portal/family',
    );
  });
});
