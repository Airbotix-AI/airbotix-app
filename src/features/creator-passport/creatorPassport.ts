import { api } from '@/lib/api';

export type CreatorCapabilityCode =
  | 'idea_builder'
  | 'prompt_director'
  | 'bug_hunter'
  | 'game_tester'
  | 'project_presenter';

export interface RubricItem {
  id: string;
  label: string;
}

export interface CapabilityDefinition {
  id: string;
  code: CreatorCapabilityCode;
  version: number;
  display_name: string;
  rubric: RubricItem[];
  age_adaptations: Record<string, string>;
}

export interface PassportEvidence {
  id: string;
  status: 'draft' | 'submitted' | 'needs_another_try' | 'verified';
  child_reflection: { format: string; text: string; entered_by: 'kid' | 'teacher' };
  rubric_checks: Record<string, boolean>;
  teacher_note: string | null;
  return_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
  definition: CapabilityDefinition;
  project: { id: string; title: string; kind: string; status?: string };
  class: { id: string; name: string };
  session?: { id: string; scheduled_starts_at: string };
  award: {
    id: string;
    awarded_at: string;
    revoked_at: string | null;
  } | null;
}

export interface CreatorPassport {
  kid: { id: string; nickname: string };
  capabilities: CapabilityDefinition[];
  evidence: PassportEvidence[];
  showcase_eligibility: {
    status: 'eligible' | 'not_eligible';
    reasons: string[];
    unique_capability_count: number;
    qualifying_project_count: number;
    qualifying_workshop_count: number;
    includes_project_presenter: boolean;
  };
}

export interface WorkshopStampPlan {
  id: string;
  class_id: string;
  session_id: string;
  submission_deadline_at: string;
  status: 'draft' | 'published' | 'archived';
  primary_definition: CapabilityDefinition;
  secondary_definition: CapabilityDefinition | null;
  session: { id: string; scheduled_starts_at: string; scheduled_ends_at: string };
}

export const CAPABILITY_COPY: Record<
  CreatorCapabilityCode,
  { label: string; description: string }
> = {
  idea_builder: {
    label: 'Idea Builder',
    description: 'Turn your own idea into a clear goal for a real creation.',
  },
  prompt_director: {
    label: 'Prompt Director',
    description: 'Guide AI through more than one round and explain what changed.',
  },
  bug_hunter: {
    label: 'Bug Hunter',
    description: 'Find a real problem, repair it and prove that the fix worked.',
  },
  game_tester: {
    label: 'Game Tester',
    description: 'Test different situations, use feedback and improve the experience.',
  },
  project_presenter: {
    label: 'Project Presenter',
    description: 'Show a real project and explain your goal, choices and improvements.',
  },
};

export function fetchCreatorPassport(kidId: string): Promise<CreatorPassport> {
  return api<CreatorPassport>(`/kids/${kidId}/creator-passport`);
}

export function fetchWorkshopStampPlans(classId: string): Promise<WorkshopStampPlan[]> {
  return api<WorkshopStampPlan[]>(`/classes/${classId}/creator-passport/plan`);
}
