import type { PortalVenue } from './myClasses';
import type { PublicTeachingTeamMember } from './teachers/teacherApi';

export interface CourseDetailTrack {
  tone: 'coral' | 'bubblegum' | 'sunshine' | 'sky' | 'mint';
  icon: string;
  title: string;
  body: string;
}

export interface CourseDetailOutlineItem {
  n?: number;
  time?: string;
  title: string;
  focus: string;
  ai: string;
  ship: string;
  image?: string;
  imageAlt?: string;
}

export interface CourseDetailConfig {
  promiseHtml: string;
  ageRange: string;
  weeksCount: number;
  format?: 'weekly' | 'workshop';
  cardBlurb: string;
  aiTracksIntro: string;
  aiTracks: CourseDetailTrack[];
  syllabusIntro: string;
  sessionAgenda?: CourseDetailOutlineItem[];
  weeks: CourseDetailOutlineItem[];
  outcomes: string[];
  faqs: Array<{ q: string; a: string }>;
  priceLabel: string;
  priceNote: string;
  sessionLength: string;
  cohortSize: string;
  formatBlurb: string;
  toolsBlurb: string;
}

export interface PortalCourseDetail {
  slug: string;
  title: string;
  series: string | null;
  page_type: 'template' | 'custom';
  cover_image_url: string | null;
  seo: { name: string; description: string };
  page_config: CourseDetailConfig | null;
}

export interface PortalCourseClass {
  id: string;
  name: string;
  delivery_mode: string;
  starts_at: string;
  ends_at: string;
  max_students: number;
  seats_remaining: number;
  venue: PortalVenue | null;
  course_total_aud_cents: number | null;
  session_count: number | null;
  session_minutes: number | null;
  purchasable?: boolean;
  teaching_team?: PublicTeachingTeamMember[];
}

export interface PortalCoursePackDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  lessons: Array<{
    id: string;
    title?: string;
    description?: string;
    focus?: string | null;
    ai_skill?: string | null;
    deliverable?: string | null;
  }>;
}
