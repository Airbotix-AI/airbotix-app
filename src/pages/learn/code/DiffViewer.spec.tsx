import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FileChange } from './codeApi';
import { DiffViewer } from './DiffViewer';

function change(overrides: Partial<FileChange> = {}): FileChange {
  return {
    path: 'index.html',
    before: 'a\nb\nc',
    after: 'a\nB\nc',
    lines_added: 1,
    lines_removed: 1,
    ...overrides,
  } as FileChange;
}

describe('DiffViewer', () => {
  it('renders the file path and +/- line counts', () => {
    render(<DiffViewer change={change()} />);
    expect(screen.getByText('index.html')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();
  });

  it('shows removed and added lines from the line diff', () => {
    render(<DiffViewer change={change({ before: 'oldline', after: 'newline' })} />);
    expect(screen.getByText(/oldline/)).toBeInTheDocument(); // del row
    expect(screen.getByText(/newline/)).toBeInTheDocument(); // add row
  });
});
