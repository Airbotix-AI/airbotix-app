import type { LearningContext } from '../code/codeApi'

/**
 * Resume recap (playground-ai-prompt-prd.md MP5 / D-PAP-19,22). When a kid reopens
 * a game the teacher has been coaching, show a warm "here's your game + where we
 * left off" card built from the persisted `learning_context` — so they pick up with
 * context, not a blank chat. Dismissible: "Keep building" continues; the kid can
 * also just start typing (the card is non-blocking).
 */
export interface ResumeRecapProps {
  context: LearningContext
  onContinue: () => void
}

export function ResumeRecap({ context, onContinue }: ResumeRecapProps) {
  return (
    <div
      role="status"
      data-testid="resume-recap"
      className="rounded-2xl border-2 border-pg-border bg-pg-surface p-4 text-pg-text shadow-sm"
    >
      <p className="text-[13px] font-extrabold">👋 Welcome back!</p>
      <p className="mt-1 text-[13px] text-pg-text-dim">{context.summary}</p>
      {context.concepts && context.concepts.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-pg-text-muted">You’ve learned:</span>
          {context.concepts.map((c) => (
            <span
              key={c}
              className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {context.next && (
        <p className="mt-2 text-[13px] text-pg-text-dim">
          Next we were going to: <strong className="text-pg-text">{context.next}</strong>
        </p>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-grad-sky px-4 py-2 text-[13px] font-extrabold text-white shadow-brand-sky transition-transform hover:-translate-y-0.5"
      >
        Keep building →
      </button>
    </div>
  )
}
