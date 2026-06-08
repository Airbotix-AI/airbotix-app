import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the shared api client so we assert the request shape without a network.
const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));
// Mock the readVfs the resolver delegates to (its own module is tested elsewhere).
vi.mock('../../code/codeApi', () => ({ readVfs: vi.fn() }));

import { createGameProject, transcribeVoice } from './playgroundApi';

describe('createGameProject (PRD J1)', () => {
  beforeEach(() => apiMock.mockReset());

  it('POSTs a kind=game project with the kid title + Phaser template', async () => {
    apiMock.mockResolvedValue({ id: 'game-1' });
    const res = await createGameProject({
      kidId: 'kid-1',
      familyId: 'fam-1',
      title: 'SUPERCAT',
      template: 'phaser_pong',
    });
    expect(res).toEqual({ id: 'game-1' });
    expect(apiMock).toHaveBeenCalledWith('/projects', {
      method: 'POST',
      body: {
        title: 'SUPERCAT',
        product_line: 'line_b_coding',
        kind: 'game',
        template: 'phaser_pong',
        kid_id: 'kid-1',
        family_id: 'fam-1',
      },
    });
  });

  it('omits kid/family ids when absent (DEV / no auth)', async () => {
    apiMock.mockResolvedValue({ id: 'game-2' });
    await createGameProject({ kidId: null, familyId: null, title: 'My Game', template: 'phaser_blank' });
    const [, opts] = apiMock.mock.calls[0];
    expect(opts.body).not.toHaveProperty('kid_id');
    expect(opts.body).not.toHaveProperty('family_id');
  });
});

describe('transcribeVoice (UDL / OD-6 — backend STT, never a direct LLM)', () => {
  beforeEach(() => apiMock.mockReset());

  it('posts the audio data URL to the backend STT route', async () => {
    apiMock.mockResolvedValue({ text: 'a flappy bird game' });
    const res = await transcribeVoice({ audioDataUrl: 'data:audio/webm;base64,AAA' });
    expect(res.text).toBe('a flappy bird game');
    expect(apiMock).toHaveBeenCalledWith('/llm/transcribe', {
      method: 'POST',
      body: { audio: 'data:audio/webm;base64,AAA' },
    });
  });
});
