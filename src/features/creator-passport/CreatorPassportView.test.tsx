// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import type { CreatorPassport } from './creatorPassport';
import { CreatorPassportView } from './CreatorPassportView';

afterEach(cleanup);

function passport(overrides: Partial<CreatorPassport> = {}): CreatorPassport {
  return {
    kid: { id: 'kid-1', nickname: 'Mia' },
    capabilities: [],
    evidence: [
      {
        id: 'evidence-1',
        status: 'verified',
        child_reflection: { format: 'text', text: 'I changed the goal.', entered_by: 'kid' },
        rubric_checks: { goal: true },
        teacher_note: 'Mia explained the change clearly.',
        return_reason: null,
        submitted_at: '2026-08-20T01:00:00.000Z',
        verified_at: '2026-08-20T02:00:00.000Z',
        definition: {
          id: 'definition-1',
          code: 'idea_builder',
          version: 1,
          display_name: 'Idea Builder',
          rubric: [{ id: 'goal', label: 'Explains the goal' }],
          age_adaptations: {},
        },
        project: { id: 'project-1', title: 'Ocean Helper', kind: 'game' },
        class: { id: 'class-1', name: 'AI Game Workshop' },
        session: { id: 'session-1', scheduled_starts_at: '2026-08-20T00:00:00.000Z' },
        award: { id: 'award-1', awarded_at: '2026-08-20T02:00:00.000Z', revoked_at: null },
      },
    ],
    showcase_eligibility: {
      status: 'not_eligible',
      reasons: ['capability_breadth'],
      unique_capability_count: 1,
      qualifying_project_count: 1,
      qualifying_workshop_count: 1,
      includes_project_presenter: false,
    },
    ...overrides,
  };
}

describe('CreatorPassportView', () => {
  it('shows verified evidence, the child reflection and teacher note', () => {
    render(
      <MemoryRouter>
        <CreatorPassportView passport={passport()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Mia's creator journey/i })).toBeInTheDocument();
    expect(screen.getAllByText('Idea Builder')).toHaveLength(2);
    expect(screen.getByText(/I changed the goal/)).toBeInTheDocument();
    expect(screen.getByText(/Mia explained the change clearly/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open “Ocean Helper”/ })).toHaveAttribute(
      'href',
      '/learn/projects/project-1',
    );
  });

  it('does not count a revoked award as a verified capability', () => {
    const data = passport();
    data.evidence[0].award = {
      ...data.evidence[0].award!,
      revoked_at: '2026-08-20T03:00:00.000Z',
    };
    render(
      <MemoryRouter>
        <CreatorPassportView passport={data} />
      </MemoryRouter>,
    );
    const capabilitySection = screen
      .getByRole('heading', { name: 'Capability stamps' })
      .closest('section')!;
    const ideaCard = within(capabilitySection)
      .getByRole('heading', { name: 'Idea Builder' })
      .closest('article');
    expect(ideaCard).toHaveTextContent('Still growing');
    expect(screen.getByText('Stamp revoked')).toBeInTheDocument();
  });

  it('states that Showcase eligibility still needs parent confirmation and media permission', () => {
    render(
      <MemoryRouter>
        <CreatorPassportView
          passport={passport({
            showcase_eligibility: {
              status: 'eligible',
              reasons: [],
              unique_capability_count: 4,
              qualifying_project_count: 2,
              qualifying_workshop_count: 2,
              includes_project_presenter: true,
            },
          })}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Eligible for a Showcase Day invitation/)).toBeInTheDocument();
    expect(screen.getByText(/parent still confirms participation/i)).toBeInTheDocument();
    expect(screen.getByText(/media use needs separate permission/i)).toBeInTheDocument();
  });
});
