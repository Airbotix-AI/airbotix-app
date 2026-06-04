import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodePane } from './CodePane';
import type { Message } from './WorkspacePage';

// livecodes/react boots a real playground iframe/SDK; stub it so CodePane's
// header logic (latest-code detection) can be asserted under jsdom.
vi.mock('livecodes/react', () => ({ default: () => <div>LIVECODES</div> }));

function assistant(content: string): Message {
  return { id: 'm1', role: 'assistant', content } as Message;
}

describe('CodePane', () => {
  it('says code is running once the assistant emits a code fence', () => {
    render(<CodePane messages={[assistant('```html\n<h1>Hi</h1>\n```')]} />);
    expect(screen.getByText('Your code is running')).toBeInTheDocument();
  });

  it('prompts to try something when there is no code yet', () => {
    render(<CodePane messages={[]} />);
    expect(screen.getByText('Try a prompt to start')).toBeInTheDocument();
  });
});
