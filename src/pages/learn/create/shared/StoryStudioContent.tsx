import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { Celebration } from './Celebration';
import { FreeBadge } from './FreeBadge';
import { StudioTip } from './StudioTip';

const COST = 1;

export function StoryStudioContent({
  projectId,
  aiFreeNow = false,
  onCreated,
}: {
  projectId: string;
  /** Workshop-free-AI waiver (D-WFA-01) — show "Free" in place of the star cost. */
  aiFreeNow?: boolean;
  onCreated: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const me = useMe();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: () =>
      api('/llm/text-completion', {
        method: 'POST',
        body: { messages: [{ role: 'user', content: prompt.trim() }], project_id: projectId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
      qc.invalidateQueries({ queryKey: ['kid', kidId, 'artifacts', 'text'] });
      setShowCelebrate(true);
      onCreated();
      setPrompt('');
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError) {
        if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED')
          setError('Out of Stars! Ask a parent to top up.');
        else
          setError(e.message);
      } else {
        setError('Could not reach AI.');
      }
    },
  });

  return (
    <div>
      <Celebration show={showCelebrate} message="Story added to your project!" onDone={() => setShowCelebrate(false)} />

      <StudioTip
        color="mint"
        tipTitle="Good story prompts have a WHO and a WHAT"
        tipBody="Tell the AI who the story is about and what happens. Add details for a richer story."
        examples={[
          { text: 'Write a short story about a dragon who is afraid of fire', hint: 'character + twist' },
          { text: 'A girl discovers a magic library that takes her to different worlds', hint: 'adventure' },
          { text: 'Two robots become best friends in a city of the future', hint: 'friendship' },
          { text: 'A tiny ant who wants to climb the tallest mountain', hint: 'underdog' },
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-4">
        <label className="block">
          <span className="label-k12">What should the story be about?</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Write a short story about a dragon who is afraid of fire"
            className="input-k12"
            autoFocus
          />
        </label>

        {error && (
          <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending || !prompt.trim()}
          className="btn-pill-primary w-full mt-6"
        >
          {generate.isPending ? (
            '📖 Writing…'
          ) : aiFreeNow ? (
            <span className="inline-flex items-center gap-1.5">📖 Write it <FreeBadge /></span>
          ) : (
            `📖 Write it — ${COST}★`
          )}
        </button>
      </div>
    </div>
  );
}
