// Every sentence an 8–12 year-old reads on `/learn/challenge/:slug/submit`.
//
// Three rules govern everything in this file, in order:
//   1. **Nothing may imply the child failed.** The subject of a failure sentence
//      is the thing ("the video didn't save"), never the child ("you uploaded a
//      bad file"). A rejected entry is something to change, not a verdict.
//   2. **No error codes, no jargon, no backend wording.** The backend's own
//      messages are written for an API consumer (e.g. its refusal names the
//      eligible `ProjectKind`s), so they are translated here rather than
//      shown. An UNRECOGNISED failure still reads as a failure — never as
//      success — because the single most damaging bug on this screen is a child
//      believing they entered when they did not.
//   3. **Every state says what happens next.** A sentence that only reports a
//      state and gives no next step does not belong here.

import { ApiError } from '@/lib/api';
import type { ChallengeSubmissionStatus, PitchUploadReason } from './challengeSubmitApi';

const ERRORS: Record<string, string> = {
  // Payment/registration is a grown-up's job — a child cannot fix it and must
  // not be sent to the Portal, which their login cannot open.
  ENTRY_NOT_CONFIRMED:
    'You are not signed up for this challenge yet. Ask a grown-up to finish signing you up, ' +
    'then come back here.',
  SUBMISSIONS_NOT_OPEN: 'It is not time to send things in yet. Come back when the door opens.',
  SUBMISSIONS_CLOSED:
    'The deadline has passed, so this cannot change any more. What you sent in is safe.',
  PROJECT_NOT_OWNED:
    'We could not find that project. Pick one from your own list and try again.',
  // Names every eligible kind (entrant-onboarding-prd §8.1, D-CCE-1) — a child
  // told to "pick a game" while holding a website they were sold on has been
  // refused twice: once by the server and once by this sentence.
  PROJECT_NOT_PLAYABLE:
    'Pick a project someone can open and use — a Creative Code Studio game, a website you ' +
    'built, a code project or a Story Blocks one.',
  PITCH_ARTIFACT_NOT_OWNED:
    'Your video did not save properly. Choose it again and press send once more.',
  PITCH_ARTIFACT_NOT_VIDEO: 'That file is not a video. Pick your pitch video and try again.',
  ALREADY_SUBMITTED: 'You have already sent this in. Open it below if you want to change it.',
  NOT_FOUND: 'We could not find this challenge. Check the link you used to get here.',
  FORBIDDEN: 'This is not your entry, so it cannot be opened here.',
  INVALID_INPUT: 'Something in the form was not quite right. Check each box and try again.',
};

/**
 * A sentence a child can act on for any failed request. Never returns an empty
 * string, and never returns anything that could read as success.
 *
 * The backend's `message` is deliberately NOT used as a fallback (unlike the
 * parent Portal's mapper): it is written for an adult reading an API, and one
 * unmapped code would put a sentence like "kid_id is required when a parent acts
 * on behalf of a kid" in front of a nine-year-old.
 */
export function kidErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  // `typeof === 'string'`, not truthiness: a server-sent code of `__proto__` or
  // `constructor` would otherwise resolve off Object.prototype and be rendered.
  const mapped = ERRORS[error.code];
  return typeof mapped === 'string' ? mapped : fallback;
}

const UPLOAD_ERRORS: Record<PitchUploadReason, string> = {
  missing:
    'Add your talking video before you send this in — record yourself saying what you made and ' +
    'how it works.',
  not_video: 'That file is not a video. Pick the video where you talk about your project.',
  too_big:
    'That video is too big to send (the most we can take is 50 MB). Ask a grown-up to help you ' +
    'make a smaller one, then pick it again.',
  upload_failed:
    'Your video did not finish uploading, so nothing has been sent in yet. Check you are online ' +
    'and press send again.',
};

export function pitchUploadMessage(reason: PitchUploadReason): string {
  return UPLOAD_ERRORS[reason];
}

/**
 * What the child (and the parent reading over their shoulder) is told about a
 * submission that already exists. `sticker` is a K-12 sticker class; `heading`
 * and `body` always name the next thing that happens, so nobody is left
 * guessing.
 */
export interface SubmissionStatusCopy {
  sticker: string;
  heading: string;
  body: string;
}

const STATUS_COPY: Record<ChallengeSubmissionStatus, SubmissionStatusCopy> = {
  submitted: {
    sticker: 'sticker-mint',
    heading: 'Sent in!',
    body: 'Someone at Airbotix will watch your video and play your project. That takes a few days.',
  },
  in_review: {
    sticker: 'sticker-sky',
    heading: 'Someone is looking at it now',
    body: 'A grown-up at Airbotix is checking your entry. You do not need to do anything.',
  },
  approved: {
    sticker: 'sticker-mint',
    heading: 'All checked — you are in!',
    body: 'Your entry is in the challenge. The judges see it next.',
  },
  // Never "you were rejected". This is a thing to change, and the reason the
  // reviewer wrote is shown next to it so the change is obvious.
  rejected: {
    sticker: 'sticker-sunshine',
    heading: 'One thing needs changing',
    body: 'Have a read of the note below, fix that one thing, and send it again.',
  },
  withdrawn: {
    sticker: 'sticker-coral',
    heading: 'This entry was taken out',
    body: 'Ask a grown-up if you think this is wrong.',
  },
};

export function statusCopy(status: ChallengeSubmissionStatus): SubmissionStatusCopy {
  return STATUS_COPY[status];
}

/** "31 Aug 2026" — short, and the same format the Portal uses. */
export function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
