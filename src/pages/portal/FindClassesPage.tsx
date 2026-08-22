import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';
import type { AvailableClass } from './availableClasses';
import { ClassesTimetable } from './ClassesTimetable';
import type { MarketingCourseCard } from './courseComparison';
import { MyClassesPanel } from './MyClassesPanel';

interface CityOption {
  city: string;
  state: string;
}

interface CitiesResponse {
  cities: CityOption[];
  has_online: boolean;
}

interface MarketingCourseDetail {
  page_config: {
    plannedOfferings?: NonNullable<MarketingCourseCard['planned_offerings']>;
  } | null;
}

const ALL_CITIES = '__all__';
const ONLINE = '__online__';

const classesPath = (city: string) => {
  if (city === ALL_CITIES) return '/class-seats/classes';
  if (city === ONLINE) return '/class-seats/classes?online=true';
  return `/class-seats/classes?city=${encodeURIComponent(city)}`;
};

export function FindClassesPage() {
  // This is a catalogue filter, not a family-profile preference. Always begin
  // with the complete bookable catalogue so classes in other cities stay discoverable.
  const [selectedCity, setSelectedCity] = useState(ALL_CITIES);
  const cities = useQuery<CitiesResponse>({
    queryKey: ['class-seats', 'cities'],
    queryFn: () => api<CitiesResponse>('/class-seats/cities'),
  });

  const classes = useQuery<AvailableClass[]>({
    queryKey: ['class-seats', 'classes', selectedCity],
    queryFn: () => api<AvailableClass[]>(classesPath(selectedCity)),
  });
  const courseCatalog = useQuery<MarketingCourseCard[]>({
    queryKey: ['marketing-courses', 'planned-classes', 'details-v1'],
    queryFn: async () => {
      const cards = await api<MarketingCourseCard[]>('/courses');
      return Promise.all(
        cards.map(async (card) => {
          if ((card.planned_offerings?.length ?? 0) > 0) return card;
          const detail = await api<MarketingCourseDetail>(`/courses/${encodeURIComponent(card.slug)}`);
          return {
            ...card,
            planned_offerings: detail.page_config?.plannedOfferings ?? [],
          };
        }),
      );
    },
  });

  const plannedClasses = useMemo(
    () =>
      (courseCatalog.data ?? []).flatMap((course) =>
        (course.planned_offerings ?? []).map((offering) => ({
          ...offering,
          slug: course.slug,
          title: course.title,
          ageRange: course.age_range,
        })),
      ),
    [courseCatalog.data],
  );
  const options = useMemo(() => {
    const byCity = new Map<string, CityOption>();
    for (const option of cities.data?.cities ?? []) byCity.set(option.city, option);
    for (const offering of plannedClasses) {
      if (!byCity.has(offering.city)) {
        byCity.set(offering.city, { city: offering.city, state: offering.state });
      }
    }
    return [...byCity.values()].sort((a, b) => a.city.localeCompare(b.city));
  }, [cities.data?.cities, plannedClasses]);
  const visiblePlannedClasses = useMemo(() => {
    if (selectedCity === ONLINE) return [];
    const publishedKeys = new Set(
      (classes.data ?? []).map(
        (item) => `${item.course_pack?.slug ?? ''}:${item.venue?.city ?? ''}`,
      ),
    );
    return plannedClasses.filter(
      (item) =>
        (selectedCity === ALL_CITIES || item.city === selectedCity) &&
        !publishedKeys.has(`${item.slug}:${item.city}`),
    );
  }, [classes.data, plannedClasses, selectedCity]);
  const totalVisible = (classes.data?.length ?? 0) + visiblePlannedClasses.length;
  const scopeLabel =
    selectedCity === ALL_CITIES
      ? 'across all cities'
      : selectedCity === ONLINE
        ? 'online'
        : `in ${selectedCity}`;

  const onCityChange = (city: string) => {
    if (!city) return;
    setSelectedCity(city);
  };

  return (
    <div>
      <MyClassesPanel compact />

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Find a class</div>
          <h1 className="section-heading">Class timetable</h1>
          <p className="lead-text mt-3 max-w-3xl">
            Compare every course by city and school period. Swipe the timetable sideways on smaller screens.
          </p>
        </div>
        <label className="min-w-[240px]">
          <span className="label-k12">City</span>
          <select
            className="input-k12"
            value={selectedCity}
            onChange={(event) => onCityChange(event.target.value)}
          >
            <option value={ALL_CITIES}>All cities</option>
            {options.map((option) => (
              <option key={`${option.city}-${option.state}`} value={option.city}>
                {option.city}, {option.state}
              </option>
            ))}
            {cities.data?.has_online && <option value={ONLINE}>Online</option>}
          </select>
        </label>
      </div>

      {(classes.isLoading || courseCatalog.isLoading) && (
        <p className="lead-text">Loading classes…</p>
      )}

      {!classes.isLoading && classes.isError && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Couldn’t load classes</span>
          <p className="lead-text mt-4">
            Something went wrong loading classes. This is on us, not you — please try again.
          </p>
          <button
            type="button"
            onClick={() => classes.refetch()}
            className="btn-pill-secondary mt-6"
          >
            Try again
          </button>
        </div>
      )}

      {!classes.isLoading &&
        !courseCatalog.isLoading &&
        !classes.isError &&
        totalVisible === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">No open seats</span>
          <p className="lead-text mt-4">
            There are no purchasable classes {scopeLabel} yet. You can still request a seat and
            we’ll help match a time.
          </p>
          <Link to="/portal/courses" className="btn-pill-secondary mt-6">
            Request a seat
          </Link>
        </div>
        )}

      {!classes.isLoading && !courseCatalog.isLoading && !classes.isError && totalVisible > 0 && (
        <p className="mb-4 text-[13px] font-bold text-slate2" aria-live="polite">
          {totalVisible} {totalVisible === 1 ? 'course' : 'courses'} {scopeLabel}
        </p>
      )}

      {!classes.isLoading && !courseCatalog.isLoading && !classes.isError && totalVisible > 0 && (
        <ClassesTimetable bookable={classes.data ?? []} planned={visiblePlannedClasses} />
      )}
    </div>
  );
}
