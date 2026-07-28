export const TINY_STAR_RESOLVED_SCENES = {
  windowRoom: 'tsv-window-room-resolved-bright',
  rooftop: 'tsv-rooftop-awake-lit',
  greetingStage: 'tsv-greeting-stage-lamp-lit',
  clocktowerPath: 'tsv-clocktower-path-bell-lit',
} as const;

interface CompletionSceneRule {
  background: string;
  visual: (typeof TINY_STAR_RESOLVED_SCENES)[keyof typeof TINY_STAR_RESOLVED_SCENES];
}

const COMPLETION_SCENE_BY_LESSON: Readonly<Record<string, CompletionSceneRule>> = {
  'tsv-s1-a1-h': { background: 'tsv-window-room-dim', visual: TINY_STAR_RESOLVED_SCENES.windowRoom },
  'tsv-s1-a1-b': { background: 'tsv-window-room-dim', visual: TINY_STAR_RESOLVED_SCENES.windowRoom },
  'tsv-s1-a1-d': { background: 'tsv-window-room-dim', visual: TINY_STAR_RESOLVED_SCENES.windowRoom },
  'tsv-s1-a1-s': { background: 'tsv-window-room-dim', visual: TINY_STAR_RESOLVED_SCENES.windowRoom },
  'tsv-s1-a3-h': { background: 'tsv-rooftop', visual: TINY_STAR_RESOLVED_SCENES.rooftop },
  'tsv-s1-a3-b': { background: 'tsv-rooftop', visual: TINY_STAR_RESOLVED_SCENES.rooftop },
  'tsv-s1-a3-d': { background: 'tsv-rooftop', visual: TINY_STAR_RESOLVED_SCENES.rooftop },
  'tsv-s1-a3-s': { background: 'tsv-rooftop', visual: TINY_STAR_RESOLVED_SCENES.rooftop },
  'tsv-s1-a5-b': { background: 'tsv-greeting-stage', visual: TINY_STAR_RESOLVED_SCENES.greetingStage },
  'tsv-s1-a5-d': { background: 'tsv-greeting-stage', visual: TINY_STAR_RESOLVED_SCENES.greetingStage },
  'tsv-s1-a5-s': { background: 'tsv-greeting-stage', visual: TINY_STAR_RESOLVED_SCENES.greetingStage },
  'tsv-s1-a6-b': { background: 'tsv-clocktower-path', visual: TINY_STAR_RESOLVED_SCENES.clocktowerPath },
  'tsv-s1-a6-d': { background: 'tsv-clocktower-path', visual: TINY_STAR_RESOLVED_SCENES.clocktowerPath },
  'tsv-s1-a6-s': { background: 'tsv-clocktower-path', visual: TINY_STAR_RESOLVED_SCENES.clocktowerPath },
};

/**
 * Returns a presentation-only completed scene. The saved page background stays
 * untouched, and a run cannot brighten a scene until its mission completion
 * has passed the existing product and server gates.
 *
 * Observation-only A5-H and A6-H deliberately stay on their before art even
 * after completion: the child explains an existing scene rather than resolving
 * it. A6-S is the chapter finale and does resolve the clocktower.
 */
export function tinyStarCompletionScene(
  lessonId: string | undefined,
  background: string | undefined,
  completed: boolean,
): string | null {
  if (!completed || !lessonId) return null;
  const rule = COMPLETION_SCENE_BY_LESSON[lessonId];
  return rule && rule.background === background ? rule.visual : null;
}
