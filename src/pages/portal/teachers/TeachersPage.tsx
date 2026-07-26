import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { listPublicTeachers, type TeacherFilters } from './teacherApi';

function filtersFromParams(params: URLSearchParams): TeacherFilters {
  const parsedAge = Number(params.get('age'));
  return {
    city: params.get('city') || undefined,
    course: params.get('course') || undefined,
    age: Number.isInteger(parsedAge) && parsedAge > 0 ? parsedAge : undefined,
    language: params.get('language') || undefined,
  };
}

export function TeachersPage() {
  const [params, setParams] = useSearchParams();
  const filters = filtersFromParams(params);
  const options = useQuery({
    queryKey: ['public-teachers', 'options'],
    queryFn: () => listPublicTeachers(),
  });
  const teachers = useQuery({
    queryKey: ['public-teachers', 'results', filters],
    queryFn: () => listPublicTeachers(filters),
  });

  const all = options.data ?? [];
  const cities = [
    ...new Set(all.flatMap((teacher) => teacher.service_areas.map((area) => area.city))),
  ].sort();
  const courses = [
    ...new Map(
      all.flatMap((teacher) => teacher.courses).map((course) => [course.slug, course]),
    ).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));
  const languages = [...new Set(all.flatMap((teacher) => teacher.spoken_languages))].sort();

  const setFilter = (name: keyof TeacherFilters, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-mint">Local teaching team</div>
        <h1 className="section-heading">Meet our teachers</h1>
        <p className="lead-text mt-3 max-w-3xl">
          Find approved Airbotix teachers by city and teaching interests. Course capability is
          separate from the teacher actually assigned to a specific class.
        </p>
      </div>

      <section
        aria-label="Teacher filters"
        className="mb-8 grid gap-4 rounded-3xl bg-surface p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Filter
          label="City"
          value={filters.city ?? ''}
          onChange={(value) => setFilter('city', value)}
        >
          <option value="">All available cities</option>
          {cities.map((city) => (
            <option key={city}>{city}</option>
          ))}
        </Filter>
        <Filter
          label="Course"
          value={filters.course ?? ''}
          onChange={(value) => setFilter('course', value)}
        >
          <option value="">All approved courses</option>
          {courses.map((course) => (
            <option key={course.slug} value={course.slug}>
              {course.title}
            </option>
          ))}
        </Filter>
        <Filter
          label="Child age"
          value={filters.age ? String(filters.age) : ''}
          onChange={(value) => setFilter('age', value)}
        >
          <option value="">All ages</option>
          {Array.from({ length: 14 }, (_, index) => index + 5).map((age) => (
            <option key={age} value={age}>
              Age {age}
            </option>
          ))}
        </Filter>
        <Filter
          label="Language"
          value={filters.language ?? ''}
          onChange={(value) => setFilter('language', value)}
        >
          <option value="">All languages</option>
          {languages.map((language) => (
            <option key={language}>{language}</option>
          ))}
        </Filter>
      </section>

      {teachers.isLoading && <p className="lead-text">Loading teachers…</p>}
      {teachers.isError && (
        <div className="rounded-3xl bg-wash-sunshine p-6">
          <h2 className="text-[20px] font-bold">Teacher profiles are unavailable right now.</h2>
          <p className="mt-2 text-[14px] text-ink-soft">
            Please try again shortly. We do not show unreviewed fallback profiles.
          </p>
          <button type="button" className="btn-pill-ghost mt-4" onClick={() => teachers.refetch()}>
            Retry
          </button>
        </div>
      )}
      {!teachers.isLoading && !teachers.isError && teachers.data?.length === 0 && (
        <div className="rounded-3xl bg-surface p-8 text-center">
          <h2 className="text-[22px] font-bold">No published teachers match these filters yet.</h2>
          <p className="mt-2 text-[14px] text-ink-soft">
            Clear a filter or ask our team about the next local cohort.
          </p>
        </div>
      )}
      {teachers.data && teachers.data.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          {teachers.data.map((teacher) => (
            <article
              key={teacher.slug}
              data-testid={`teacher-card-${teacher.slug}`}
              className="group grid overflow-hidden rounded-3xl border border-hairline bg-canvas-pure shadow-card-soft transition-transform duration-200 hover:-translate-y-1 sm:grid-cols-[minmax(150px,34%)_1fr]"
            >
              <div className="flex items-center justify-center bg-wash-sky p-5 sm:p-4">
                <img
                  src={teacher.avatar_url}
                  alt={`${teacher.display_name}, Airbotix teacher`}
                  className="aspect-square w-full max-w-48 rounded-2xl object-cover shadow-card-soft"
                />
              </div>
              <div className="flex min-w-0 flex-col p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate2">
                    {teacher.service_areas.map((area) => area.city).join(' · ')}
                  </p>
                  {teacher.age_range && (
                    <span className="rounded-full bg-wash-mint px-2.5 py-1 text-[10px] font-bold text-ink-soft">
                      Ages {teacher.age_range.min}–{teacher.age_range.max}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-[23px] font-extrabold leading-tight text-ink">
                  {teacher.display_name}
                </h2>
                <p className="mt-1 text-[14px] font-semibold leading-5 text-brand-sky">
                  {teacher.headline}
                </p>
                <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-ink-soft">
                  {teacher.bio}
                </p>
                {teacher.expertise_topics.length > 0 && (
                  <ul
                    className="mt-4 flex flex-wrap gap-2"
                    aria-label={`${teacher.display_name} expertise`}
                  >
                    {teacher.expertise_topics.slice(0, 2).map((topic) => (
                      <li
                        key={topic}
                        className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-ink-soft"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to={`/portal/teachers/${teacher.slug}${params.size ? `?from=${encodeURIComponent(params.toString())}` : ''}`}
                  className="mt-5 inline-flex min-h-11 items-center self-start rounded-full border-2 border-ink px-5 py-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-canvas sm:mt-auto sm:pt-2"
                >
                  View profile <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="label-k12">{label}</span>
      <select
        className="input-k12"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
