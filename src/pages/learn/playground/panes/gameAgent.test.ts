import { describe, expect, it } from 'vitest';

import type { AgentTurnResult } from '../../code/codeApi';
import { predictionQuestion, streamTurn, type TurnDelta } from './gameAgent';

function makeResult(over: Partial<AgentTurnResult> = {}): AgentTurnResult {
  return {
    turn_id: 't1',
    requires_approval: false,
    plan: null,
    changes: [],
    files: [],
    version: 1,
    summary: 'I made the ball faster.',
    stars_charged: 2,
    tools_fired: ['edit_file:src/scenes/Game.js'],
    ...over,
  };
}

describe('gameAgent.streamTurn', () => {
  it('replays tool steps before token deltas, reconstructing the full summary', async () => {
    const deltas: TurnDelta[] = [];
    await streamTurn(makeResult(), (d) => deltas.push(d));

    const tools = deltas.filter((d) => d.type === 'tool');
    const tokens = deltas.filter((d) => d.type === 'token');
    // Tool deltas come first (the kid sees WHICH file before the prose).
    expect(deltas.indexOf(tools[0])).toBeLessThan(deltas.indexOf(tokens[0]));
    expect(tools.map((d) => (d as { tool: string }).tool)).toEqual([
      'edit_file:src/scenes/Game.js',
    ]);
    // Tokens concatenate back to the exact summary (no text lost in streaming).
    const text = tokens.map((d) => (d as { text: string }).text).join('');
    expect(text).toBe('I made the ball faster.');
  });

  it('stops emitting once the signal is aborted', async () => {
    const deltas: TurnDelta[] = [];
    const signal = { aborted: true };
    await streamTurn(makeResult(), (d) => deltas.push(d), signal);
    expect(deltas).toHaveLength(0);
  });
});

describe('gameAgent.predictionQuestion', () => {
  it('asks a faster/slower question for a speed prompt (typing-free predict beat)', () => {
    expect(predictionQuestion('make the ball faster')).toMatch(/faster or slower/i);
  });
  it('falls back to a generic change question', () => {
    expect(predictionQuestion('do something cool')).toMatch(/what do you think will change/i);
  });
});
