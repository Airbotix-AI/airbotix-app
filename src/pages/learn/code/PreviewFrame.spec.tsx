import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { VfsFile } from './codeApi';
import { PreviewFrame } from './PreviewFrame';

const files = [{ path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 }] as VfsFile[];

describe('PreviewFrame', () => {
  it('renders a tightly-sandboxed preview iframe', () => {
    const { container } = render(<PreviewFrame files={files} runKey={1} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    // Only allow-scripts — never allow-same-origin (PRD §5.1 sandbox contract)
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
    expect(iframe).toHaveAttribute('title', 'Preview');
  });

  it('shows the captured console panel in Pro mode', () => {
    render(<PreviewFrame files={files} runKey={1} showConsole />);
    expect(screen.getByText('Console')).toBeInTheDocument();
  });
});
