import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { PublicTeacher } from './teachers/teacherApi';

const MAX_TOPICS_PER_CARD = 3;

interface BookableTeachersProps {
  teachers: PublicTeacher[];
  isLoading: boolean;
  isError: boolean;
  selectedSlug: string;
  onSelect: (slug: string) => void;
}

function initialsOf(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * The avatar is a remote URL owned by the teacher profile, so it can 404 (or not
 * be set at all before a photo is uploaded). Falling back to initials keeps the
 * card readable instead of rendering a broken-image icon in the middle of it.
 */
function TeacherAvatar({ teacher }: { teacher: PublicTeacher }) {
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(teacher.display_name);

  if (!teacher.avatar_url || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex aspect-square w-16 shrink-0 items-center justify-center rounded-2xl bg-wash-sky text-[18px] font-extrabold text-brand-sky"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={teacher.avatar_url}
      alt={`${teacher.display_name}, Airbotix teacher`}
      onError={() => setFailed(true)}
      className="aspect-square w-16 shrink-0 rounded-2xl object-cover shadow-card-soft"
    />
  );
}

/**
 * The bookable teacher list on `/portal/tutoring`. Parents asked "who can I
 * actually book?" — that answer used to live only inside the collapsed booking
 * form's `<select>`, so the page showed no teachers at all until the form was
 * opened. This renders the same published directory up front and lets a card
 * preselect the teacher the form submits as a preference.
 */
export function BookableTeachers({
  teachers,
  isLoading,
  isError,
  selectedSlug,
  onSelect,
}: BookableTeachersProps) {
  if (isLoading) {
    return (
      <div className="border-t border-brand-sky/20 px-6 py-5 sm:px-8">
        <p className="lead-text">Loading teachers…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border-t border-brand-sky/20 px-6 py-5 sm:px-8">
        <p className="text-[14px] font-semibold text-ink-soft">
          We couldn’t load teacher profiles right now. You can still send a general request and
          we’ll match a teacher for you.
        </p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="border-t border-brand-sky/20 px-6 py-5 sm:px-8">
        <p className="text-[14px] font-semibold text-ink-soft">
          No teacher profiles are published for your area yet. Send a request and we’ll match a
          teacher for you.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Teachers you can book"
      data-testid="bookable-teachers"
      className="border-t border-brand-sky/20 px-6 py-5 sm:px-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          Teachers you can book
        </h3>
        <Link
          to="/portal/teachers"
          className="text-[13px] font-bold text-brand-sky hover:underline"
        >
          See all profiles →
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {teachers.map((teacher) => {
          const isSelected = teacher.slug === selectedSlug;
          const cities = (teacher.service_areas ?? []).map((area) => area.city).join(' · ');
          const topics = (teacher.expertise_topics ?? []).slice(0, MAX_TOPICS_PER_CARD);
          return (
            <li
              key={teacher.slug}
              data-testid={`bookable-teacher-${teacher.slug}`}
              className={`flex gap-4 rounded-2xl border-2 bg-canvas-pure p-4 ${
                isSelected ? 'border-brand-sky' : 'border-hairline'
              }`}
            >
              <TeacherAvatar teacher={teacher} />
              <div className="flex min-w-0 flex-col">
                <span className="text-[16px] font-extrabold leading-tight text-ink">
                  {teacher.display_name}
                </span>
                {teacher.headline && (
                  <span className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5 text-brand-sky">
                    {teacher.headline}
                  </span>
                )}
                <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate2">
                  {cities}
                  {teacher.age_range
                    ? ` · Ages ${teacher.age_range.min}–${teacher.age_range.max}`
                    : ''}
                </span>
                {topics.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {topics.map((topic) => (
                      <li
                        key={topic}
                        className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onSelect(teacher.slug)}
                    aria-pressed={isSelected}
                    className={isSelected ? 'btn-pill-secondary' : 'btn-pill-primary'}
                  >
                    {isSelected ? 'Selected ✓' : `Book ${teacher.display_name}`}
                  </button>
                  <Link
                    to={`/portal/teachers/${teacher.slug}`}
                    className="text-[13px] font-bold text-ink-soft hover:underline"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] font-medium text-ink-soft">
        Choosing a teacher records a preference. The actual teacher, venue and time are confirmed
        with you before anything is booked.
      </p>
    </section>
  );
}
