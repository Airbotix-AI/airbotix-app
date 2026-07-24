import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { getPublicTeacher } from './teacherApi';

const ROLE_LABEL = {
  lead: 'Lead teacher',
  co_teacher: 'Co-teacher',
  assistant: 'Teaching assistant',
};

const COURSE_FORMAT_LABEL = {
  weekly: 'Weekly course',
  workshop: 'Workshop',
};

export function TeacherDetailPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const teacher = useQuery({
    queryKey: ['public-teacher', slug],
    queryFn: () => getPublicTeacher(slug),
    retry: false,
  });
  const backQuery = params.get('from');
  const backHref = backQuery ? `/portal/teachers?${backQuery}` : '/portal/teachers';

  if (teacher.isLoading) return <p className="lead-text">Loading teacher profile…</p>;
  if (teacher.isError || !teacher.data) {
    return (
      <div className="rounded-3xl bg-wash-sunshine p-8">
        <h1 className="section-heading">This teacher profile is not available.</h1>
        <p className="lead-text mt-3">
          It may be unpublished or temporarily unavailable. No internal account details are shown.
        </p>
        <Link to="/portal/teachers" className="btn-pill-secondary mt-5 inline-flex">
          Browse teachers
        </Link>
      </div>
    );
  }

  const profile = teacher.data;
  const primaryArea =
    profile.service_areas.find((area) => area.is_primary) ?? profile.service_areas[0];
  const requestHref = `/portal/tutoring?teacher=${encodeURIComponent(profile.slug)}${primaryArea ? `&city=${encodeURIComponent(primaryArea.city)}` : ''}`;

  return (
    <div>
      <Link to={backHref} className="mb-5 inline-flex font-semibold text-brand-sky hover:underline">
        ← Back to teachers
      </Link>
      <section
        data-testid="teacher-profile-hero"
        className="grid gap-6 overflow-hidden rounded-3xl border border-hairline bg-canvas-pure p-5 shadow-card-soft sm:p-6 lg:grid-cols-[minmax(200px,0.6fr)_1.4fr] lg:items-center lg:p-8"
      >
        <div className="flex items-center justify-center rounded-3xl bg-wash-sky p-4 sm:p-5">
          <img
            src={profile.avatar_url}
            alt={`${profile.display_name}, Airbotix teacher`}
            className="aspect-square w-full max-w-44 rounded-3xl object-cover shadow-card-soft sm:max-w-52 lg:max-w-56"
          />
        </div>
        <div className="min-w-0">
          <div className="eyebrow eyebrow-sky">Approved Airbotix teacher</div>
          <h1 className="section-heading mt-2">{profile.display_name}</h1>
          <p className="mt-2 text-[18px] font-bold text-brand-sky">{profile.headline}</p>
          <ul
            className="mt-4 flex flex-wrap gap-2"
            aria-label={`${profile.display_name} profile summary`}
          >
            {primaryArea && (
              <li className="rounded-full bg-wash-sky px-3 py-1.5 text-[11px] font-bold text-ink-soft">
                {primaryArea.city}, {primaryArea.state}
              </li>
            )}
            {profile.age_range && (
              <li className="rounded-full bg-wash-mint px-3 py-1.5 text-[11px] font-bold text-ink-soft">
                Ages {profile.age_range.min}–{profile.age_range.max}
              </li>
            )}
            {profile.spoken_languages.slice(0, 2).map((language) => (
              <li
                key={language}
                className="rounded-full bg-wash-sunshine px-3 py-1.5 text-[11px] font-bold text-ink-soft"
              >
                {language}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Teaching interests">
            {profile.expertise_topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink-soft"
              >
                {topic}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link to={requestHref} className="btn-pill-primary inline-flex">
              Request this teacher
            </Link>
            <p className="max-w-md text-[12px] font-medium leading-5 text-ink-soft">
              This records a preference only. Airbotix confirms the teacher, venue, price and time
              before booking.
            </p>
          </div>
        </div>
      </section>

      {profile.bio && (
        <InfoSection title={`About ${profile.display_name}`} className="mt-6">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-soft">{profile.bio}</p>
        </InfoSection>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <InfoSection title="In-person service areas">
          {profile.service_areas.map((area) => (
            <div key={`${area.city}-${area.area_label}`} className="rounded-2xl bg-wash-mint p-4">
              <p className="font-bold">{area.area_label}</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {area.city}, {area.state}
                {area.suburbs.length ? ` · ${area.suburbs.join(', ')}` : ''}
              </p>
            </div>
          ))}
        </InfoSection>
        <InfoSection title="Approved course capabilities">
          {profile.courses.map((course) => (
            <Link
              key={course.slug}
              to={`/portal/courses?course=${encodeURIComponent(course.slug)}`}
              className="group/course flex items-center gap-4 rounded-2xl bg-wash-sky p-4 transition-transform hover:-translate-y-0.5"
            >
              {course.cover_image_url ? (
                <img
                  src={course.cover_image_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-canvas-pure text-[26px]"
                >
                  ✦
                </span>
              )}
              <span className="min-w-0">
                {course.format && (
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate2">
                    {COURSE_FORMAT_LABEL[course.format]}
                  </span>
                )}
                <span className="mt-1 block font-bold leading-5 text-ink">{course.title}</span>
                <span className="mt-1 block text-[12px] font-semibold text-brand-sky group-hover/course:underline">
                  Explore course →
                </span>
              </span>
            </Link>
          ))}
          <p className="text-[12px] text-ink-soft">
            Capability does not mean this teacher is assigned to every class.
          </p>
        </InfoSection>
      </div>

      {profile.upcoming_classes.length > 0 && (
        <section className="mt-6 rounded-3xl bg-surface p-6 shadow-card-soft">
          <div className="eyebrow eyebrow-coral">Actual assignments</div>
          <h2 className="mt-2 text-[24px] font-bold">Upcoming classes</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {profile.upcoming_classes.map((item) => (
              <article key={item.id} className="rounded-2xl border border-hairline p-5">
                <span className="sticker-sky alt">{ROLE_LABEL[item.role]}</span>
                <h3 className="mt-3 text-[18px] font-bold">{item.name}</h3>
                <p className="mt-2 text-[13px] text-ink-soft">
                  {new Date(item.starts_at).toLocaleString('en-AU', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {item.venue ? `${item.venue.name} · ${item.venue.city}` : 'Venue to be confirmed'}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {profile.upcoming_classes.length === 0 && (
        <section
          data-testid="teacher-availability-empty"
          className="mt-6 rounded-3xl border border-hairline bg-canvas-pure p-6 shadow-card-soft"
        >
          <div className="eyebrow eyebrow-coral">Current availability</div>
          <h2 className="mt-2 text-[24px] font-bold">No public class is scheduled yet</h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-ink-soft">
            You can still request this teacher. Airbotix will check availability and confirm the
            teacher, venue, schedule and price before any booking.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to={requestHref} className="btn-pill-primary">
              Request this teacher
            </Link>
            <Link to="/portal/classes" className="btn-pill-secondary">
              Browse scheduled classes
            </Link>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl bg-ink p-6 text-canvas shadow-card-soft sm:p-8">
        <div className="eyebrow eyebrow-mint">Clear next steps</div>
        <h2 className="mt-2 text-[24px] font-bold text-canvas">How a teacher request works</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            [
              '1',
              'Share your needs',
              'Tell us about your child, learning goal and preferred times.',
            ],
            [
              '2',
              'We check availability',
              'Airbotix confirms the teacher, venue, schedule and price.',
            ],
            ['3', 'You choose', 'Review the confirmed option before deciding whether to book.'],
          ].map(([step, title, description]) => (
            <li key={step} className="rounded-2xl bg-white/10 p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-coral text-[13px] font-extrabold text-white">
                {step}
              </span>
              <h3 className="mt-3 text-[16px] font-bold text-canvas">{title}</h3>
              <p className="mt-2 text-[12px] leading-5 text-canvas/80">{description}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function InfoSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 rounded-3xl bg-surface p-6 shadow-card-soft ${className}`}>
      <h2 className="text-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}
