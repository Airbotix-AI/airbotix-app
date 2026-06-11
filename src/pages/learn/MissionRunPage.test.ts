import { describe, it, expect } from 'vitest';

import { isStepDone, findInitialMissionIdx } from './MissionRunPage';
import type { MissionStep } from './MissionRunPage';

// ─── fixtures ────────────────────────────────────────────────────────────────

const step = (
  widget: MissionStep['widget'],
  completionType: string,
  kind?: string,
): MissionStep => ({
  id: `step_${widget}`,
  title: 'Test step',
  instruction_md: '',
  widget,
  widget_config: {},
  completion: { type: completionType, kind },
});

const artifact = (kind: string) => ({ id: 'a1', kind, created_at: '' });

// ─── isStepDone ───────────────────────────────────────────────────────────────

describe('isStepDone', () => {
  describe('completion.type = acknowledged', () => {
    const s = step('read_only', 'acknowledged');

    it('returns false when not yet acknowledged', () => {
      expect(isStepDone(s, new Set())).toBe(false);
    });

    it('returns true once the step id is in acknowledged set', () => {
      expect(isStepDone(s, new Set([s.id]))).toBe(true);
    });
  });

  describe('completion.type = share_request_submitted', () => {
    const s = step('share_to_class', 'share_request_submitted');

    it('returns false before share is submitted', () => {
      expect(isStepDone(s, new Set())).toBe(false);
    });

    it('returns true after share is submitted (acknowledged)', () => {
      expect(isStepDone(s, new Set([s.id]))).toBe(true);
    });
  });

  describe('completion.type = artifact_saved', () => {
    const s = step('image_create', 'artifact_saved', 'image');

    it('returns false when no artifacts exist', () => {
      expect(isStepDone(s, new Set(), [])).toBe(false);
    });

    it('returns false when artifacts exist but wrong kind', () => {
      expect(isStepDone(s, new Set(), [artifact('audio')])).toBe(false);
    });

    it('returns true when a matching-kind artifact exists', () => {
      expect(isStepDone(s, new Set(), [artifact('image')])).toBe(true);
    });

    it('returns true even when acknowledged set is irrelevant', () => {
      expect(isStepDone(s, new Set(['unrelated']), [artifact('image')])).toBe(true);
    });

    it('treats undefined artifactData as empty array', () => {
      expect(isStepDone(s, new Set())).toBe(false);
    });
  });

  it('returns false for unknown completion type', () => {
    const s = step('read_only', 'unknown_type');
    expect(isStepDone(s, new Set([s.id]), [artifact('image')])).toBe(false);
  });
});

// ─── findInitialMissionIdx ────────────────────────────────────────────────────

describe('findInitialMissionIdx', () => {
  const missions = [
    { id: 'mission_1' },
    { id: 'mission_2' },
    { id: 'mission_3' },
  ];

  it('returns 0 when no initialMissionId provided', () => {
    expect(findInitialMissionIdx(missions)).toBe(0);
    expect(findInitialMissionIdx(missions, undefined)).toBe(0);
  });

  it('returns the correct index for a matching mission id', () => {
    expect(findInitialMissionIdx(missions, 'mission_2')).toBe(1);
    expect(findInitialMissionIdx(missions, 'mission_3')).toBe(2);
  });

  it('returns 0 (not -1) when mission id is not found', () => {
    expect(findInitialMissionIdx(missions, 'mission_999')).toBe(0);
  });

  it('returns 0 for the first mission', () => {
    expect(findInitialMissionIdx(missions, 'mission_1')).toBe(0);
  });
});
