import { api } from '@/lib/api';

export interface PublicTeacherCourse {
  slug: string;
  title: string;
  cover_image_url: string | null;
  format: 'weekly' | 'workshop' | null;
}

export interface PublicTeacherServiceArea {
  city: string;
  state: string;
  area_label: string;
  suburbs: string[];
  is_primary: boolean;
}

export interface PublicTeacher {
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string;
  hero_image_url: string | null;
  spoken_languages: string[];
  expertise_topics: string[];
  age_range: { min: number; max: number } | null;
  service_areas: PublicTeacherServiceArea[];
  courses: PublicTeacherCourse[];
}

export interface PublicTeacherDetail extends PublicTeacher {
  upcoming_classes: Array<{
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    role: 'lead' | 'co_teacher' | 'assistant';
    venue: null | { name: string; city: string; state: string; suburb: string; postcode: string };
    course: null | { slug: string; title: string };
  }>;
}

export interface PublicTeachingTeamMember {
  slug: string;
  display_name: string;
  avatar_url: string | null;
  role: 'lead' | 'co_teacher' | 'assistant';
}

export interface TeacherFilters {
  city?: string;
  course?: string;
  age?: number;
  language?: string;
}

export function teacherListPath(filters: TeacherFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.city) params.set('city', filters.city);
  if (filters.course) params.set('course', filters.course);
  if (filters.age) params.set('age', String(filters.age));
  if (filters.language) params.set('language', filters.language);
  return `/teachers${params.size ? `?${params.toString()}` : ''}`;
}

export const listPublicTeachers = (filters?: TeacherFilters) =>
  api<PublicTeacher[]>(teacherListPath(filters));

export const getPublicTeacher = (slug: string) =>
  api<PublicTeacherDetail>(`/teachers/${encodeURIComponent(slug)}`);
