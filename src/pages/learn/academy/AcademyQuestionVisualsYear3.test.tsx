// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AcademyChoiceVisual, AcademyQuestionVisual } from './AcademyQuestionVisual';
import type { AcademyRenderSpec } from './academyApi';

afterEach(cleanup);

describe('Academy Year 3 native question visuals', () => {
  it('renders the trip schedule as an accessible native table', () => {
    const spec: AcademyRenderSpec = {
      kind: 'schedule_table',
      title: 'Year 3 trip plan',
      columns: ['Start time', 'Activity'],
      rows: [
        ['12:45', 'Lunch at the park'],
        ['1:30', 'See movie'],
      ],
    };
    render(<AcademyQuestionVisual spec={spec} />);

    expect(screen.getByRole('table', { name: 'Year 3 trip plan' })).toHaveTextContent(
      '12:45Lunch at the park1:30See movie',
    );
  });

  it('renders the joined cone and cylinder as native SVG', () => {
    render(
      <AcademyQuestionVisual spec={{ kind: 'joined_solids', solids: ['cone', 'cylinder'] }} />,
    );
    expect(
      screen.getByRole('img', { name: 'A cone joined end-to-end to a cylinder' }),
    ).toBeInTheDocument();
  });

  it('renders the side-view model and all four visual choices', () => {
    const spec: AcademyRenderSpec = { kind: 'side_view_model' };
    const { rerender } = render(<AcademyQuestionVisual spec={spec} />);
    expect(screen.getByRole('img', { name: /viewed from the left side/ })).toBeInTheDocument();
    for (let index = 0; index < 4; index += 1) {
      rerender(<AcademyChoiceVisual spec={spec} choiceIndex={index} />);
      expect(screen.getByTestId(`academy-side-view-${index}`)).toBeInTheDocument();
    }
  });

  it('renders quarter-turn tiles and the official third visual choice', () => {
    const spec: AcademyRenderSpec = {
      kind: 'tile_rotation',
      turn: 'clockwise',
      start: ['solid', 'diagonal_lower_left', 'diagonal_upper_left', 'vertical_right'],
      choices: [
        ['solid', 'diagonal_upper_left', 'diagonal_lower_left', 'vertical_right'],
        ['solid', 'diagonal_lower_left', 'diagonal_upper_left', 'vertical_right'],
        ['solid', 'diagonal_upper_left', 'diagonal_lower_left', 'horizontal_bottom'],
        ['solid', 'diagonal_lower_left', 'diagonal_upper_left', 'horizontal_middle'],
      ],
    };
    const { rerender } = render(<AcademyQuestionVisual spec={spec} />);
    expect(
      screen.getByRole('img', { name: 'Four tiles before a quarter turn clockwise' }),
    ).toBeInTheDocument();
    rerender(<AcademyChoiceVisual spec={spec} choiceIndex={2} />);
    expect(document.querySelectorAll('svg')).toHaveLength(4);
  });

  it('renders the symmetry grid with the source eye in D3', () => {
    const spec: AcademyRenderSpec = {
      kind: 'symmetry_grid',
      columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      rows: [1, 2, 3, 4, 5],
      axis_after_column: 'C',
      eye_cell: 'D3',
    };
    render(<AcademyQuestionVisual spec={spec} />);
    expect(screen.getByRole('img', { name: /eye in D3/ })).toBeInTheDocument();
  });

  it('renders four distinct fraction choices with the fourth representing a quarter', () => {
    const spec: AcademyRenderSpec = {
      kind: 'fraction_shapes',
      choices: ['sixth', 'half', 'third', 'quarter'],
    };
    const { rerender } = render(<AcademyQuestionVisual spec={spec} />);
    expect(screen.getByText(/Compare each shaded region/)).toBeInTheDocument();
    for (let index = 0; index < 4; index += 1) {
      rerender(<AcademyChoiceVisual spec={spec} choiceIndex={index} />);
      expect(screen.getByTestId('academy-fraction-choice')).toBeInTheDocument();
    }
  });

  it('renders three shell bags and visual answer groups', () => {
    const spec: AcademyRenderSpec = {
      kind: 'shell_bags',
      bags: [
        ['fan', 'fan', 'fan'],
        ['spiral', 'spiral', 'conch'],
        ['spotted', 'spotted', 'spotted'],
      ],
      choices: [
        ['fan', 'spiral', 'spotted'],
        ['conch', 'fan', 'spiral'],
        ['conch', 'spotted', 'spotted'],
        ['fan', 'fan', 'fan'],
      ],
    };
    const { rerender } = render(<AcademyQuestionVisual spec={spec} />);
    expect(
      screen.getByRole('img', { name: 'Three bags containing different shells' }),
    ).toHaveTextContent('Bag 1Bag 2Bag 3');
    rerender(<AcademyChoiceVisual spec={spec} choiceIndex={0} />);
    expect(screen.getByTestId('academy-shell-choice').querySelectorAll('svg')).toHaveLength(3);
  });

  it('renders one square and four triangular pyramid faces', () => {
    render(
      <AcademyQuestionVisual
        spec={{ kind: 'pyramid_faces', square_faces: 1, triangular_faces: 4 }}
      />,
    );
    expect(
      screen
        .getByRole('img', { name: '1 square face and 4 triangular faces' })
        .querySelectorAll('svg'),
    ).toHaveLength(5);
  });
});
