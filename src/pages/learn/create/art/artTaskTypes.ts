export const ART_TASK_DRAW_MODES = {
  look: 'look',
  trace: 'trace',
  free: 'free',
} as const;

export type ArtTaskDrawMode = (typeof ART_TASK_DRAW_MODES)[keyof typeof ART_TASK_DRAW_MODES];

export interface ArtTaskAsset {
  url: string;
  alt: string;
}

export type ArtTaskLevel = 'first' | 'simple' | 'challenge';

export interface ArtTaskProgression {
  path_id: string;
  path_title: string;
  position: number;
  total: number;
  level: ArtTaskLevel;
  next_task_slug: string | null;
}

export interface ArtTaskListItem {
  slug: string;
  version: number;
  title: string;
  short_description: string;
  category: string;
  age_min: number;
  age_max: number;
  difficulty: number;
  duration_minutes: number;
  step_count: number;
  cover: ArtTaskAsset;
  modes: string[];
  progression: ArtTaskProgression | null;
}

export interface ArtTaskStep {
  id: string;
  title: string;
  instruction_md: string;
  guide_url: string;
}

export interface ArtTaskDetail extends ArtTaskListItem {
  learning_tags: string[];
  canvas: {
    ratio: 'square';
    background: 'white';
    magic_base: 'strokes_only';
  };
  default_mode: string;
  reference: ArtTaskAsset;
  ghost: ArtTaskAsset & { default_opacity: number };
  steps: ArtTaskStep[];
  checklist: string[];
  ai_guidance: {
    ghost_prompt: string;
    enhance_instruction: string;
  };
  next_task: ArtTaskListItem | null;
}

export interface ArtDraftTaskContext {
  slug: string;
  version: number;
  mode: ArtTaskDrawMode;
  stepIndex: number;
}

export function drawModeFromApi(mode: string | null | undefined): ArtTaskDrawMode {
  if (mode === 'trace_ghost' || mode === ART_TASK_DRAW_MODES.trace) {
    return ART_TASK_DRAW_MODES.trace;
  }
  if (mode === 'draw_my_way' || mode === ART_TASK_DRAW_MODES.free) {
    return ART_TASK_DRAW_MODES.free;
  }
  return ART_TASK_DRAW_MODES.look;
}

export function artTaskSlugFromSteps(
  steps: Array<{ widget?: string; widget_config?: { art_task_slug?: string } }>,
): string | undefined {
  return steps.find((step) => step.widget === 'image_create')?.widget_config?.art_task_slug;
}
