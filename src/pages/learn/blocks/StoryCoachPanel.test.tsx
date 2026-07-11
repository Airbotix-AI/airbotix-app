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
    expect(screen.getByLabelText('Mission step 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ Go' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('speaks the live block order without adding another action', () => {
    const { rerender } = render(
      <StoryCoachPanel mission={mission} cue="say" running onGo={vi.fn()} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('First, I say');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<StoryCoachPanel mission={mission} cue="hop" running onGo={vi.fn()} />);
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Then, I hop');
    expect(screen.getByLabelText('Mission step 2 of 3')).toBeInTheDocument();
  });
});
