// @vitest-environment jsdom
// WorkCard (the ⋯ placement menu) in isolation. Covers the paths that the
// page-level specs (ProjectsListPage / ClassHubPage) don't reach directly:
// the empty class-picker state, the delete-only personal menu, and the
// outside-click close. FE-only: no api/router data, just the component.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkCard } from './WorkCard';
import type { KidProject } from './kidProject';
import type { ClassMineSummary } from '../classroom/classroomApi';

const CLASS: ClassMineSummary = {
  id: 'class-1',
  name: 'Year 5 AI Lab',
  status: 'active',
  course_title: null,
  cover_image_url: null,
  allowed_kinds: ['creative', 'code', 'game', 'blocks'],
  teacher_name: 'Ms. Chen',
  teacher_avatar_url: null,
  classmate_count: 5,
  is_live: false,
  next_session_at: null,
  lessons_total: 8,
  lessons_done: 3,
  stars_earned: 0,
};

function project(overrides: Partial<KidProject> = {}): KidProject {
  return {
    id: 'p-1',
    title: 'My Dragon Story',
    kind: 'creative',
    product_line: 'line_a_creative',
    visibility: 'private',
    class_id: null,
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 1,
    status: 'in_progress',
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof WorkCard>> = {}) {
  const handlers = {
    onUseForClass: vi.fn(),
    onTakeOffWall: vi.fn(),
    onShareWithClass: vi.fn(),
    onMoveToPersonal: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <MemoryRouter>
      <WorkCard project={project()} classes={[CLASS]} {...handlers} {...props} />
    </MemoryRouter>,
  );
  return handlers;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WorkCard — personal menu', () => {
  it('shows Use-for-a-class + Delete when onDelete is provided', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('work-kebab'));
    expect(screen.getByTestId('action-use-for-class')).toBeInTheDocument();
    expect(screen.getByTestId('action-delete')).toBeInTheDocument();
  });

  it('omits the Delete item when no onDelete handler is given', () => {
    renderCard({ onDelete: undefined });
    fireEvent.click(screen.getByTestId('work-kebab'));
    expect(screen.getByTestId('action-use-for-class')).toBeInTheDocument();
    expect(screen.queryByTestId('action-delete')).not.toBeInTheDocument();
  });

  it('fires onDelete from the Delete item', () => {
    const h = renderCard();
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-delete'));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('WorkCard — class picker', () => {
  it('shows the empty state when the kid is in no class', () => {
    const h = renderCard({ classes: [] });
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-use-for-class'));
    expect(screen.getByText(/not in any class yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('class-picker-option')).not.toBeInTheDocument();
    expect(h.onUseForClass).not.toHaveBeenCalled();
  });

  it('picking a class fires onUseForClass with the class id', () => {
    const h = renderCard();
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-use-for-class'));
    fireEvent.click(screen.getByTestId('class-picker-option'));
    expect(h.onUseForClass).toHaveBeenCalledWith('class-1');
  });
});

describe('WorkCard — close behavior', () => {
  it('closes the menu on an outside click', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('work-kebab'));
    expect(screen.getByTestId('work-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('work-menu')).not.toBeInTheDocument();
  });

  it('closes the open class picker on an outside click', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-use-for-class'));
    expect(screen.getByTestId('class-picker')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('class-picker')).not.toBeInTheDocument();
  });
});

describe('WorkCard — class_work / on_wall menus', () => {
  it('class_work shows share + move-to-personal', () => {
    const h = renderCard({ project: project({ visibility: 'class_work', class_id: 'class-1' }) });
    fireEvent.click(screen.getByTestId('work-kebab'));
    const menu = screen.getByTestId('work-menu');
    fireEvent.click(within(menu).getByTestId('action-share-class'));
    expect(h.onShareWithClass).toHaveBeenCalledTimes(1);
  });

  it('class_work can be deleted directly', () => {
    const h = renderCard({ project: project({ visibility: 'class_work', class_id: 'class-1' }) });
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-delete'));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });

  it('on_wall shows take-off-wall', () => {
    const h = renderCard({ project: project({ visibility: 'class', class_id: 'class-1' }) });
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-take-off-wall'));
    expect(h.onTakeOffWall).toHaveBeenCalledTimes(1);
  });

  it('on_wall can be deleted directly', () => {
    const h = renderCard({ project: project({ visibility: 'class', class_id: 'class-1' }) });
    fireEvent.click(screen.getByTestId('work-kebab'));
    fireEvent.click(screen.getByTestId('action-delete'));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('WorkCard — public (double-consent gated)', () => {
  it('shows the honest "Shared to the world" badge, not "On the wall"', () => {
    renderCard({ project: project({ visibility: 'public', class_id: 'class-1' }) });
    expect(screen.getByText('Shared to the world')).toBeInTheDocument();
    expect(screen.queryByText('On the wall')).not.toBeInTheDocument();
  });

  it('exposes no ⋯ menu and no placement actions for a public project', () => {
    renderCard({ project: project({ visibility: 'public', class_id: 'class-1' }) });
    // No kebab at all — there are no kid-mutable actions for `public`.
    expect(screen.queryByTestId('work-kebab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-take-off-wall')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-move-personal')).not.toBeInTheDocument();
  });
});
