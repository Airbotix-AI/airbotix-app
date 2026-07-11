// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import { StoryMissionGuide } from './StoryMissionGuide';

const mission = storyMissionFor('tsv-s1-a1-h')!;

describe('StoryMissionGuide', () => {
  it('introduces the world, story problem, child role, and mission across four pages', () => {
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
    expect(screen.getByText('The village that wakes with light')).toBeInTheDocument();
    expect(screen.getByText(/singing streetlights/)).toBeInTheDocument();
    expect(screen.getByLabelText('Story page 1 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('The morning light is missing')).toBeInTheDocument();
    expect(screen.getByText(/bell did not ring/)).toBeInTheDocument();
    expect(screen.getByText(/Why is the village still dark/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('A strange good morning')).toBeInTheDocument();
    expect(screen.getByText(/Did I do my morning steps/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    expect(screen.getByText('A new Morning Light Helper')).toBeInTheDocument();
    expect(screen.getByText(/That's you!/)).toBeInTheDocument();
    expect(screen.getByText('Your mission')).toBeInTheDocument();
    expect(screen.getByText(/Press Go/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the mission ▶' })).toBeInTheDocument();
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
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent('🦘 Hop');
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent('💬 Morning!');
    expect(screen.getByTestId('story-logic-proof')).toHaveTextContent(
      'The Hop block is now on the left',
    );
    expect(screen.getByText(/first morning clue is safe/)).toBeInTheDocument();
  });
});
