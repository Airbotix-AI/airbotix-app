// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import { StoryMissionGuide } from './StoryMissionGuide';

const mission = storyMissionFor('tsv-s1-a1-h')!;

describe('StoryMissionGuide', () => {
  it('explains the light chain, why it stopped, and why the child must fix it', () => {
    render(
      <StoryMissionGuide
        mission={mission}
        hasRun={false}
        completed={false}
        answerId={null}
        onAnswer={vi.fn()}
        onApplyFix={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Meet Lumi, your morning-light friend')).toBeInTheDocument();
    expect(screen.getByText(/This is Lumilo—Lumi to friends/)).toBeInTheDocument();
    expect(screen.getByText(/Hi! Call me Lumi/)).toBeInTheDocument();
    expect(screen.getByLabelText('Story page 1 of 5')).toBeInTheDocument();
    expect(screen.getByTestId('story-mission')).toHaveClass('bsx-story-fullscreen');
    expect(screen.getByTestId('story-animated-scene')).toHaveClass('bsx-story-scene-1');
    expect(screen.getByTestId('story-lumilo').querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
    );
    expect(screen.queryByTestId('story-light-network')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('Lumi starts the morning light')).toBeInTheDocument();
    expect(screen.getByText(/Other homes send their stars too/)).toBeInTheDocument();
    expect(screen.getByText(/My star goes first/)).toBeInTheDocument();
    expect(screen.getByTestId('story-animated-scene')).toHaveClass('bsx-story-scene-2');
    expect(screen.getByTestId('story-light-network')).toBeInTheDocument();
    expect(screen.getByTestId('story-light-network').querySelectorAll('.bsx-story-light-route')).toHaveLength(3);
    expect(screen.getByTestId('story-light-network').querySelector('marker')).toHaveAttribute(
      'markerUnits',
      'userSpaceOnUse',
    );
    expect(screen.getByTestId('story-light-network').querySelector('marker')).toHaveAttribute(
      'markerWidth',
      '14',
    );
    expect(screen.getByTestId('story-light-equation')).toHaveTextContent('🏠✦→🔔→🌅');

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('The light chain stopped today')).toBeInTheDocument();
    expect(screen.getByText(/no wake-up star arrived first/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('The program mixed up the story')).toBeInTheDocument();
    expect(screen.getByText(/blocks run from left to right/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('Why the village needs a Story Partner')).toBeInTheDocument();
    expect(screen.getByText(/you can read the glowing blocks/)).toBeInTheDocument();
    expect(screen.getByText(/That's you!/)).toBeInTheDocument();
    expect(screen.getByText('Your mission')).toBeInTheDocument();
    expect(screen.getByText(/press Go/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the mission ▶' })).toBeInTheDocument();
    expect(screen.getByText(/Help Lumi send the first wake-up star/)).toBeInTheDocument();
    expect(screen.getByTestId('story-book')).toHaveClass('bsx-story-book-5');
  });

  it('requires the child to choose a fix and test it before completing the mission', () => {
    const onAnswer = vi.fn();
    const onApplyFix = vi.fn();
    const { rerender } = render(
      <StoryMissionGuide
        mission={mission}
        hasRun
        completed={false}
        answerId={null}
        onAnswer={onAnswer}
        onApplyFix={onApplyFix}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('story-choice-hop-first'));
    expect(onAnswer).toHaveBeenCalledWith('hop-first');

    rerender(
      <StoryMissionGuide
        mission={mission}
        hasRun
        completed={false}
        answerId="hop-first"
        onAnswer={onAnswer}
        onApplyFix={onApplyFix}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Watch the speech bubble');

    rerender(
      <StoryMissionGuide
        mission={mission}
        hasRun
        completed={false}
        answerId="say-first"
        onAnswer={onAnswer}
        onApplyFix={onApplyFix}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('story-fix-task')).toHaveTextContent(
      'The order of the blocks makes the story feel strange',
    );
    expect(screen.getByTestId('story-observation-proof')).toHaveTextContent(
      'The speech block is on the left, so it runs first',
    );
    fireEvent.click(screen.getByTestId('story-fix-say-then-hop'));
    expect(screen.getByRole('status')).toHaveTextContent('mixed-up order');
    expect(onApplyFix).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('story-fix-hop-then-say'));
    expect(onApplyFix).toHaveBeenCalledOnce();

    rerender(
      <StoryMissionGuide
        mission={mission}
        hasRun
        completed
        answerId="say-first"
        onAnswer={onAnswer}
        onApplyFix={onApplyFix}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('story-mission-success')).toHaveTextContent(
      'You changed the real program and tested it',
    );
    expect(screen.getByTestId('story-celebration')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('story-celebration')).not.toBe(screen.getByTestId('story-mission-success').parentElement);
    expect(screen.getByTestId('story-celebration').parentElement).toBe(document.body);
    expect(screen.getByTestId('story-celebration').children).toHaveLength(72);
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent('🦘 Hop');
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent('💬 Morning!');
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent(
      'The Hop block is now on the left',
    );
    expect(screen.getByText(/first of six morning clues/)).toBeInTheDocument();
  });
});
