// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import { StoryCoachPanel } from './StoryCoachPanel';

const mission = storyMissionFor('tsv-s1-a1-h')!;

afterEach(cleanup);

describe('StoryCoachPanel', () => {
  it('keeps the next action beside the stage and can run it directly', () => {
    const onGo = vi.fn();
    render(<StoryCoachPanel mission={mission} cue="ready" running={false} onGo={onGo} />);

    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Press Go');
    expect(screen.getByLabelText('Mission step 1 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ Go' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('speaks the live block order without adding another action', () => {
    const { rerender } = render(
      <StoryCoachPanel mission={mission} cue="sayFirst" running onGo={vi.fn()} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('First, I say');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<StoryCoachPanel mission={mission} cue="hopThen" running onGo={vi.fn()} />);
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Then, I hop');
    expect(screen.getByLabelText('Mission step 2 of 4')).toBeInTheDocument();
  });

  it('asks the child to test the real fix before showing completion', () => {
    const onGo = vi.fn();
    render(<StoryCoachPanel mission={mission} cue="test" running={false} onGo={onGo} />);

    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Press Go to test');
    expect(screen.getByLabelText('Mission step 4 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ Test my fix' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('waits for the tested program to save before claiming completion', () => {
    render(<StoryCoachPanel mission={mission} cue="saving" running={false} onGo={vi.fn()} />);

    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('saving your real blocks');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
