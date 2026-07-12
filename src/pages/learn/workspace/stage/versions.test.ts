import { describe, expect, it } from 'vitest';

import type { Message } from '../WorkspacePage';
import type { MusicScore } from './scoreTypes';
import { aggregateScoreVersions } from './versions';

function msg(id: string, partial: Partial<Message> = {}): Message {
  return {
    id,
    role: 'assistant',
    tool: 'music',
    content: '',
    artifact_id: null,
    stars_charged: 0,
    created_at: new Date().toISOString(),
    artifact: null,
    ...partial,
  };
}

const score = (title: string): MusicScore => ({
  title,
  tempo: 120,
  key: 'C major',
  tracks: [{ instrument: 'piano', notes: [{ time: 0, note: 'C4', duration: '4n' }] }],
});

function scoreMsg(id: string, s: MusicScore): Message {
  return msg(id, {
    artifact_id: `a-${id}`,
    artifact: {
      id: `a-${id}`,
      kind: 'text',
      mime_type: 'application/json',
      s3_key: `scores/${id}.json`,
      project_id: 'p1',
      metadata: { score: s },
    },
  });
}

describe('aggregateScoreVersions', () => {
  it('collects score-bearing messages in order, skipping everything else', () => {
    const messages: Message[] = [
      msg('u1', { role: 'user', content: 'a space song' }),
      scoreMsg('m1', score('v1')),
      msg('u2', { role: 'user', content: 'surprise me' }),
      msg('m2', {
        artifact: {
          id: 'a-audio',
          kind: 'audio',
          mime_type: 'audio/mpeg',
          s3_key: 'x.mp3',
          project_id: 'p1',
          metadata: null,
        },
      }),
      scoreMsg('m3', score('v2')),
    ];
    const versions = aggregateScoreVersions(messages);
    expect(versions).toHaveLength(2);
    expect(versions[0]).toMatchObject({ messageId: 'm1' });
    expect(versions[0].score.title).toBe('v1');
    expect(versions[1].score.title).toBe('v2');
  });

  it('returns [] when no message carries a score', () => {
    expect(aggregateScoreVersions([msg('u1', { role: 'user' })])).toEqual([]);
  });
});
