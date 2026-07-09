import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { MyClassesPanel } from './MyClassesPanel';
import { dateTimeLabel, type PortalVenue, venueLabel } from './myClasses';

interface FamilyData {
  id: string;
  city: string | null;
  state: string | null;
}

interface CityOption {
  city: string;
  state: string;
}

interface CitiesResponse {
  cities: CityOption[];
  has_online: boolean;
}

interface AvailableClass {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  seats_remaining: number;
  max_students: number;
  delivery_mode: string;
  venue: PortalVenue | null;
  course_total_aud_cents: number | null;
  session_count: number | null;
  session_minutes: number | null;
  course_pack: { id: string; slug: string; title: string } | null;
}

const CITY_STORAGE_KEY = 'airbotix:portal:class-city';
const ALL_CITIES = '__all__';
const ONLINE = '__online__';

// `null` means the parent has made no explicit choice yet (first visit). Only then
// do we seed the select from Family.city; an explicit stored choice is never overridden.
const readStoredCity = (): string | null => {
  try {
    return window.localStorage?.getItem(CITY_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};
const writeStoredCity = (city: string) => {
  try {
    window.localStorage?.setItem(CITY_STORAGE_KEY, city);
  } catch {
    // Storage can be unavailable in embedded or test contexts; city still works in memory.
  }
};

const classesPath = (city: string) => {
  if (city === ALL_CITIES) return '/class-seats/classes';
  if (city === ONLINE) return '/class-seats/classes?online=true';
  return `/class-seats/classes?city=${encodeURIComponent(city)}`;
};

export function FindClassesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  // `null` until the parent chooses; renders as "All cities" and lets the
  // first-visit family-city default seed the select exactly once.
  const [selectedCity, setSelectedCity] = useState<string | null>(readStoredCity);
  const seededFromFamily = useRef(false);
  const effectiveCity = selectedCity ?? ALL_CITIES;

  const family = useQuery<FamilyData>({
    queryKey: ['families', familyId],
    queryFn: () => api<FamilyData>(`/families/${familyId}`),
    enabled: !!familyId,
  });
  const cities = useQuery<CitiesResponse>({
    queryKey: ['class-seats', 'cities'],
    queryFn: () => api<CitiesResponse>('/class-seats/cities'),
  });

  useEffect(() => {
    // Seed from Family.city ONLY on first visit (no stored/explicit choice), once.
    // An explicit choice (including "All cities") makes selectedCity non-null and is never overridden.
    if (seededFromFamily.current || selectedCity !== null) return;
    const city = family.data?.city;
    if (city) {
      seededFromFamily.current = true;
      setSelectedCity(city);
    }
  }, [family.data?.city, selectedCity]);

  const classes = useQuery<AvailableClass[]>({
    queryKey: ['class-seats', 'classes', effectiveCity],
    queryFn: () => api<AvailableClass[]>(classesPath(effectiveCity)),
  });

  const updateCity = useMutation({
    mutationFn: (city: string) =>
      familyId && city !== ALL_CITIES && city !== ONLINE
        ? api(`/families/${familyId}`, { method: 'PATCH', body: { city } })
        : Promise.resolve(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });

  const options = useMemo(() => cities.data?.cities ?? [], [cities.data?.cities]);

  const onCityChange = (city: string) => {
    if (!city) return;
    setSelectedCity(city);
    writeStoredCity(city);
    // Persist to the family profile only for a real city — never "All cities"/"Online".
    const isRealCity = city !== ALL_CITIES && city !== ONLINE;
    if (isRealCity && family.data?.city !== city) updateCity.mutate(city);
  };

  return (
    <div>
      <MyClassesPanel compact />

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Find a class</div>
          <h1 className="section-heading">Pick the class that fits your family.</h1>
          <p className="lead-text mt-3 max-w-3xl">
            Browse real bookable classes by city, time, price and seats available.
          </p>
        </div>
        <label className="min-w-[240px]">
          <span className="label-k12">City</span>
          <select
            className="input-k12"
            value={effectiveCity}
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

      {classes.isLoading && <p className="lead-text">Loading classes…</p>}

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

      {!classes.isLoading && !classes.isError && (classes.data?.length ?? 0) === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">No open seats</span>
          <p className="lead-text mt-4">
            There are no purchasable classes for this city yet. You can still request a seat and
            we’ll help match a time.
          </p>
          <Link to="/portal/courses" className="btn-pill-secondary mt-6">
            Request a seat
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {(classes.data ?? []).map((item) => (
          <ClassCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ClassCard({ item }: { item: AvailableClass }) {
  return (
    <article className="rounded-2xl border border-hairline bg-canvas-pure p-6 shadow-card-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate2">
            {item.course_pack?.title ?? 'Airbotix class'}
          </div>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-ink">{item.name}</h2>
        </div>
        {item.course_total_aud_cents != null && (
          <div className="rounded-2xl bg-wash-mint px-4 py-2 text-right">
            <div className="text-[20px] font-extrabold text-ink">
              {formatAud(item.course_total_aud_cents)}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">
              whole course
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact label="Starts" value={dateTimeLabel(item.starts_at)} />
        <Fact label="Where" value={venueLabel(item.venue)} />
        <Fact
          label="Seats"
          value={`${item.seats_remaining} of ${item.max_students} available`}
        />
        <Fact
          label="Format"
          value={
            item.session_count && item.session_minutes
              ? `${item.session_count} × ${item.session_minutes} min`
              : item.delivery_mode.replace(/_/g, ' ')
          }
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/portal/checkout/class/${item.id}`} className="btn-pill-primary">
          Pay & lock a seat
        </Link>
        <Link to="/portal/courses" className="btn-pill-secondary">
          Ask first
        </Link>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-ink">{value}</div>
    </div>
  );
}
