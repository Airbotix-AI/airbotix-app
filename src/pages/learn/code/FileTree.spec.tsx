import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { VfsFile } from './codeApi';
import { FileTree } from './FileTree';

const files: VfsFile[] = [
  { path: 'index.html', content: '', kind: 'text', size: 0 },
  { path: 'style.css', content: '', kind: 'text', size: 0 },
  { path: 'script.js', content: '', kind: 'text', size: 0 },
];

describe('FileTree', () => {
  it('renders one button per file', () => {
    render(<FileTree files={files} activePath={null} onPick={() => {}} />);
    expect(screen.getByRole('button', { name: /index\.html/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /style\.css/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /script\.js/ })).toBeInTheDocument();
  });

  it('calls onPick with the file path when a file is clicked', async () => {
    const onPick = vi.fn();
    render(<FileTree files={files} activePath="index.html" onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: /style\.css/ }));
    expect(onPick).toHaveBeenCalledWith('style.css');
  });
});
