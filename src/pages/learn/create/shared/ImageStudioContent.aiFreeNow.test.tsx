// @vitest-environment jsdom
// Workshop-free-AI waiver (workshop-free-ai-prd.md D-WFA-01): a project-scoped
// creative studio (added via ProjectDetailPage during a live free-workshop window)
// shows "Free" in its generate button in place of the "N★" star cost. Image is the
// representative case — Voice/Music/Story/Video share the identical pattern.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./useStudio', () => ({
  useGenerate: () => ({ mutate: vi.fn(), isPending: false }),
  friendlyError: (e: unknown) => String(e),
}));

import { ImageStudioContent } from './ImageStudioContent';

afterEach(cleanup);

describe('ImageStudioContent — workshop-free-AI (D-WFA-01)', () => {
  it('free workshop: the make button shows "Free", never the star cost', () => {
    render(<ImageStudioContent projectId="p1" aiFreeNow onCreated={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Make it/i });
    expect(btn).toHaveTextContent(/Free/i);
    expect(btn).not.toHaveTextContent('★');
  });

  it('waiver off: the make button shows the star cost', () => {
    render(<ImageStudioContent projectId="p1" aiFreeNow={false} onCreated={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Make it/i });
    expect(btn).toHaveTextContent('★');
    expect(btn).not.toHaveTextContent(/Free/i);
  });
});
