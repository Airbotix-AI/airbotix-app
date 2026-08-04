import { api } from '@/lib/api';

export interface HscCourse {
  key: string;
  display_name: string;
  units: number;
  requires_school_confirmation: boolean;
}

export interface HscTask {
  id: string;
  label: string;
  due_date: string;
  weight: number;
  achieved_mark: number | null;
  maximum_mark: number | null;
  status: 'planned' | 'completed';
  provenance: 'manual' | 'claim';
  rules_version: string;
  version: number;
}

export interface HscSubject {
  id: string;
  course_key: string;
  display_name: string;
  units: number;
  confirmation_status: 'confirmed' | 'confirm_with_school';
  sort_order: number;
  version: number;
  progress: {
    completed_weight: number;
    weighted_contribution: number;
    running_result_over_completed_work: number | null;
    remaining_weight: number;
  };
  tasks: HscTask[];
}

export interface HscPlan {
  id: string;
  family_id: string;
  kid: { id: string; nickname: string };
  school_year: number;
  status: 'active' | 'archived';
  version: number;
  activation_status: 'active' | 'setup_required';
  subjects: HscSubject[];
}

export interface HscClaimPreview {
  rules_version: string;
  expires_at: string;
  tasks: Array<{
    id: string;
    achieved_mark: number;
    maximum_mark: number;
    weight: number;
  }>;
}

export const listHscCourses = () =>
  api<{ version: string; source_url: string; courses: HscCourse[] }>('/hsc/courses');

export const listHscPlans = (familyId: string) =>
  api<HscPlan[]>(`/families/${familyId}/hsc-plans`);

export const createHscPlan = (familyId: string, kidId: string, schoolYear: number) =>
  api<HscPlan>(`/families/${familyId}/hsc-plans`, {
    method: 'POST',
    body: { kid_id: kidId, school_year: schoolYear },
  });

export const previewHscClaim = (familyId: string, claimToken: string) =>
  api<HscClaimPreview>(`/families/${familyId}/hsc-plans/claim/preview`, {
    method: 'POST',
    body: { claim_token: claimToken },
  });

export interface ImportHscClaimInput {
  claim_token: string;
  kid_id: string;
  school_year: number;
  course_key: string;
  display_name?: string;
  tasks: Array<{ claim_task_id: string; label: string; due_date: string }>;
}

export const importHscClaim = (familyId: string, input: ImportHscClaimInput) =>
  api<HscPlan>(`/families/${familyId}/hsc-plans/claim`, { method: 'POST', body: input });

export const addHscSubject = (
  familyId: string,
  planId: string,
  input: { course_key: string; display_name?: string },
) =>
  api<HscPlan>(`/families/${familyId}/hsc-plans/${planId}/subjects`, {
    method: 'POST',
    body: input,
  });

export const addHscTask = (
  familyId: string,
  subjectId: string,
  input: {
    label: string;
    due_date: string;
    weight: number;
    status: 'planned' | 'completed';
    achieved_mark?: number;
    maximum_mark?: number;
  },
) =>
  api<HscPlan>(`/families/${familyId}/hsc-subjects/${subjectId}/tasks`, {
    method: 'POST',
    body: input,
  });

// Deletion (hsc-ai-family-planner-prd.md §6.2). These remove the rows outright
// — they are not the `archived` flag, which hides a subject but keeps the marks.
export const deleteHscPlan = (familyId: string, planId: string) =>
  api<{ deleted: true }>(`/families/${familyId}/hsc-plans/${planId}`, { method: 'DELETE' });

export const deleteHscSubject = (familyId: string, subjectId: string) =>
  api<HscPlan>(`/families/${familyId}/hsc-subjects/${subjectId}`, { method: 'DELETE' });

export const deleteHscTask = (familyId: string, taskId: string) =>
  api<HscPlan>(`/families/${familyId}/hsc-tasks/${taskId}`, { method: 'DELETE' });

export const getMyHscPlan = () => api<HscPlan | null>('/hsc/me/plan', { principal: 'kid' });
