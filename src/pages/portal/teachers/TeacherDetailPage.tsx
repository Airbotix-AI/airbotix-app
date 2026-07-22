import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { getPublicTeacher } from './teacherApi';

const ROLE_LABEL = {
  lead: 'Lead teacher',
  co_teacher: 'Co-teacher',
  assistant: 'Teaching assistant',
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
      <section className="grid gap-8 overflow-hidden rounded-3xl bg-surface p-6 shadow-card-soft lg:grid-cols-[minmax(240px,0.7fr)_1.3fr] lg:p-8">
        <img
          src={profile.avatar_url}
          alt={`${profile.display_name}, Airbotix teacher`}
          className="aspect-[4/5] w-full rounded-3xl object-cover"
        />
        <div>
          <div className="eyebrow eyebrow-sky">Approved Airbotix profile</div>
          <h1 className="section-heading mt-2">{profile.display_name}</h1>
          <p className="mt-3 text-[20px] font-bold text-brand-sky">{profile.headline}</p>
          <p className="lead-text mt-5 whitespace-pre-wrap">{profile.bio}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.expertise_topics.map((topic) => (
              <span key={topic} className="sticker-mint">
                {topic}
              </span>
            ))}
          </div>
          <Link to={requestHref} className="btn-pill-primary mt-6 inline-flex">
            Request this teacher
          </Link>
          <p className="mt-3 max-w-xl text-[12px] font-medium text-ink-soft">
            This records a preference only. Airbotix confirms the actual teacher, venue, price and
            time before booking.
          </p>
        </div>
      </section>

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
              className="block rounded-2xl bg-wash-sky p-4 font-bold hover:underline"
            >
              {course.title}
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
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl bg-surface p-6 shadow-card-soft">
      <h2 className="text-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}
