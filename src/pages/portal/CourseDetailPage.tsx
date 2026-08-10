import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { api } from '@/lib/api';
import { marketingHref } from '@/lib/marketing';
import { formatAud } from '@/lib/money';
import {
  type CourseDetailOutlineItem,
  type PortalCourseClass,
  type PortalCourseDetail,
  type PortalCoursePackDetail,
} from './courseDetails';
import { dateTimeLabel, venueLabel } from './myClasses';
import { TeachingTeam } from './teachers/TeachingTeam';

const plainText = (html: string) => {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ');
  const frame = document.createElement('div');
  frame.innerHTML = html;
  return frame.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};

const formatLabel = (detail: PortalCourseDetail, pack?: PortalCoursePackDetail) =>
  detail.page_config?.format === 'workshop'
    ? 'One workshop'
    : detail.page_config?.weeksCount
      ? `${detail.page_config.weeksCount} weeks`
      : `${pack?.lessons?.length ?? 0} lessons`;

const courseMediaUrl = (src: string) =>
  /^(?:https?:|data:|blob:)/.test(src) ? src : marketingHref(src.startsWith('/') ? src : `/${src}`);

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate2">{label}</div>
      <div className="mt-1 text-[15px] font-bold leading-snug text-ink">{value}</div>
    </div>
  );
}

function OutlineCard({
  item,
  index,
  workshop,
}: {
  item: CourseDetailOutlineItem;
  index: number;
  workshop: boolean;
}) {
  const label = workshop ? (item.time ?? `Step ${index + 1}`) : `Lesson ${item.n ?? index + 1}`;
  return (
    <article className="overflow-hidden rounded-2xl border border-hairline bg-canvas-pure shadow-card-soft">
      {item.image && (
        <img
          src={courseMediaUrl(item.image)}
          alt={item.imageAlt || `${item.title} lesson preview`}
          className="aspect-[16/9] w-full border-b border-hairline bg-surface object-cover"
          loading="lazy"
          data-testid="course-outline-image"
        />
      )}
      <div className="p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-coral">
          {label}
        </div>
        <h3 className="mt-2 text-[19px] font-bold leading-tight text-ink">{item.title}</h3>
        {item.focus && (
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{item.focus}</p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {item.ai && <DetailFact label="AI skill" value={item.ai} />}
          {item.ship && <DetailFact label="They make" value={item.ship} />}
        </div>
      </div>
    </article>
  );
}

function UpcomingClassCard({ item }: { item: PortalCourseClass }) {
  return (
    <article className="rounded-2xl border border-hairline bg-canvas-pure p-5 shadow-card-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[19px] font-bold leading-tight text-ink">{item.name}</h3>
          <p className="mt-2 text-[13px] font-semibold text-ink-soft">
            {dateTimeLabel(item.starts_at)}
          </p>
        </div>
        {item.course_total_aud_cents != null && (
          <span className="sticker-sunshine">{formatAud(item.course_total_aud_cents)}</span>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailFact label="Where" value={venueLabel(item.venue)} />
        <DetailFact
          label="Seats"
          value={
            item.seats_remaining > 0
              ? `${item.seats_remaining} of ${item.max_students} available`
              : 'Join the waitlist'
          }
        />
        <DetailFact
          label="Format"
          value={
            item.session_count && item.session_minutes
              ? `${item.session_count} × ${item.session_minutes} min`
              : item.delivery_mode.replace(/_/g, ' ')
          }
        />
        <div className="rounded-2xl bg-wash-sky px-4 py-3 text-[13px]">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate2">
            Teaching team
          </div>
          <TeachingTeam team={item.teaching_team ?? []} />
        </div>
      </div>
      {item.purchasable && item.course_total_aud_cents != null && (
        <Link to={`/portal/checkout/class/${item.id}`} className="btn-pill-primary mt-5">
          Pay &amp; lock a seat
        </Link>
      )}
    </article>
  );
}

export function CourseDetailPage() {
  const { courseSlug = '' } = useParams<{ courseSlug: string }>();
  const detail = useQuery<PortalCourseDetail>({
    queryKey: ['marketing-course', courseSlug],
    queryFn: () => api<PortalCourseDetail>(`/courses/${courseSlug}`),
    enabled: !!courseSlug,
  });
  const classes = useQuery<PortalCourseClass[]>({
    queryKey: ['marketing-course', courseSlug, 'classes'],
    queryFn: () => api<PortalCourseClass[]>(`/courses/${courseSlug}/classes`),
    enabled: !!courseSlug,
  });
  const packs = useQuery<PortalCoursePackDetail[]>({
    queryKey: ['course-packs', 'bookable'],
    queryFn: () => api<PortalCoursePackDetail[]>('/course-packs?bookable=true'),
  });

  if (detail.isLoading) return <p className="lead-text">Loading course details…</p>;

  if (detail.isError || !detail.data) {
    return (
      <div className="card-base text-center">
        <span className="sticker-sunshine">Course unavailable</span>
        <h1 className="section-heading mt-4">We couldn’t load this course.</h1>
        <p className="lead-text mt-3">
          The course may no longer be open for booking, or the details are temporarily unavailable.
        </p>
        <Link to="/portal/courses" className="btn-pill-primary mt-6">
          Browse courses
        </Link>
      </div>
    );
  }

  const course = detail.data;
  const config = course.page_config;
  const pack = packs.data?.find((item) => item.slug === courseSlug);
  const workshop = config?.format === 'workshop';
  const configuredOutline = workshop
    ? config?.sessionAgenda?.length
      ? config.sessionAgenda
      : config?.weeks
    : config?.weeks;
  const outline: CourseDetailOutlineItem[] =
    (configuredOutline?.length ? configuredOutline : undefined) ??
    pack?.lessons?.map((lesson, index) => ({
      n: index + 1,
      title: lesson.title ?? `Lesson ${index + 1}`,
      focus: lesson.focus ?? lesson.description ?? '',
      ai: lesson.ai_skill ?? '',
      ship: lesson.deliverable ?? '',
    })) ??
    [];
  const pricedClass = classes.data?.find((item) => item.course_total_aud_cents != null);
  const priceLabel =
    pricedClass?.course_total_aud_cents != null
      ? formatAud(pricedClass.course_total_aud_cents)
      : config?.priceLabel;
  const priceNote =
    pricedClass?.course_total_aud_cents != null ? 'current open class' : config?.priceNote;
  const description = config?.promiseHtml
    ? plainText(config.promiseHtml)
    : pack?.description || course.seo.description;

  return (
    <div data-testid="portal-course-detail">
      <Link
        to="/portal/courses"
        className="text-[14px] font-bold text-ink underline decoration-brand-coral decoration-2 underline-offset-4"
      >
        ← Back to courses
      </Link>

      <section className="mt-5 overflow-hidden rounded-3xl border border-hairline bg-canvas-pure shadow-card-soft">
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="eyebrow eyebrow-coral">{course.series ?? 'Airbotix course'}</div>
            <h1 className="hero-display mt-2">{course.title}</h1>
            <p className="lead-text mt-5 max-w-3xl">{description}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailFact
                label="Ages"
                value={
                  config?.ageRange ??
                  (pack ? `${pack.target_age_min}–${pack.target_age_max}` : 'Ask us')
                }
              />
              <DetailFact label="Course length" value={formatLabel(course, pack)} />
              <DetailFact label="Session" value={config?.sessionLength ?? 'See class times'} />
              <DetailFact label="Class size" value={config?.cohortSize ?? 'Small group'} />
            </div>
            {priceLabel && (
              <p className="mt-5 text-[15px] font-bold text-ink" data-testid="course-current-price">
                {priceLabel}
                {priceNote && <span className="ml-2 font-medium text-ink-soft">· {priceNote}</span>}
              </p>
            )}
          </div>
          {course.cover_image_url && (
            <img
              src={courseMediaUrl(course.cover_image_url)}
              alt={config?.cardBlurb || course.title}
              className="h-full min-h-64 w-full object-cover"
            />
          )}
        </div>
      </section>

      {(config?.formatBlurb || config?.toolsBlurb) && (
        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Course essentials">
          {config.formatBlurb && (
            <DetailFact label="How the course works" value={config.formatBlurb} />
          )}
          {config.toolsBlurb && <DetailFact label="Tools and setup" value={config.toolsBlurb} />}
        </section>
      )}

      {(config?.aiTracks?.length ?? 0) > 0 && (
        <section className="mt-10" aria-labelledby="course-learning-title">
          <div className="eyebrow eyebrow-mint">What they learn</div>
          <h2 id="course-learning-title" className="section-heading">
            AI skills with a visible result.
          </h2>
          {config?.aiTracksIntro && <p className="lead-text mt-3">{config.aiTracksIntro}</p>}
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {config?.aiTracks.map((track) => (
              <article key={track.title} className="card-base">
                <div className="text-[28px]" aria-hidden="true">
                  {track.icon}
                </div>
                <h3 className="mt-3 text-[18px] font-bold text-ink">{track.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{track.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {outline.length > 0 && (
        <section className="mt-10" aria-labelledby="course-outline-title">
          <div className="eyebrow eyebrow-sky">{workshop ? 'Workshop plan' : 'Course outline'}</div>
          <h2 id="course-outline-title" className="section-heading">
            {workshop ? 'What happens in the session.' : 'What happens each lesson.'}
          </h2>
          {config?.syllabusIntro && <p className="lead-text mt-3">{config.syllabusIntro}</p>}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {outline.map((item, index) => (
              <OutlineCard
                key={`${item.n ?? item.time ?? index}-${item.title}`}
                item={item}
                index={index}
                workshop={workshop}
              />
            ))}
          </div>
        </section>
      )}

      {(config?.outcomes?.length ?? 0) > 0 && (
        <section className="mt-10 rounded-3xl bg-wash-mint p-6 sm:p-8">
          <div className="eyebrow eyebrow-mint">By the end</div>
          <h2 className="section-heading">What your child takes away.</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {config?.outcomes.map((outcome) => (
              <li
                key={outcome}
                className="rounded-2xl bg-canvas-pure px-4 py-3 font-semibold text-ink"
              >
                <span className="mr-2 text-brand-coral" aria-hidden="true">
                  ✓
                </span>
                {outcome}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="course-classes-title">
        <div className="eyebrow eyebrow-sunshine">Upcoming classes</div>
        <h2 id="course-classes-title" className="section-heading">
          Choose a time and location.
        </h2>
        {classes.isLoading && <p className="lead-text mt-4">Checking class times…</p>}
        {classes.isError && (
          <p className="lead-text mt-4">
            Class times are temporarily unavailable. Your course details are still shown above.
          </p>
        )}
        {!classes.isLoading && !classes.isError && (classes.data?.length ?? 0) === 0 && (
          <div className="card-base mt-5">
            <h3 className="text-[18px] font-bold text-ink">No date is open yet.</h3>
            <p className="mt-2 text-[14px] text-ink-soft">
              Tell us you’re interested and we’ll help match the next suitable time.
            </p>
            <Link to="/portal/courses" className="btn-pill-secondary mt-4">
              Ask about this course
            </Link>
          </div>
        )}
        {(classes.data?.length ?? 0) > 0 && (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {classes.data?.map((item) => (
              <UpcomingClassCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {(config?.faqs?.length ?? 0) > 0 && (
        <section className="mt-10" aria-labelledby="course-faq-title">
          <div className="eyebrow eyebrow-bubblegum">Questions parents ask</div>
          <h2 id="course-faq-title" className="section-heading">
            Before you book.
          </h2>
          <div className="mt-5 space-y-3">
            {config?.faqs.map((faq) => (
              <details
                key={faq.q}
                className="rounded-2xl border border-hairline bg-canvas-pure p-5"
              >
                <summary className="cursor-pointer font-bold text-ink">{faq.q}</summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{plainText(faq.a)}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
