// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import { StoryCoachPanel } from './StoryCoachPanel';

const mission = storyMissionFor('tsv-s1-a1-h')!;
const buildMission = storyMissionFor('tsv-s1-a1-b')!;
const manualFixMission = storyMissionFor('tsv-s1-a1-d')!;
const personalShipMission = storyMissionFor('tsv-s1-a1-s')!;
const directionHookMission = storyMissionFor('tsv-s1-a2-h')!;
const directionBuildMission = storyMissionFor('tsv-s1-a2-b')!;

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

  it('keeps A1-B in Build until the real target chain is ready', () => {
    const onGo = vi.fn();
    const { rerender } = render(
      <StoryCoachPanel mission={buildMission} cue="ready" running={false} onGo={onGo} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('add blue Hop');
    expect(screen.getByLabelText('Mission step 2 of 4')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<StoryCoachPanel mission={buildMission} cue="test" running={false} onGo={onGo} />);
    expect(screen.getByLabelText('Mission step 3 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '▶ Test my fix' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('lets A1-D run the bug, then requires a manual reorder before retesting', () => {
    const onGo = vi.fn();
    const { rerender } = render(
      <StoryCoachPanel mission={manualFixMission} cue="ready" running={false} onGo={onGo} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '▶ Go' }));
    expect(onGo).toHaveBeenCalledOnce();

    rerender(
      <StoryCoachPanel mission={manualFixMission} cue="retry" running={false} onGo={onGo} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('drag the existing blue Hop');
    fireEvent.click(screen.getByRole('button', { name: '▶ Watch again' }));
    expect(onGo).toHaveBeenCalledTimes(2);

    rerender(<StoryCoachPanel mission={manualFixMission} cue="test" running={false} onGo={onGo} />);
    fireEvent.click(screen.getByRole('button', { name: '▶ Test my fix' }));
    expect(onGo).toHaveBeenCalledTimes(3);
  });

  it('keeps A1-S in personal Build until a valid greeting is ready to test', () => {
    const onGo = vi.fn();
    const { rerender } = render(
      <StoryCoachPanel mission={personalShipMission} cue="ready" running={false} onGo={onGo} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('choose your greeting');
    expect(screen.getByLabelText('Mission step 2 of 4')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <StoryCoachPanel mission={personalShipMission} cue="test" running={false} onGo={onGo} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '▶ Test my fix' }));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('keeps A2-H as point, Go, and answer with Tuan Tuan as the coach', () => {
    const onGo = vi.fn();
    const { rerender } = render(
      <StoryCoachPanel mission={directionHookMission} cue="ready" running={false} onGo={onGo} />,
    );
    expect(screen.getByText('Tuan Tuan')).toBeInTheDocument();
    expect(screen.getByText('Cloud-path Maker')).toBeInTheDocument();
    expect(screen.getByLabelText('Mission step 2 of 4')).toHaveTextContent('Point');
    fireEvent.click(screen.getByRole('button', { name: '▶ Go' }));
    expect(onGo).toHaveBeenCalledOnce();

    rerender(
      <StoryCoachPanel mission={directionHookMission} cue="fix" running={false} onGo={onGo} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('No fix yet');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps A2-B in Build until the exact Right 3 chain is ready', () => {
    const onGo = vi.fn();
    const { rerender } = render(
      <StoryCoachPanel mission={directionBuildMission} cue="ready" running={false} onGo={onGo} />,
    );
    expect(screen.getByText('Tuan Tuan')).toBeInTheDocument();
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('choose one arrow');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <StoryCoachPanel mission={directionBuildMission} cue="test" running={false} onGo={onGo} />,
    );
    expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Right 3');
    fireEvent.click(screen.getByRole('button', { name: '▶ Test my fix' }));
    expect(onGo).toHaveBeenCalledOnce();
  });
});
