import type { MissionStep } from './MissionRunPage';

interface Artifact {
  id: string;
  kind: string;
  created_at: string;
}

export function isStepDone(s: MissionStep, acknowledged: Set<string>, artifactData?: Artifact[]): boolean {
  if (s.completion.type === 'acknowledged') return acknowledged.has(s.id);
  if (s.completion.type === 'share_request_submitted') return acknowledged.has(s.id);
  if (s.completion.type === 'artifact_saved') {
    return (artifactData ?? []).some((a) => a.kind === s.completion.kind);
  }
  return false;
}

export function findInitialMissionIdx(missions: { id: string }[], initialMissionId?: string): number {
  if (!initialMissionId) return 0;
  const idx = missions.findIndex((m) => m.id === initialMissionId);
  return Math.max(0, idx);
}
