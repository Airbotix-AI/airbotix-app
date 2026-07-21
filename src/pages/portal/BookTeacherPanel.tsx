import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';

interface Kid {
  id: string;
  nickname: string;
  age: number;
  is_active: boolean;
}

interface TutoringRequest {
  id: string;
  status: 'new' | 'contacted' | 'converted' | 'closed';
  subject_interest: string | null;
  preferred_date: string | null;
  notes: string | null;
  created_at: string;
  already_requested?: boolean;
  kid: { id: string; nickname: string } | null;
}

const bookingSchema = z.object({
  kid_id: z.string().min(1, 'Choose a child.'),
  subject_interest: z.string().trim().min(2, 'Tell us what your child would like help with.').max(120),
  preferred_start: z.string().min(1, 'Choose a preferred date and time.'),
  notes: z.string().trim().max(2000),
});

type BookingValues = z.infer<typeof bookingSchema>;

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateTimeValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function suggestedStart(): string {
  const date = new Date(Date.now() + 2 * DAY_MS);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (date.getMinutes() === 0) date.setHours(date.getHours() + 1);
  return localDateTimeValue(date);
}

const STATUS_COPY: Record<TutoringRequest['status'], { label: string; className: string }> = {
  new: { label: 'Request received', className: 'bg-sky/25 text-ink' },
  contacted: { label: 'Matching teacher', className: 'bg-sunshine/35 text-ink' },
  converted: { label: 'Confirmed', className: 'bg-mint/30 text-ink' },
  closed: { label: 'Closed', className: 'bg-hairline text-ink-soft' },
};

export function BookTeacherPanel({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const requestQueryKey = ['tutoring-requests', familyId] as const;
  const [formOpen, setFormOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kids = useQuery<Kid[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
  });
  const requests = useQuery<TutoringRequest[]>({
    queryKey: requestQueryKey,
    queryFn: () => api<TutoringRequest[]>('/bookings/tutoring-requests'),
  });

  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      kid_id: '',
      subject_interest: '',
      preferred_start: suggestedStart(),
      notes: '',
    },
  });

  const createRequest = useMutation({
    mutationFn: (values: BookingValues) =>
      api<TutoringRequest>('/bookings/tutoring-requests', {
        method: 'POST',
        body: {
          kid_id: values.kid_id,
          subject_interest: values.subject_interest,
          preferred_start: new Date(values.preferred_start).toISOString(),
          notes: values.notes || undefined,
        },
      }),
    onSuccess: (request) => {
      queryClient.setQueryData<TutoringRequest[]>(requestQueryKey, (current = []) => [
        request,
        ...current.filter((item) => item.id !== request.id),
      ]);
      setError(null);
      setSuccess(
        request.already_requested
          ? 'That request is already in our queue — no duplicate was created.'
          : 'Request received. We’ll match a teacher and confirm the exact session by email. No payment has been taken.',
      );
      form.reset({
        kid_id: valuesKidId(request, form.getValues('kid_id')),
        subject_interest: '',
        preferred_start: suggestedStart(),
        notes: '',
      });
      setFormOpen(false);
    },
    onError: (requestError: unknown) => {
      setSuccess(null);
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'We could not send the request. Please try again.',
      );
    },
  });

  const activeKids = (kids.data ?? []).filter((kid) => kid.is_active);
  const minDate = localDateTimeValue(new Date(Date.now() + DAY_MS));
  const maxDate = localDateTimeValue(new Date(Date.now() + 90 * DAY_MS));

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-brand-sky/30 bg-gradient-to-br from-wash-sky to-canvas-pure shadow-card-soft">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <div className="eyebrow eyebrow-sky">1-on-1 support</div>
          <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Book a teacher</h2>
          <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-ink-soft">
            Tell us who needs help, what they want to learn, and a preferred time. We’ll match an
            Airbotix teacher and confirm the session with you.
          </p>
        </div>
        <button
          type="button"
          className="btn-pill-primary shrink-0"
          onClick={() => {
            setFormOpen((open) => !open);
            setError(null);
          }}
        >
          {formOpen ? 'Close form' : 'Book a teacher →'}
        </button>
      </div>

      {success && (
        <div className="mx-6 mb-6 rounded-2xl border border-brand-mint/40 bg-wash-mint px-4 py-3 text-[14px] font-semibold text-ink sm:mx-8">
          {success}
        </div>
      )}

      {formOpen && (
        <div className="border-t border-brand-sky/20 bg-canvas-pure p-6 sm:p-8">
          {kids.isLoading ? (
            <p className="lead-text">Loading your family…</p>
          ) : activeKids.length === 0 ? (
            <div className="rounded-2xl bg-wash-sunshine p-5">
              <p className="text-[15px] font-semibold text-ink">
                Add a child profile before requesting a teacher.
              </p>
              <Link to="/portal/family/new" className="btn-pill-secondary mt-4 inline-block">
                Add a child →
              </Link>
            </div>
          ) : (
            <form
              className="grid max-w-3xl gap-5 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => createRequest.mutate(values))}
            >
              <label className="block">
                <span className="label-k12">Child</span>
                <select className="input-k12" {...form.register('kid_id')}>
                  <option value="">Choose a child</option>
                  {activeKids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.nickname} · age {kid.age}
                    </option>
                  ))}
                </select>
                {form.formState.errors.kid_id && (
                  <span className="field-error">{form.formState.errors.kid_id.message}</span>
                )}
              </label>

              <label className="block">
                <span className="label-k12">Preferred date and time</span>
                <input
                  type="datetime-local"
                  min={minDate}
                  max={maxDate}
                  className="input-k12"
                  {...form.register('preferred_start')}
                />
                {form.formState.errors.preferred_start && (
                  <span className="field-error">{form.formState.errors.preferred_start.message}</span>
                )}
              </label>

              <label className="block md:col-span-2">
                <span className="label-k12">What would your child like help with?</span>
                <input
                  className="input-k12"
                  placeholder="For example: build a first game, Python, AI study skills…"
                  {...form.register('subject_interest')}
                />
                {form.formState.errors.subject_interest && (
                  <span className="field-error">{form.formState.errors.subject_interest.message}</span>
                )}
              </label>

              <label className="block md:col-span-2">
                <span className="label-k12">Anything else we should know? (optional)</span>
                <textarea
                  rows={3}
                  className="input-k12 resize-y"
                  placeholder="Learning goals, current experience, or other times that work"
                  {...form.register('notes')}
                />
              </label>

              {error && (
                <div className="rounded-2xl bg-coral/10 px-4 py-3 text-[14px] font-semibold text-coral md:col-span-2">
                  {error}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={createRequest.isPending}
                  className="btn-pill-primary"
                >
                  {createRequest.isPending ? 'Sending…' : 'Send booking request'}
                </button>
                <p className="mt-3 text-[12px] font-medium text-ink-soft">
                  This is a request, not a confirmed lesson. We’ll confirm the teacher, format,
                  price and exact time before anything is booked.
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {(requests.data?.length ?? 0) > 0 && (
        <div className="border-t border-brand-sky/20 bg-canvas-pure px-6 py-5 sm:px-8">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Your teacher requests
          </h3>
          <div className="mt-3 space-y-3">
            {requests.data?.slice(0, 3).map((request) => {
              const status = STATUS_COPY[request.status];
              return (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-2xl border border-hairline px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-[14px] font-bold text-ink">
                      {request.kid?.nickname ?? 'Your child'} · {request.subject_interest}
                    </div>
                    {request.preferred_date && (
                      <div className="mt-1 text-[13px] font-medium text-ink-soft">
                        Preferred {new Date(request.preferred_date).toLocaleString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-[12px] font-bold ${status.className}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function valuesKidId(request: TutoringRequest, fallback: string): string {
  return request.kid?.id ?? fallback;
}
