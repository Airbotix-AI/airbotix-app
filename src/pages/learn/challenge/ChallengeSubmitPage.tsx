// Creative Code Challenge — the child's own submission screen
// (`/learn/challenge/:slug/submit`; creative-code-challenge-prd.md §5 flow 4,
// §6 "airbotix-app — Learn" row).
//
// This is an 8–14 year-old's screen, so the whole page is built around four
// promises, in order of how much damage breaking one would do:
//
//   1. **A failed upload never looks like a successful entry.** The pitch video
//      is uploaded FIRST and the submission is only created once the bytes are
//      actually in S3. If the upload throws, nothing is registered, nothing is
//      posted, and the screen says so in a sentence a child can act on.
//   2. **Only the child's OWN projects are offered.** The picker is built from
//      `GET /kids/:id/projects` for the kid in the TOKEN. (The backend re-checks
//      ownership of both the project and the pitch artifact — this is the UI
//      half of the same rule, not a substitute for it.)
//   3. **Editing stays possible until the deadline, and stops after it** — with
//      copy explaining the date, never a dead button.
//   4. **The state is always on screen**: sent in / being checked / approved /
//      needs one change, so a child and their parent are never left guessing.
//
// Nothing here is logged: the payload carries a minor's own words, their work
// and the name they would be published under. The kid surface also receives no
// analytics, so there is no event emission anywhere on this page.

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { createCodeProject } from '../code/codeApi';
import type { KidProject } from '../projects/kidProject';
import { PLAYABLE_KINDS } from './challengeEligibility';
import {
  createChallengeSubmission,
  getChallengeSubmissionState,
  PitchUploadError,
  updateChallengeSubmission,
  uploadPitchVideo,
  type ChallengeSubmissionBody,
  type ChallengeSubmissionState,
} from './challengeSubmitApi';
import { dayLabel, kidErrorMessage, pitchUploadMessage, statusCopy } from './challengeSubmitCopy';

const schema = z.object({
  project_id: z.string().min(1, 'Pick the project you want to send in.'),
  project_type: z.enum(['game', 'interactive_web']),
  one_change_note: z
    .string()
    .trim()
    .min(1, 'Write one thing you changed and why.')
    .max(2000, 'That is a bit long — try saying it in fewer words.'),
  display_name: z
    .string()
    .trim()
    .min(1, 'Type the name you want people to see.')
    .max(60, 'That name is a bit too long — try a shorter one.'),
});
type FormValues = z.infer<typeof schema>;

/** Where `now` sits against the locked window the backend gates writes on. */
type Phase = 'before' | 'open' | 'after';

function phaseOf(state: ChallengeSubmissionState): Phase {
  if (state.window_open) return 'open';
  return Date.now() < new Date(state.submission_open).getTime() ? 'before' : 'after';
}

export function ChallengeSubmitPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [pitchFile, setPitchFile] = useState<File | null>(null);
  /**
   * Survives a FAILED submit so a retry does not re-upload a video that is
   * already safely in S3 — re-uploading on every retry is how a child on a slow
   * connection ends up giving up.
   */
  const [uploadedPitchId, setUploadedPitchId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const state = useQuery<ChallengeSubmissionState>({
    queryKey: ['challenge-submission', slug],
    queryFn: () => getChallengeSubmissionState(slug),
    enabled: slug !== '',
    retry: false,
  });

  // The kid id comes from the TOKEN, never from the URL: this endpoint is the
  // one that decides which child's work is on screen.
  const projects = useQuery<KidProject[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<KidProject[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });

  const submission = state.data?.submission ?? null;

  /**
   * SECONDARY path only (§8.2): a blank Code Studio file, for a child who wants
   * to write raw HTML. The advertised "interactive web project" is a Website
   * Studio link (below) — this page no longer creates that project itself.
   */
  const startBlankCode = useMutation({
    mutationFn: () =>
      createCodeProject({
        kidId,
        familyId: null,
        title: 'My Challenge Project',
        template: 'blank',
      }),
    onSuccess: ({ id }) => {
      navigate(
        `/learn/code/${encodeURIComponent(id)}?template=blank&challenge=${encodeURIComponent(slug)}`,
      );
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      project_id: submission?.project_id ?? '',
      project_type: submission?.project_type ?? 'game',
      one_change_note: submission?.one_change_note ?? '',
      display_name: submission?.display_name ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const editionId = state.data!.edition_id;

      // ── 1. the video, BEFORE anything is submitted ──────────────────────
      let pitchArtifactId = uploadedPitchId ?? submission?.pitch_artifact_id ?? null;
      if (pitchFile) {
        pitchArtifactId = await uploadPitchVideo(values.project_id, pitchFile);
        setUploadedPitchId(pitchArtifactId);
        setPitchFile(null);
      }
      if (!pitchArtifactId) throw new PitchUploadError('missing');

      // ── 2. only now does an entry exist ─────────────────────────────────
      const body: ChallengeSubmissionBody = {
        project_id: values.project_id,
        project_type: values.project_type,
        one_change_note: values.one_change_note.trim(),
        display_name: values.display_name.trim(),
        pitch_artifact_id: pitchArtifactId,
      };
      return submission
        ? updateChallengeSubmission(editionId, body)
        : createChallengeSubmission(editionId, body);
    },
    onSuccess: (saved) => {
      setFormError(null);
      setEditing(false);
      setUploadedPitchId(null);
      queryClient.setQueryData<ChallengeSubmissionState>(['challenge-submission', slug], (prev) =>
        prev ? { ...prev, submission: saved } : prev,
      );
    },
    onError: (error: unknown) => {
      setFormError(
        error instanceof PitchUploadError
          ? pitchUploadMessage(error.reason)
          : kidErrorMessage(
              error,
              'That did not send. Nothing was entered yet — press send again in a moment.',
            ),
      );
    },
  });

  if (state.isLoading) {
    return (
      <Shell>
        <p className="lead-text" data-testid="challenge-loading">
          Getting your challenge ready…
        </p>
      </Shell>
    );
  }

  if (state.isError || !state.data) {
    return (
      <Shell>
        <div className="card-base" role="alert" data-testid="challenge-load-error">
          <span className="sticker-coral">Could not open this</span>
          <p className="lead-text mt-4">
            {kidErrorMessage(state.error, 'We could not open this challenge just now.')}
          </p>
          <button
            type="button"
            onClick={() => void state.refetch()}
            className="btn-pill-primary mt-6"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  const data = state.data;
  const phase = phaseOf(data);
  const entered = data.entry_status === 'registration_confirmed';

  // ── Not signed up (yet) — a grown-up's job, not the child's ─────────────
  if (!entered) {
    return (
      <Shell title={data.edition_name}>
        <div className="card-base" data-testid="challenge-not-entered">
          <span className="sticker-sunshine">Not signed up yet</span>
          <h2 className="section-heading mt-4">Ask a grown-up to finish signing you up</h2>
          <p className="lead-text mt-3">
            Once they have, this page is where you send in your project. Nothing you have made
            will be lost.
          </p>
          <Link to="/learn" className="btn-pill-secondary mt-6 inline-block">
            Back home →
          </Link>
        </div>
      </Shell>
    );
  }

  const eligible = (projects.data ?? []).filter((project) =>
    PLAYABLE_KINDS.includes(project.kind),
  );
  const canEdit = phase === 'open';
  const showForm = canEdit && (!submission || editing);

  return (
    <Shell title={data.edition_name}>
      {/* Where we are in the window — always on screen, in dates, never a bare
          disabled control. */}
      <p className="mt-2 text-[14px] font-semibold text-slate2" data-testid="challenge-window">
        {phase === 'before' &&
          `You can send your project in from ${dayLabel(data.submission_open)}.`}
        {phase === 'open' && `You have until ${dayLabel(data.submission_close)} to send it in.`}
        {phase === 'after' &&
          `Sending in closed on ${dayLabel(data.submission_close)}. The judges are looking at the entries now.`}
      </p>

      {submission && <StatusCard submission={submission} />}

      {/* HOW TO START, for as long as there is nothing sent in yet.
          This was gated on `phase === 'before'`, which meant the game button, the
          web button and "Continue one of my projects" ALL disappeared the moment
          the submission window opened — i.e. for the whole competition week, the
          only time most children actually visit. A child who had not started yet
          arrived at a lone "Which project are you sending in?" dropdown with
          nothing in it and no way to make anything, and the web route the landing
          page advertises was unreachable from the challenge page.
          `kid-website-challenge-entry` is the journey that caught it. */}
      {phase !== 'after' && !submission && (
        <div className="card-base mt-6" data-testid="challenge-build-now">
          <span className="sticker-mint">You’re in</span>
          <h2 className="section-heading mt-4">Build your competition entry</h2>
          <p className="lead-text mt-3">
            Choose one competition format and start with your own idea.{' '}
            {phase === 'before'
              ? `Sending the finished entry to the judges unlocks on ${dayLabel(data.submission_open)}.`
              : `You can send it in any time until ${dayLabel(data.submission_close)}.`}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="challenge-project-paths">
            <div className="rounded-2xl border-2 border-ink bg-brand-mint/20 p-5">
              <p className="text-[22px]" aria-hidden="true">
                🎮
              </p>
              <h3 className="mt-2 text-[18px] font-extrabold text-ink">Make a game</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Start from your own game idea, then build, test and improve something another
                person can play.
              </p>
              <Link
                to={`/learn/playground/new?challenge=${encodeURIComponent(slug)}`}
                className="btn-pill-primary mt-5 inline-block"
                data-testid="challenge-start-game"
              >
                Start my game →
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-ink bg-brand-sky/20 p-5">
              <p className="text-[22px]" aria-hidden="true">
                🌐
              </p>
              <h3 className="mt-2 text-[18px] font-extrabold text-ink">
                Make an interactive web project
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate2">
                Build a website in the Website Studio — your own tool, story, simulation or
                anything someone can click around.
              </p>
              {/* PRD §8.2: the advertised web route opens the WEBSITE STUDIO, which
                  has the kind-aware guide and the starters. It creates the project
                  from its own prompt-first flow, so nothing is created here. The
                  `challenge` param is what the studio persists as this project's
                  challenge context. */}
              <Link
                to={`/learn/playground/new?kind=website&challenge=${encodeURIComponent(slug)}`}
                className="btn-pill-primary mt-5 inline-block"
                data-testid="challenge-start-web"
              >
                Start my web project →
              </Link>
              {/* Secondary, deliberately quieter: raw HTML in the Code Studio. */}
              <button
                type="button"
                className="mt-4 block text-[13px] font-semibold text-slate2 underline disabled:opacity-60"
                disabled={startBlankCode.isPending}
                onClick={() => startBlankCode.mutate()}
                data-testid="challenge-start-blank-code"
              >
                {startBlankCode.isPending
                  ? 'Starting…'
                  : 'Or start from a blank HTML file instead'}
              </button>
            </div>
          </div>

          {startBlankCode.isError && (
            <p className="field-error mt-4" role="alert">
              We could not start the project. Try again in a moment.
            </p>
          )}

          <Link
            to="/learn/projects"
            className="btn-pill-secondary mt-5 inline-block"
            data-testid="challenge-my-projects"
          >
            Continue one of my projects →
          </Link>
        </div>
      )}

      {phase === 'after' && !submission && (
        <div className="card-base mt-6" data-testid="challenge-missed">
          <span className="sticker-sunshine">Sending in has closed</span>
          <p className="lead-text mt-4">
            The deadline was {dayLabel(data.submission_close)}, so nothing new can be sent in for
            this challenge. Everything you built is still yours and still in your projects.
          </p>
          <Link to="/learn/projects" className="btn-pill-secondary mt-6 inline-block">
            See my projects →
          </Link>
        </div>
      )}

      {/* The deadline explained, in place of an edit button that would do
          nothing. Only shown when there IS something that used to be editable. */}
      {phase === 'after' && submission && (
        <p className="mt-4 text-[14px] text-slate2" data-testid="challenge-locked">
          You cannot change your entry any more — sending in closed on{' '}
          {dayLabel(data.submission_close)}. What you sent is safe with the judges.
        </p>
      )}

      {canEdit && submission && !editing && (
        <button
          type="button"
          className="btn-pill-secondary mt-6"
          data-testid="challenge-edit"
          onClick={() => {
            setFormError(null);
            setEditing(true);
          }}
        >
          Change my entry →
        </button>
      )}

      {showForm && (
        <form
          className="card-base mt-6 space-y-6"
          data-testid="challenge-form"
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
        >
          <div>
            <h2 className="section-heading">
              {submission ? 'Change what you sent in' : 'Send in your project'}
            </h2>
            <p className="lead-text mt-2">
              Four things, then you are done. You can change any of them until{' '}
              {dayLabel(data.submission_close)}.
            </p>
          </div>

          {/* 1 — the project. Only this child's own, playable projects. */}
          <label className="block">
            <span className="label-k12">1. Which project are you sending in?</span>
            <select className="input-k12 mt-2" data-testid="challenge-project" {...form.register('project_id')}>
              <option value="">Pick one of your projects</option>
              {eligible.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            {form.formState.errors.project_id && (
              <span className="field-error">{form.formState.errors.project_id.message}</span>
            )}
            {projects.isError && (
              <span className="field-error" role="alert" data-testid="projects-error">
                We could not get your projects. Reload the page and they should come back.
              </span>
            )}
            {!projects.isLoading && !projects.isError && eligible.length === 0 && (
              <span className="mt-2 block text-[13px] text-slate2" data-testid="no-projects">
                You do not have a project someone can play yet. Make a game, a website or a code
                project first, then come back.
              </span>
            )}
          </label>

          {/* 2 — what kind of thing it is. */}
          <fieldset>
            <legend className="label-k12">2. What kind of thing is it?</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-3 text-[15px] font-semibold text-ink">
                <input type="radio" value="game" {...form.register('project_type')} />
                A game someone plays
              </label>
              <label className="flex items-center gap-3 text-[15px] font-semibold text-ink">
                <input type="radio" value="interactive_web" {...form.register('project_type')} />
                A web page someone clicks around
              </label>
            </div>
          </fieldset>

          {/* 3 — the pitch video. */}
          <label className="block">
            <span className="label-k12">3. Your talking video</span>
            <span className="mt-1 block text-[13px] text-slate2">
              Record yourself in English for about a minute (60 to 90 seconds) saying what you
              made and how it works.
            </span>
            <input
              type="file"
              accept="video/*"
              className="input-k12 mt-2"
              data-testid="challenge-pitch"
              onChange={(event) => {
                setFormError(null);
                setPitchFile(event.target.files?.[0] ?? null);
              }}
            />
            {!pitchFile && (uploadedPitchId ?? submission?.pitch_artifact_id) && (
              <span className="mt-2 block text-[13px] text-slate2" data-testid="pitch-kept">
                Your video is saved. Only pick a new one if you want to change it.
              </span>
            )}
          </label>

          {/* 4 — the one change. */}
          <label className="block">
            <span className="label-k12">4. One thing you changed</span>
            <span className="mt-1 block text-[13px] text-slate2">
              Someone tried your project and you changed something because of it. What was it?
            </span>
            <textarea
              className="input-k12 mt-2"
              rows={4}
              data-testid="challenge-note"
              {...form.register('one_change_note')}
            />
            {form.formState.errors.one_change_note && (
              <span className="field-error">{form.formState.errors.one_change_note.message}</span>
            )}
          </label>

          <label className="block">
            <span className="label-k12">The name people will see</span>
            <span className="mt-1 block text-[13px] text-slate2">
              Use your first name or a nickname — never your full name, your school or your
              address.
            </span>
            <input
              className="input-k12 mt-2"
              data-testid="challenge-display-name"
              {...form.register('display_name')}
            />
            {form.formState.errors.display_name && (
              <span className="field-error">{form.formState.errors.display_name.message}</span>
            )}
          </label>

          {save.isPending && (
            <p className="text-[14px] font-semibold text-ink" data-testid="challenge-sending">
              {pitchFile ? 'Sending your video…' : 'Sending your entry…'} Hang on, do not close
              this page.
            </p>
          )}

          {/* A failure NEVER shares the screen with a "sent in" message — the
              status card above only renders what the server has confirmed. */}
          {formError && (
            <p
              className="rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[14px] font-semibold text-ink"
              role="alert"
              data-testid="challenge-error"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={save.isPending} className="btn-pill-primary">
              {submission ? 'Save my changes →' : 'Send it in →'}
            </button>
            {submission && (
              <button
                type="button"
                className="btn-pill-secondary"
                onClick={() => {
                  setEditing(false);
                  setFormError(null);
                  setPitchFile(null);
                }}
              >
                Never mind
              </button>
            )}
          </div>
        </form>
      )}
    </Shell>
  );
}

function StatusCard({ submission }: { submission: NonNullable<ChallengeSubmissionState['submission']> }) {
  const copy = statusCopy(submission.status);
  return (
    <div className="card-base mt-6" data-testid={`challenge-status-${submission.status}`}>
      <span className={copy.sticker}>{copy.heading}</span>
      <p className="lead-text mt-4">{copy.body}</p>
      <p className="mt-3 text-[14px] text-slate2">
        You sent in “{submission.display_name}”.
      </p>
      {submission.status === 'rejected' && submission.rejection_reason && (
        <p
          className="mt-4 rounded-2xl bg-wash-sunshine px-4 py-3 text-[14px] font-semibold text-ink"
          data-testid="challenge-rejection-reason"
        >
          What to change: {submission.rejection_reason}
        </p>
      )}
    </div>
  );
}

function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      <Link to="/learn" className="btn-pill-ghost mb-4 -ml-3">
        ← Home
      </Link>
      <div className="mb-2">
        <div className="eyebrow eyebrow-sky">Creative Code Challenge</div>
        <h1 className="hero-display">{title ?? 'Send in your project'}</h1>
      </div>
      {children}
    </div>
  );
}
