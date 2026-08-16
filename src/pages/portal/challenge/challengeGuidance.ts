// What a family actually has to DO once they have entered.
//
// WHY THIS EXISTS: a parent who paid A$19 landed on a confirmation card whose
// only call to action was "View wallet". Nothing told them what their child
// builds, what gets submitted, or what judges look at — and most families are
// doing this for the first time, so "we are entered" and "we know what to do"
// are not the same state.
//
// EVERY ITEM IS COPIED from creative-code-challenge-prd.md §2 / §5 flow 4 and
// the competition terms served by the backend. Do NOT author a new requirement,
// date, or judging rule here: this file tells a parent what is already true, and
// an extra step invented here becomes a promise nobody else is keeping.
//
// Dates are deliberately ABSENT — they come from the edition the API returns, so
// this file cannot drift out of sync with the real submission window.

export interface ChallengeProjectType {
  id: 'game' | 'interactive-web'
  name: string
  body: string
}

/** Exactly two accepted project types — both must run in a browser (PRD §2). */
export const CHALLENGE_PROJECT_TYPES: ChallengeProjectType[] = [
  {
    id: 'game',
    name: 'A Game Project',
    body: 'A game your child designs and builds themselves — something another child can pick up and play.',
  },
  {
    id: 'interactive-web',
    // Where it is built is a FACT a parent needs (entrant-onboarding-prd §8.2):
    // the advertised web route opens the Website Studio, not a blank code file.
    name: 'An Interactive Web Project',
    body: 'Something that responds to whoever is using it — a tool, a toy, a story, a simulation. Your child builds this in the Website Studio, inside Creative Code Studio.',
  },
]

export interface ChallengeSubmissionItem {
  id: string
  title: string
  body: string
}

/** The five things a child submits (PRD §2, §5 flow 4). */
export const CHALLENGE_SUBMISSION_ITEMS: ChallengeSubmissionItem[] = [
  {
    id: 'project',
    title: 'The playable project',
    body: 'The game or interactive web project itself, running in a browser.',
  },
  {
    id: 'pitch',
    title: 'A 60–90 second pitch video',
    body: 'Your child explains their project in English, in their own words. You may help with recording and uploading — not with what they say.',
  },
  {
    id: 'one-change',
    title: 'Evidence of one change they made',
    body: 'One thing they tried, tested and changed. This shows the thinking, not just the finished screen.',
  },
  {
    id: 'creator-card',
    title: 'A creator card',
    body: 'The short profile shown beside the work.',
  },
  {
    id: 'media-choices',
    title: 'Your media choices',
    body: 'Already recorded when you signed the media release. You can change them while registration is open.',
  },
]

export interface ChallengeNextStep {
  id: string
  title: string
  body: string
  /**
   * Something the PARENT can open themselves, where one exists.
   *
   * Most of this journey happens on the kid surface, which a parent cannot
   * reach — they are bounced to `/portal`. So a step that says "your child does
   * X" and offers a link the parent cannot open is worse than no link. Only
   * genuinely parent-openable destinations belong here.
   */
  parentLink?: { to: string; label: string }
}

/**
 * The order a family should do things in, after payment. Deliberately starts
 * with the thing that is available IMMEDIATELY — a first-time parent asking
 * "what now?" needs one obvious next action, not a calendar.
 */
export const CHALLENGE_NEXT_STEPS: ChallengeNextStep[] = [
  {
    id: 'start-building',
    title: 'Your child can start building today',
    body: 'Use “Open [child]’s challenge page” beside their name. Airbotix creates the child session and opens their challenge page in a new tab while this parent page stays open. They choose Game or Interactive Web Project and start immediately; only sending the finished entry waits for the submission window.',
    // "Build in Creative Code Studio" told a parent nothing about WHERE that is
    // or whether they could look at it.
    //
    // The label must NOT say "no login needed": the parent reading it is already
    // signed in, so that reads as nonsense or as an instruction to sign out. The
    // real point is whose account the studio lives in — the child's, which is
    // why a signed-in PARENT still cannot open it (`/learn/*` bounces them to
    // `/portal`). `/try/playground` is the version they can open.
    parentLink: {
      to: '/try/playground',
      label: 'Have a look at Creative Code Studio yourself',
    },
  },
  {
    id: 'starter-lab',
    title: 'Use the Starter Lab session that came with your entry',
    body: 'Your entry includes one Creative Code Studio Starter Lab session and 500 Stars. The Stars are a limited in-app balance, not money, and they are already in your family wallet.',
  },
  {
    id: 'practise-pitch',
    title: 'Practise the pitch early, not the night before',
    body: 'The 60–90 second explanation is scored on how clearly your child explains their own work — never on accent, vocabulary, or the language spoken at home.',
  },
  {
    id: 'submit',
    title: 'Submit inside the window',
    body: 'Your child submits from their own account. Entries cannot be submitted after the window closes, so do not leave it to the final evening.',
  },
]

/**
 * What the judges actually score. Quoted at this altitude so a family knows the
 * work is judged on the child's thinking, and so the English-fairness rule is
 * visible to the people it protects rather than only to judges.
 */
export const CHALLENGE_JUDGING_NOTES: string[] = [
  'Every entry is scored against the same 100-point rubric, by each judge independently.',
  'English is scored only on how clearly your child explains their work — never on accent, vocabulary, or the language spoken at home.',
  'An entry that shows neither your child’s face nor their voice is judged in exactly the same way as one that shows both.',
]
